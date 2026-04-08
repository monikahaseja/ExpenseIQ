import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/colors";
import { db, getBudget } from "../db/database";
import { useNotification } from "../components/NotificationContext";
import { now } from "../utils/date";

export default function AddExpenseScreen() {
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showNotification } = useNotification();

  const expenseId = params.id ? parseInt(params.id as string) : null;

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [titleError, setTitleError] = useState("");
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    if (params.id) {
      setTitle(params.title as string);
      setAmount(params.amount as string);
      setType((params.type as "income" | "expense") || "expense");
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

      const rows = await db.getAllAsync<{ amount: number; type: string }>(
        "SELECT amount, type FROM expenses WHERE created_at LIKE ?;",
        [`${monthKey}%`],
      );

      let totalSpent = 0;
      rows.forEach((item) => {
        if (item.type === "expense") totalSpent += item.amount;
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

    try {
      if (expenseId) {
        await db.runAsync(
          "UPDATE expenses SET title=?, amount=?, type=?, updated_at=? WHERE id=?;",
          [title, parseFloat(amount), type, now(), expenseId],
        );
        showNotification("Transaction updated successfully!", "success");
      } else {
        await db.runAsync(
          "INSERT INTO expenses (title, amount, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?);",
          [title, parseFloat(amount), type, now(), now()],
        );
        showNotification("Transaction added successfully!", "success");
      }

      // Check if budget limit is reached/exceeded (only for expense type)
      if (type === "expense") {
        await checkBudgetLimit();
      }

      router.back();
    } catch (error: any) {
      console.error("Failed to save expense:", error);
      showNotification("Failed to save transaction", "error");
    }
  };

  const cancel = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50 dark:bg-black"
    >
      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Text className="text-3xl font-extrabold mb-6 mt-10 text-black dark:text-white">
          {expenseId ? "Edit Transaction" : "New Transaction"}
        </Text>

        <View className="flex-row bg-white dark:bg-gray-900 p-1 rounded-2xl mb-6 shadow-sm border border-gray-100 dark:border-gray-800">
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

        <View className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
          <Text className="text-gray-400 font-bold text-xs mb-3 uppercase tracking-widest ml-1">
            Task Description
          </Text>
          <View
            className={`flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-4 mb-2 border ${titleError ? "border-red-500" : "border-gray-100 dark:border-gray-700"}`}
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
              }}
              placeholder="e.g., Grocery Shopping"
              placeholderTextColor={theme.gray}
              className="flex-1 ml-3 text-lg text-black dark:text-white"
            />
          </View>
          {titleError ? (
            <Text className="text-red-500 text-xs ml-1 mb-6 font-bold">
              {titleError}
            </Text>
          ) : (
            <View className="mb-6" />
          )}

          <Text className="text-gray-400 font-bold text-xs mb-3 uppercase tracking-widest ml-1">
            Amount (₹)
          </Text>
          <View
            className={`flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-4 mb-2 border ${amountError ? "border-red-500" : "border-gray-100 dark:border-gray-700"}`}
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
              className="flex-1 text-2xl font-bold text-black dark:text-white"
            />
          </View>
          {amountError && (
            <Text className="text-red-500 text-xs ml-1 font-bold">
              {amountError}
            </Text>
          )}
        </View>

        <View className="gap-y-4">
          <TouchableOpacity
            onPress={saveExpense}
            style={{ backgroundColor: theme.primary }}
            className="p-5 rounded-3xl shadow-xl shadow-cyan-900/30 active:scale-95 transition-transform"
          >
            <Text className="text-white text-center font-bold text-lg">
              {expenseId ? "Update Transaction" : "Add Transaction"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={cancel}
            className="bg-gray-200 dark:bg-gray-800 p-5 rounded-3xl active:scale-95 transition-transform"
          >
            <Text className="text-gray-700 dark:text-gray-300 text-center font-bold text-lg">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
