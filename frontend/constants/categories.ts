export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: "food", name: "Food & Drinks", icon: "fast-food", color: "#f87171" },
  { id: "transport", name: "Transport", icon: "car", color: "#60a5fa" },
  { id: "shopping", name: "Shopping", icon: "cart", color: "#f472b6" },
  { id: "entertainment", name: "Entertainment", icon: "game-controller", color: "#a78bfa" },
  { id: "health", name: "Health", icon: "medical", color: "#4ade80" },
  { id: "bills", name: "Bills & Utilities", icon: "receipt", color: "#fbbf24" },
  { id: "education", name: "Education", icon: "book", color: "#818cf8" },
  { id: "personal", name: "Personal Care", icon: "brush", color: "#fb7185" },
  { id: "others", name: "Others", icon: "grid", color: "#94a3b8" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "salary", name: "Salary", icon: "cash", color: "#10b981" },
  { id: "freelance", name: "Freelance", icon: "laptop", color: "#3b82f6" },
  { id: "gift", name: "Gift", icon: "gift", color: "#ec4899" },
  { id: "investment", name: "Investment", icon: "trending-up", color: "#f59e0b" },
  { id: "others", name: "Others", icon: "add-circle", color: "#6b7280" },
];

export const PAYMENT_MODES = [
  { id: "cash", name: "Cash", icon: "cash-outline" },
  { id: "upi", name: "UPI", icon: "phone-portrait-outline" },
  { id: "credit_card", name: "Credit Card", icon: "card-outline" },
  { id: "debit_card", name: "Debit Card", icon: "card-outline" },
  { id: "bank_transfer", name: "Bank Transfer", icon: "business-outline" },
];
