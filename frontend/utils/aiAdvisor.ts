import { db, getBudget, getSetting, saveSetting } from "../db/database";
import { CATEGORIES } from "../constants/categories";
import api from "./api";

// ─── Types ───────────────────────────────────────────────────────
export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  budgetSpent: number;
  netBalance: number;

  budgetLimit: number;
  budgetUsedPercent: number;
  topExpenses: { title: string; amount: number; category?: string }[];
  categoryBreakdown: { [key: string]: number };
  transactionCount: number;
  avgExpense: number;
  lastMonthExpenses: number;
  lastMonthIncome: number;
  spendingTrend: "up" | "down" | "same" | "no_data";
  monthLabel: string;
  allTransactions: { title: string; amount: number; type: string; category?: string; created_at: string }[];
}

export interface Insight {
  id: string;
  icon: string;
  title: string;
  message: string;
  type: "danger" | "warning" | "success" | "tip" | "info";
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "advisor";
  timestamp: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────
const getMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

const getMonthLabel = (date: Date) =>
  date.toLocaleString("default", { month: "long", year: "numeric" });

// ─── Core: Financial Summary ─────────────────────────────────────
export async function getFinancialSummary(token?: string | null): Promise<FinancialSummary> {
  const now = new Date();
  const monthKey = getMonthKey(now);
  const monthLabel = getMonthLabel(now);

  let rows: any[] = [];
  
  if (token) {
    try {
      const response = await api.get(`/transactions`, { params: { month: (now.getMonth() + 1).toString().padStart(2, "0") } });
      const year = now.getFullYear();
      const monthStr = `${year}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
      rows = response.data.data.filter((e: any) => e.created_at && e.created_at.startsWith(monthStr));
    } catch (e) {
      console.warn("Advisor API fetch failed, falling back to local DB");
      rows = await db.getAllAsync<any>(
        "SELECT title, amount, type, category, created_at FROM transactions WHERE created_at LIKE ? ORDER BY amount DESC;",
        [`${monthKey}%`]
      );
    }
  } else {
    rows = await db.getAllAsync<any>(
      "SELECT title, amount, type, category, created_at FROM transactions WHERE created_at LIKE ? ORDER BY amount DESC;",
      [`${monthKey}%`]
    );
  }


  let totalIncome = 0;
  let totalExpenses = 0;
  let budgetSpent = 0;
  const categoryBreakdown: { [key: string]: number } = {};
  const expenseItems: { title: string; amount: number; category: string }[] = [];

  rows.forEach((row) => {
    const amount = parseFloat(row.amount) || 0;
    if (row.type === "income") {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
      
      // Use use_limit (SQLite) or useLimit (API)
      const shouldCountInBudget = row.useLimit !== false && row.use_limit !== 0;
      if (shouldCountInBudget) {
        budgetSpent += amount;
      }

      expenseItems.push({ title: row.title, amount: amount, category: row.category });
      
      const cat = row.category || "others";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amount;
    }
  });



  // Last month data
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthKey = getMonthKey(lastMonth);

  const lastMonthRows = await db.getAllAsync<{
    amount: number;
    type: string;
  }>(
    "SELECT amount, type FROM transactions WHERE created_at LIKE ?;",
    [`${lastMonthKey}%`]
  );

  let lastMonthExpenses = 0;
  let lastMonthIncome = 0;
  lastMonthRows.forEach((row) => {
    if (row.type === "income") lastMonthIncome += row.amount;
    else lastMonthExpenses += row.amount;
  });

  // Budget
  let budgetLimit = 0;
  if (token) {
    try {
      const budgetRes = await api.get(`/budgets?month=${monthKey}`);
      if (budgetRes.data.data.length > 0) {
        budgetLimit = budgetRes.data.data[0].amount;
      }
    } catch (e) {
      budgetLimit = await getBudget(monthKey);
    }
  } else {
    budgetLimit = await getBudget(monthKey);
  }

  const budgetUsedPercent =
    budgetLimit > 0 ? (budgetSpent / budgetLimit) * 100 : 0;


  // Spending trend
  let spendingTrend: "up" | "down" | "same" | "no_data" = "no_data";
  if (lastMonthExpenses > 0 && totalExpenses > 0) {
    const diff =
      ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
    if (diff > 5) spendingTrend = "up";
    else if (diff < -5) spendingTrend = "down";
    else spendingTrend = "same";
  }

  const expenseOnlyRows = rows.filter((r) => r.type === "expense");

  return {
    totalIncome,
    totalExpenses,
    budgetSpent,
    netBalance: totalIncome - totalExpenses,

    budgetLimit,
    budgetUsedPercent,
    topExpenses: expenseItems.slice(0, 5),
    categoryBreakdown,
    transactionCount: rows.length,
    avgExpense:
      expenseOnlyRows.length > 0
        ? totalExpenses / expenseOnlyRows.length
        : 0,
    lastMonthExpenses,
    lastMonthIncome,
    spendingTrend,
    monthLabel,
    allTransactions: rows,
  };
}

// ─── Core: Generate Insights ─────────────────────────────────────
export async function generateInsights(token?: string | null): Promise<Insight[]> {
  const summary = await getFinancialSummary(token);
  const insights: Insight[] = [];

  if (summary.transactionCount === 0) {
    insights.push({
      id: "no_data",
      icon: "📝",
      title: "Get Started!",
      message:
        "Start adding your income and expenses to receive personalized financial advice.",
      type: "info",
    });
    return insights;
  }

  // --- PLAN A: EXPENSE SUGGESTIONS ---
  
  // 1. Unusual transaction detection (5x daily average)
  const expenseOnlyRows = summary.allTransactions.filter(r => r.type === "expense");
  if (expenseOnlyRows.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const todaysExpenses = expenseOnlyRows.filter(r => r.created_at.startsWith(today));
    if (todaysExpenses.length > 0) {
      const largestToday = Math.max(...todaysExpenses.map(r => r.amount));
      if (largestToday > summary.avgExpense * 5 && summary.avgExpense > 0) {
        insights.push({
          id: "unusual_expense",
          icon: "❗",
          title: "Unusual Expense Today",
          message: `₹${largestToday.toFixed(0)} is 5x your daily average. Was this a planned major expense?`,
          type: "warning"
        });
      }
    }
  }

  // 2. Budget adherence logic (Refined)
  if (summary.budgetLimit > 0) {
     if (summary.budgetUsedPercent >= 100) {
        insights.push({
          id: "budget_exceeded",
          icon: "🚨",
          title: "Budget Exceeded!",
          message: `You've used ${summary.budgetSpent.toFixed(0)} which is over your ₹${summary.budgetLimit.toFixed(0)} limit. Stop non-essential spending!`,
          type: "danger",
        });
     } else if (summary.budgetUsedPercent >= 85) {
        const remainingDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
        const dailyAllowance = (summary.budgetLimit - summary.budgetSpent) / (remainingDays || 1);
        insights.push({
          id: "budget_tight",
          icon: "⚠️",
          title: "Budget Running Low",
          message: `You've used ${summary.budgetUsedPercent.toFixed(0)}% of budget. Limit daily spending to ₹${dailyAllowance.toFixed(0)} for ${remainingDays} days.`,
          type: "warning",
        });
     }
  }


  // 3. Category Overspending (Example: 60% higher than average - simulated for now)
  const foodSpending = summary.categoryBreakdown['food'] || 0;
  if (foodSpending > summary.totalExpenses * 0.4 && summary.totalExpenses > 5000) {
     insights.push({
       id: "food_overspend",
       icon: "🍔",
       title: "High Food Spending",
       message: `Food accounts for ${((foodSpending/summary.totalExpenses)*100).toFixed(0)}% of your expenses. Try meal prepping to save ~₹2,000.`,
       type: "tip"
     });
  }

  // --- PLAN B: INVESTMENT & SAVINGS SUGGESTIONS ---

  // 1. Surplus savings (> 20% of income)
  if (summary.totalIncome > 0) {
    const savingsRate = ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100;
    if (savingsRate >= 20) {
      insights.push({
        id: "surplus_savings",
        icon: "💰",
        title: "Strong Savings Rate!",
        message: `You saved ${savingsRate.toFixed(0)}% of income! Consider investing ₹${(summary.netBalance * 0.5).toFixed(0)} in a SIP or FD.`,
        type: "success",
      });
    } else if (savingsRate < 5 && summary.totalIncome > 0) {
       insights.push({
         id: "low_savings",
         icon: "📉",
         title: "Low Savings Alert",
         message: "Your savings rate is below 5%. Aim to allocate 20% to savings (₹" + (summary.totalIncome * 0.2).toFixed(0) + ") for goal safety.",
         type: "warning"
       });
    }
  }

  // 2. Emergency Fund Check (3 months of expenses)
  const estimatedEmergencyFund = summary.totalExpenses * 3;
  if (summary.netBalance > 5000) {
     insights.push({
       id: "emergency_fund_tip",
       icon: "🛡️",
       title: "Emergency Fund Goal",
       message: `Aim for ₹${estimatedEmergencyFund.toFixed(0)} (3 months' buffer). You're already on your way!`,
       type: "tip"
     });
  }

  // 3. Idle Money Check
  if (summary.netBalance > 50000) {
     insights.push({
       id: "idle_money",
       icon: "📈",
       title: "Idle Money Tip",
       message: "You have a high surplus. Parking ₹30,000 in a liquid fund could earn ~6% annually vs a savings account.",
       type: "success"
     });
  }

  // --- PLAN C: SMART TIPS ---

  // 1. 50-30-20 Rule
  insights.push({
    id: "rule_50_30_20",
    icon: "⚖️",
    title: "The 50-30-20 Rule",
    message: "Allocate 50% to needs, 30% to wants, and 20% to savings for a balanced financial life.",
    type: "info"
  });

  // 2. No income detected
  if (summary.totalIncome === 0 && summary.totalExpenses > 0) {
     insights.push({
       id: "no_income",
       icon: "💸",
       title: "No Income Logged",
       message: "You haven't added any income yet. Don't forget to add your salary or payouts to see net balance!",
       type: "info"
     });
  }

  // 3. Spending Trends
  if (summary.spendingTrend === "down") {
    insights.push({
      id: "spending_down",
      icon: "📉",
      title: "Great Trend!",
      message: `Spending is lower than last month. You're doing a great job managing your lifestyle!`,
      type: "success",
    });
  }

  return insights;
}


