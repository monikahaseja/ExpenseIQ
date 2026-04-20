import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import { db, getBudget } from "../db/database";
import { useNotification } from "../components/NotificationContext";
import { now } from "../utils/date";
import { CATEGORIES, INCOME_CATEGORIES, PAYMENT_MODES } from "../constants/categories";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { API_URL } from "../constants/api";

export default function AddExpenseScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showNotification } = useNotification();
  const { user } = useAuth();

  const expenseId = params.id as string | null;

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("others");
  const [customCategory, setCustomCategory] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [tags, setTags] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [useLimit, setUseLimit] = useState(true);
  const [titleError, setTitleError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      setTitle(params.title as string);
      setAmount(params.amount as string);
      const typeStr = (params.type as "income" | "expense") || "expense";
      const initialCat = params.category as string;
      setType(typeStr);
      
      const matchedCat = (typeStr === "expense" ? CATEGORIES : INCOME_CATEGORIES).find(c => c.id === initialCat);
      
      if (!matchedCat && initialCat && initialCat.startsWith("Others - ")) {
        setCategory("others");
        setCustomCategory(initialCat.replace("Others - ", ""));
      } else if (!matchedCat && initialCat && initialCat !== "others") {
        setCategory("others");
        setCustomCategory(initialCat);
      } else {
        setCategory(initialCat || "others");
      }
      
      setPaymentMode((params.payment_mode as string) || "cash");
      setTags((params.tags as string) || "");
      setIsRecurring(params.is_recurring === "1");
      setUseLimit(params.use_limit !== "0"); // default true if undefined
    }
  }, [params.id]);

  const checkBudgetLimit = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const monthKey = `${year}-${month}`;

      const budgetLimit = await getBudget(monthKey);
      if (budgetLimit <= 0) return;

      const rows = await db.getAllAsync<{ amount: number; type: string; use_limit: number }>(
        "SELECT amount, type, use_limit FROM transactions WHERE created_at LIKE ?;",
        [`${monthKey}%`],
      );

      let totalSpent = 0;
      rows.forEach((item) => {
        if (item.type === "expense" && item.use_limit !== 0) totalSpent += item.amount;
      });

      const percent = (totalSpent / budgetLimit) * 100;
      if (percent >= 100) {
        setTimeout(() => {
          showNotification("🚨 Budget limit exceeded!", "error", 4000);
        }, 1500);
      } else if (percent >= 80) {
        setTimeout(() => {
          showNotification(`⚠️ You've used ${percent.toFixed(0)}% of your budget`, "warning", 4000);
        }, 1500);
      }
    } catch (e) {
      // silently fail budget check
    }
  };

  const suggestCategory = (text: string) => {
    if (category !== "others") return; 
    const t = text.toLowerCase();
    if (t.includes("food") || t.includes("eat") || t.includes("restaurant") || t.includes("grocery") || t.includes("dinner") || t.includes("lunch")) setCategory("food");
    else if (t.includes("uber") || t.includes("ola") || t.includes("petrol") || t.includes("fuel") || t.includes("bus") || t.includes("train") || t.includes("travel")) setCategory("transport");
    else if (t.includes("amazon") || t.includes("flipkart") || t.includes("shop") || t.includes("cloth") || t.includes("mall")) setCategory("shopping");
    else if (t.includes("movie") || t.includes("netflix") || t.includes("game") || t.includes("party")) setCategory("entertainment");
    else if (t.includes("doctor") || t.includes("med") || t.includes("hospital") || t.includes("health")) setCategory("health");
    else if (t.includes("rent") || t.includes("bill") || t.includes("electricity") || t.includes("water") || t.includes("wifi") || t.includes("recharge")) setCategory("bills");
    else if (t.includes("school") || t.includes("college") || t.includes("course") || t.includes("book")) setCategory("education");
    else if (t.includes("salary") || t.includes("paycheck") || t.includes("income")) setCategory("salary");
  };

  const saveExpense = async () => {
    let hasError = false;
    if (!title.trim()) {
      setTitleError("Please enter a description");
      hasError = true;
    }
    if (!amount.trim()) {
      setAmountError("Please enter an amount");
      hasError = true;
    } else if (isNaN(parseFloat(amount))) {
      setAmountError("Please enter a valid number");
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const finalCategory = (category === "others" && customCategory.trim()) 
        ? `Others - ${customCategory.trim()}` 
        : category;

      const expenseData = {
        title,
        amount: parseFloat(amount),
        type,
        category: finalCategory,
        payment_mode: paymentMode,
        tags,
        is_recurring: isRecurring,
        useLimit: useLimit,
      };

      // 1. Save to Backend (Primary)
      if (user) {
        if (expenseId) {
          await api.put(`/transactions/${expenseId}`, expenseData);
        } else {
          await api.post(`/transactions`, expenseData);
        }
      }

      // 2. Save to Local DB (Parallel for Offline Support/Speed) 
      try {
        if (expenseId && !isNaN(Number(expenseId))) {
          await db.runAsync(
            "UPDATE transactions SET title=?, amount=?, type=?, category=?, payment_mode=?, tags=?, is_recurring=?, use_limit=?, updated_at=? WHERE id=?;",
            [title, parseFloat(amount), type, finalCategory, paymentMode, tags, isRecurring ? 1 : 0, useLimit ? 1 : 0, now(), Number(expenseId)],
          );
        } else if (!expenseId) {
          await db.runAsync(
            "INSERT INTO transactions (title, amount, type, category, payment_mode, tags, is_recurring, use_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
            [title, parseFloat(amount), type, finalCategory, paymentMode, tags, isRecurring ? 1 : 0, useLimit ? 1 : 0, now(), now()],
          );
        }
      } catch (dbError) {
        console.error("Local DB sync failed", dbError);
      }

      showNotification(expenseId ? "Transaction updated successfully!" : "Transaction added successfully!", "success");

      if (type === "expense") {
        await checkBudgetLimit();
      }

      router.back();
    } catch (error: any) {
      console.error("Failed to save expense:", error);
      showNotification("Failed to save transaction", "error");
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        style={{ backgroundColor: theme.background }}
      >
        <ScrollView
          className="flex-1 p-4"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View className="flex-row items-center mb-6 mt-4">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 -ml-2">
              <Ionicons name="arrow-back" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text className="text-3xl font-extrabold" style={{ color: theme.text }}>
              {expenseId ? "Edit Transaction" : "New Transaction"}
            </Text>
          </View>

          <View className="flex-row p-1 rounded-2xl mb-6 shadow-sm border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <TouchableOpacity
            onPress={() => setType("expense")}
            className={`flex-1 py-3 rounded-xl items-center ${type === "expense" ? "bg-red-800" : ""}`}
          >
            <Text
              className={`font-bold ${type === "expense" ? "text-white" : "text-gray-500"}`}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType("income")}
            className={`flex-1 py-3 rounded-xl items-center ${type === "income" ? "bg-green-600" : ""}`}
          >
            <Text
              className={`font-bold ${type === "income" ? "text-white" : "text-gray-500"}`}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        <View className="p-6 rounded-3xl shadow-sm mb-6 border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <Text className="text-gray-400 font-bold text-xs mb-3 uppercase tracking-widest ml-1">
            Task Description
          </Text>
          <View
            className="flex-row items-center rounded-2xl px-4 py-4 mb-2 border"
            style={{ backgroundColor: theme.background, borderColor: titleError ? theme.error : theme.border }}
          >
            <Ionicons
              name="document-text"
              size={20}
              color={titleError ? theme.error : theme.gray}
            />
            <TextInput
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (titleError) setTitleError("");
                suggestCategory(text);
              }}
              placeholder="e.g., Grocery Shopping"
              placeholderTextColor={theme.gray}
              className="flex-1 ml-3 text-lg"
              style={{ color: theme.text }}
            />
          </View>
          {titleError ? (
            <Text className="text-red-500 text-xs ml-1 mb-4 font-bold">
              {titleError}
            </Text>
          ) : (
            <View className="mb-4" />
          )}

          <Text className="text-gray-400 font-bold text-xs mb-3 uppercase tracking-widest ml-1">
            Tags (Optional)
          </Text>
          <View
            className="flex-row items-center rounded-2xl px-4 py-3 mb-6 border"
            style={{ backgroundColor: theme.background, borderColor: theme.border }}
          >
            <Ionicons
              name="pricetag-outline"
              size={18}
              color={theme.gray}
            />
            <TextInput
              value={tags}
              onChangeText={setTags}
              placeholder="e.g., breakfast, monthly, trip"
              placeholderTextColor={theme.gray}
              className="flex-1 ml-3 text-sm"
              style={{ color: theme.text }}
            />
          </View>

          <Text className="text-gray-400 font-bold text-xs mb-3 uppercase tracking-widest ml-1">
            Amount (₹)
          </Text>
          <View
            className="flex-row items-center rounded-2xl px-4 py-4 mb-2 border"
            style={{ backgroundColor: theme.background, borderColor: amountError ? theme.error : theme.border }}
          >
            <Text
              style={{ color: amountError ? theme.error : theme.primary }}
              className="text-xl font-bold mr-2"
            >
              ₹
            </Text>
            <TextInput
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                if (amountError) setAmountError("");
              }}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={theme.gray}
              className="flex-1 text-2xl font-bold"
              style={{ color: theme.text }}
            />
          </View>
          {amountError && (
            <Text className="text-red-500 text-xs ml-1 font-bold">
              {amountError}
            </Text>
          )}

          <Text className="text-gray-400 font-bold text-xs mt-6 mb-3 uppercase tracking-widest ml-1">
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row mb-2"
          >
            {(type === "expense" ? CATEGORIES : INCOME_CATEGORIES).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                className={`items-center p-3 rounded-2xl mr-3 border-2`}
                style={{ width: 100, backgroundColor: category === cat.id ? theme.primaryBg : theme.background, borderColor: category === cat.id ? theme.primary : theme.border }}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={24}
                  color={category === cat.id ? theme.primary : theme.gray}
                />
                <Text
                  className={`text-[10px] font-bold mt-1 text-center`}
                  style={{ color: category === cat.id ? theme.primary : theme.gray }}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {category === "others" && (
            <View
              className="flex-row items-center rounded-2xl px-4 py-3 mb-2 mt-4 border"
              style={{ backgroundColor: theme.background, borderColor: theme.border }}
            >
              <TextInput
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="Enter custom category name (e.g. Travel)"
                placeholderTextColor={theme.gray}
                className="flex-1 ml-1 text-sm"
                style={{ color: theme.text }}
              />
            </View>
          )}

          <Text className="text-gray-400 font-bold text-xs mt-6 mb-3 uppercase tracking-widest ml-1">
            Payment Mode
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row mb-2"
          >
            {PAYMENT_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                onPress={() => setPaymentMode(mode.id)}
                className={`flex-row items-center px-4 py-3 rounded-2xl mr-3 border-2`}
                style={{ backgroundColor: paymentMode === mode.id ? theme.primaryBg : theme.background, borderColor: paymentMode === mode.id ? theme.primary : theme.border }}
              >
                <Ionicons
                  name={mode.icon as any}
                  size={20}
                  color={paymentMode === mode.id ? theme.primary : theme.gray}
                />
                <Text
                  className="text-xs font-bold ml-2"
                  style={{ color: paymentMode === mode.id ? theme.primary : theme.gray }}
                >
                  {mode.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="flex-row items-center justify-between mt-6 px-1">
            <View>
              <Text className="font-bold text-lg" style={{ color: theme.text }}>
                Recurring
              </Text>
              <Text className="text-xs" style={{ color: theme.gray }}>
                Repeat this transaction every month
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsRecurring(!isRecurring)}
              className={`w-14 h-8 rounded-full p-1`}
              style={{ backgroundColor: isRecurring ? theme.primary : theme.border }}
            >
              <View
                className={`w-6 h-6 rounded-full bg-white shadow-sm ${isRecurring ? "translate-x-6" : ""}`}
              />
            </TouchableOpacity>
          </View>

          {type === "expense" && (
            <View className="flex-row items-center justify-between mt-6 px-1">
              <View>
                <Text className="font-bold text-lg" style={{ color: theme.text }}>
                  Use Limit
                </Text>
                <Text className="text-xs" style={{ color: theme.gray }}>
                  Deduct this expense from your monthly budget
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setUseLimit(!useLimit)}
                className={`w-14 h-8 rounded-full p-1`}
                style={{ backgroundColor: useLimit ? theme.primary : theme.border }}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white shadow-sm ${useLimit ? "translate-x-6" : ""}`}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="gap-y-4">
          <TouchableOpacity
            onPress={saveExpense}
            style={{ backgroundColor: theme.primary }}
            className="p-5 rounded-3xl shadow-xl shadow-cyan-900/30 active:scale-95 transition-transform"
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-lg">
                {expenseId ? "Update Transaction" : "Add Transaction"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={cancel}
            className="p-5 rounded-3xl active:scale-95 transition-transform"
            style={{ backgroundColor: theme.border }}
          >
            <Text className="text-center font-bold text-lg" style={{ color: theme.text }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
