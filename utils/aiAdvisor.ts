import { db, getBudget, getSetting, saveSetting } from "../db/database";

// ─── Types ───────────────────────────────────────────────────────
export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  budgetLimit: number;
  budgetUsedPercent: number;
  topExpenses: { title: string; amount: number }[];
  transactionCount: number;
  avgExpense: number;
  lastMonthExpenses: number;
  lastMonthIncome: number;
  spendingTrend: "up" | "down" | "same" | "no_data";
  monthLabel: string;
  allTransactions: { title: string; amount: number; type: string; created_at: string }[];
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
export async function getFinancialSummary(): Promise<FinancialSummary> {
  const now = new Date();
  const monthKey = getMonthKey(now);
  const monthLabel = getMonthLabel(now);

  // Current month transactions
  const rows = await db.getAllAsync<{
    title: string;
    amount: number;
    type: string;
    created_at: string;
  }>(
    "SELECT title, amount, type, created_at FROM expenses WHERE created_at LIKE ? ORDER BY amount DESC;",
    [`${monthKey}%`]
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  const expenseItems: { title: string; amount: number }[] = [];

  rows.forEach((row) => {
    if (row.type === "income") {
      totalIncome += row.amount;
    } else {
      totalExpenses += row.amount;
      expenseItems.push({ title: row.title, amount: row.amount });
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
    "SELECT amount, type FROM expenses WHERE created_at LIKE ?;",
    [`${lastMonthKey}%`]
  );

  let lastMonthExpenses = 0;
  let lastMonthIncome = 0;
  lastMonthRows.forEach((row) => {
    if (row.type === "income") lastMonthIncome += row.amount;
    else lastMonthExpenses += row.amount;
  });

  // Budget
  const budgetLimit = await getBudget(monthKey);
  const budgetUsedPercent =
    budgetLimit > 0 ? (totalExpenses / budgetLimit) * 100 : 0;

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
    netBalance: totalIncome - totalExpenses,
    budgetLimit,
    budgetUsedPercent,
    topExpenses: expenseItems.slice(0, 5),
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
export async function generateInsights(): Promise<Insight[]> {
  const summary = await getFinancialSummary();
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

  if (summary.budgetLimit > 0 && summary.budgetUsedPercent >= 100) {
    const overAmount = summary.totalExpenses - summary.budgetLimit;
    insights.push({
      id: "budget_exceeded",
      icon: "🚨",
      title: "Budget Exceeded!",
      message: `You've exceeded your budget by ₹${overAmount.toFixed(0)}. Consider cutting back on non-essential spending.`,
      type: "danger",
    });
  }

  if (
    summary.budgetLimit > 0 &&
    summary.budgetUsedPercent >= 80 &&
    summary.budgetUsedPercent < 100
  ) {
    const remaining = summary.budgetLimit - summary.totalExpenses;
    insights.push({
      id: "budget_warning",
      icon: "⚠️",
      title: "Budget Alert",
      message: `You've used ${summary.budgetUsedPercent.toFixed(0)}% of your budget. Only ₹${remaining.toFixed(0)} remaining.`,
      type: "warning",
    });
  }

  if (summary.spendingTrend === "up") {
    const increase =
      ((summary.totalExpenses - summary.lastMonthExpenses) /
        summary.lastMonthExpenses) *
      100;
    insights.push({
      id: "spending_up",
      icon: "📈",
      title: "Spending Increased",
      message: `Spending is up ${increase.toFixed(0)}% vs last month (₹${summary.lastMonthExpenses.toFixed(0)} → ₹${summary.totalExpenses.toFixed(0)}).`,
      type: "warning",
    });
  }

  if (summary.spendingTrend === "down") {
    const decrease =
      ((summary.lastMonthExpenses - summary.totalExpenses) /
        summary.lastMonthExpenses) *
      100;
    insights.push({
      id: "spending_down",
      icon: "📉",
      title: "Great Job Saving!",
      message: `Spending decreased by ${decrease.toFixed(0)}% vs last month. Keep it up!`,
      type: "success",
    });
  }

  if (summary.netBalance > 0) {
    insights.push({
      id: "positive_balance",
      icon: "✅",
      title: "Positive Cash Flow",
      message: `Surplus of ₹${summary.netBalance.toFixed(0)} this month. Consider saving or investing.`,
      type: "success",
    });
  }

  if (summary.netBalance < 0) {
    insights.push({
      id: "negative_balance",
      icon: "🔴",
      title: "Negative Cash Flow",
      message: `Spending ₹${Math.abs(summary.netBalance).toFixed(0)} more than you earn. Review your top expenses.`,
      type: "danger",
    });
  }

  if (summary.topExpenses.length > 0) {
    const top = summary.topExpenses[0];
    insights.push({
      id: "top_expense",
      icon: "💡",
      title: "Biggest Expense",
      message: `"${top.title}" at ₹${top.amount.toFixed(0)}. Can you reduce this?`,
      type: "tip",
    });
  }

  if (summary.budgetLimit <= 0 && summary.totalExpenses > 0) {
    insights.push({
      id: "no_budget",
      icon: "🎯",
      title: "Set a Budget",
      message: `No budget set for ${summary.monthLabel}. Go to Settings to set one.`,
      type: "info",
    });
  }

  return insights;
}

// ─── Core: Unified Local AI Advisor ──────────────────────────────
export async function handleQuery(
  question: string,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  // Get financial context
  const summary = await getFinancialSummary();

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

  // 3. Search for specific categories
  const matchedTransactions = s.allTransactions.filter(t => query.includes(t.title.toLowerCase()) || q.toLowerCase().includes(t.title.toLowerCase()));
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