// ─── Core: Unified Local AI Advisor ──────────────────────────────
export async function handleQuery(
  question: string,
  chatHistory: ChatMessage[] = [],
  token?: string | null
): Promise<string> {
  // Get financial context
  const summary = await getFinancialSummary(token);

  // Use the high-intelligence local engine exclusively
  return handleLiteQuery(question, summary);
}

// ─── Core: AI Logic Engine ───────────────────────────────────────
async function handleLiteQuery(q: string, s: FinancialSummary): Promise<string> {
  const query = q.toLowerCase();

  // 1. Greetings & Meta
  if (query.match(/\b(hi|hello|hey|hola|whatsapp|sup)\b/)) {
    const greetings = [
      `👋 Hello! I'm your **Lite AI Advisor**. I've analyzed your **₹${s.totalExpenses.toFixed(0)}** spending for ${s.monthLabel}. How can I help you today?`,
      `👋 Hi there! Glad to chat. Looking at your ${s.monthLabel} data, you have **${s.transactionCount}** transactions so far. Want a summary or some saving tips?`,
      `👋 Hey! Your current balance is **₹${s.netBalance.toFixed(0)}**. I'm ready to help you manage your money better. What's on your mind?`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)] + "\n\n*(Note: For advanced conversational AI, set your Gemini API key in Settings)*";
  }

  if (query.match(/\b(how are you|hows it going|doing)\b/)) {
    return `😊 I'm doing great, thanks for asking! I'm busy crunching the numbers for your ${s.monthLabel} budget. Currently, you've used **${s.budgetUsedPercent.toFixed(0)}%** of your limit. Is there something specific you'd like to check?`;
  }

  // 2. Specific Data Points
  if (query.includes("spent") || query.includes("spending") || query.includes("expense")) {
    const trendText = s.spendingTrend === "up" ? "📈 higher than last month" : s.spendingTrend === "down" ? "📉 lower than last month" : "consistent";
    return `💸 You've spent a total of **₹${s.totalExpenses.toFixed(0)}** in ${s.monthLabel}. This is ${trendText}. Your average expense is about **₹${s.avgExpense.toFixed(0)}** per transaction.\n\nYour biggest hit was **"${s.topExpenses[0]?.title || 'None'}"** at ₹${s.topExpenses[0]?.amount.toFixed(0) || 0}.`;
  }

  if (query.includes("income") || query.includes("earned") || query.includes("salary")) {
    return `💰 Your total income for ${s.monthLabel} is **₹${s.totalIncome.toFixed(0)}**. This leaves you with a net balance of **₹${s.netBalance.toFixed(0)}**. ${s.netBalance > 0 ? "You're in the green! Nice work. ✅" : "You're spending more than you earn — let's look at where we can cut back. 🚨"}`;
  }

  if (query.includes("balance") || query.includes("left") || query.includes("status")) {
    return `📊 **Financial Status for ${s.monthLabel}:**\n\n• **Income:** ₹${s.totalIncome.toFixed(0)}\n• **Expenses:** ₹${s.totalExpenses.toFixed(0)}\n• **Net Balance:** ₹${s.netBalance.toFixed(0)}\n• **Budget Used:** ${s.budgetUsedPercent.toFixed(0)}%\n\n${s.netBalance < 0 ? "⚠️ You are currently in a deficit. Try checking your 'Top Expenses' to see where the money is going." : "✅ You have a healthy surplus! Consider moving some to savings."}`;
  }

  if (query.includes("budget")) {
    if (s.budgetLimit <= 0) return "🎯 You haven't set a budget for this month yet. Go to **Settings** to set one so I can help you track your limits!";
    const remaining = s.budgetLimit - s.totalExpenses;
    return `🎯 Your budget for ${s.monthLabel} is **₹${s.budgetLimit.toFixed(0)}**. You've used **${s.budgetUsedPercent.toFixed(0)}%** so far. You have **₹${remaining.toFixed(0)}** remaining for the rest of the month. ${s.budgetUsedPercent > 90 ? "Be careful, you're almost at the limit! ⚠️" : "You're doing well! 👍"}`;
  }

  // 3. Search for specific categories/items
  const matchedTransactions = s.allTransactions.filter(t => 
    query.includes(t.title.toLowerCase()) || 
    q.toLowerCase().includes(t.title.toLowerCase()) ||
    (t.category && query.includes(t.category.toLowerCase()))
  );
  
  if (query.includes("category") || query.includes("breakdown") || query.includes("where my money goes")) {
    const sortedCats = Object.entries(s.categoryBreakdown).sort((a,b) => b[1] - a[1]);
    if (sortedCats.length === 0) return "You haven't added any expenses with categories yet! Start adding them so I can show you your spending breakdown.";
    
    let resp = "📊 **Category Breakdown:**\n\n";
    sortedCats.forEach(([catId, amount]) => {
        const cat = CATEGORIES.find(c => c.id === catId);
        resp += `• **${cat?.name || catId}**: ₹${amount.toFixed(0)} (${((amount/s.totalExpenses)*100).toFixed(0)}%)\n`;
    });
    return resp + `\n💡 Your biggest spending is on **${CATEGORIES.find(c => c.id === sortedCats[0][0])?.name || sortedCats[0][0]}**. Try searching for tips on how to save in this category!`;
  }

  if (matchedTransactions.length > 0) {
    const total = matchedTransactions.reduce((acc, t) => acc + t.amount, 0);
    return `🔍 I found **${matchedTransactions.length}** transactions matching your search:\n\n${matchedTransactions.map(t => `• ${t.title}: ₹${t.amount}`).join('\n')}\n\n**Total:** ₹${total.toFixed(0)}\n\n💡 ${getAdviceByKeyword(q, total)}`;
  }

  // 4. Default Advice / General Help
  const advice = [
    `💡 **Saving Tip:** Your biggest expense is **${s.topExpenses[0]?.title}** (₹${s.topExpenses[0]?.amount}). Reducing this by just 10% would save you **₹${(s.topExpenses[0]?.amount * 0.1).toFixed(0)}** this month!`,
    `💡 **Observation:** You've made **${s.transactionCount}** transactions. Try to bundle your shopping trips to avoid impulse buys.`,
    `💡 **Planning:** If you save your current surplus of **₹${s.netBalance > 0 ? s.netBalance : 0}** every month, you'll have **₹${((s.netBalance > 0 ? s.netBalance : 0) * 12).toFixed(0)}** by next year!`,
  ];

  return `I've analyzed your data! Here's a thought:\n\n${advice[Math.floor(Math.random() * advice.length)]}\n\nAsk me specifically about your **"spending"**, **"income"**, **"budget"**, or search for a specific item like **"food"**!`;
}

function getAdviceByKeyword(q: string, amount: number): string {
  const query = q.toLowerCase();
  if (query.includes("food") || query.includes("eat") || query.includes("restaurant") || query.includes("grocery")) {
    return "Try meal prepping or bulk-buying staples. Food is often the easiest place to save ₹500–₹1000/week!";
  }
  if (query.includes("rent") || query.includes("house") || query.includes("bill")) {
    return "These are fixed costs. Focus on your variable spending (like shopping or dining) to make a bigger impact.";
  }
  if (query.includes("fuel") || query.includes("petrol") || query.includes("uber") || query.includes("cab") || query.includes("travel")) {
    return "Consider carpooling or using public transport once a week to cut your travel costs down!";
  }
  if (query.includes("shop") || query.includes("amazon") || query.includes("fashion")) {
    return "Try the 24-hour rule: wait a full day before clicking 'buy'. Most impulse urges fade by then!";
  }
  return "Every small saving adds up to big financial freedom. Keep tracking!";
}

// ─── Quick Actions ───────────────────────────────────────────────
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  query: string;
}

export function getQuickActions(): QuickAction[] {
  return [
    {
      id: "summary",
      label: "Summary",
      icon: "📋",
      query: "Give me a quick financial summary",
    },
    {
      id: "advice",
      label: "Advice",
      icon: "💡",
      query: "Analyze my spending and give me advice to save money",
    },
    {
      id: "top",
      label: "Top Expenses",
      icon: "🏆",
      query: "What are my biggest expenses and how can I reduce them?",
    },
    {
      id: "compare",
      label: "vs Last Month",
      icon: "📈",
      query: "How does my spending compare to last month?",
    },
    {
      id: "budget",
      label: "Budget",
      icon: "🎯",
      query: "How am I doing with my budget?",
    },
    {
      id: "plan",
      label: "Savings Plan",
      icon: "🏦",
      query: "Create a personalized savings plan for me based on my data",
    },
  ];
}
