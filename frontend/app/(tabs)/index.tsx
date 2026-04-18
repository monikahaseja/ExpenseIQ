import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, FlatList, KeyboardAvoidingView, Platform, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { Colors } from "../../constants/colors";
import { db, getSetting, getUnreadCount } from "../../db/database";
import ExpenseItem, { Expense } from "../../components/ExpenseItem";
import { useNotification } from "../../components/NotificationContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CATEGORIES, INCOME_CATEGORIES } from "../../constants/categories";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { API_URL } from "../../constants/api";

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { showNotification } = useNotification();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [appTitle, setAppTitle] = useState("💰ExpenseIQ");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const monthStr = `${year}-${month}`;

      let rows: Expense[] = [];
      if (user) {
        setLoading(true);
        try {
          const response = await axios.get(`${API_URL}/transactions`, { params: { month } });
          rows = response.data.data
            .filter((e: any) => e.created_at && e.created_at.startsWith(monthStr))
            .map((e: any) => ({ ...e, id: e.id || e._id }));
        } catch (e) {
          console.error("API fetch failed, falling back to local storage", e);
          rows = await db.getAllAsync<Expense>(
            "SELECT * FROM transactions WHERE strftime('%Y-%m', created_at) = ? OR created_at LIKE ? ORDER BY id DESC;",
            [monthStr, `${monthStr}%`],
          );
        } finally {
          setLoading(false);
        }
      } else {
        rows = await db.getAllAsync<Expense>(
          "SELECT * FROM transactions WHERE strftime('%Y-%m', created_at) = ? OR created_at LIKE ? ORDER BY id DESC;",
          [monthStr, `${monthStr}%`],
        );
      }
      
      setExpenses(rows);

      // Simple Recurring Suggestion logic
      const lastMonth = new Date(currentDate);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, "0")}`;
      
      const recurringRows = await db.getAllAsync<Expense>(
          "SELECT * FROM transactions WHERE is_recurring = 1 AND (strftime('%Y-%m', created_at) = ? OR created_at LIKE ?);",
          [lastMonthStr, `${lastMonthStr}%`]
      );

      if (recurringRows.length > 0 && rows.length > 0) {
          const alreadyAddedTitles = new Set(rows.map(r => r.title));
          const toSuggest = recurringRows.filter(r => !alreadyAddedTitles.has(r.title));
          
          if (toSuggest.length > 0) {
              Alert.alert(
                  "Recurring transactions",
                  `Found ${toSuggest.length} recurring transactions from last month. Would you like to add them for ${formattedMonth}?`,
                  [
                      { text: "No", style: "cancel" },
                      { text: "Yes", onPress: async () => {
                          for (const rs of toSuggest) {
                              await db.runAsync(
                                  "INSERT INTO transactions (title, amount, type, category, payment_mode, tags, is_recurring, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
                                  [rs.title, rs.amount, rs.type, rs.category || 'others', rs.payment_mode || 'cash', rs.tags || '', 1, new Date().toISOString(), new Date().toISOString()]
                              );
                          }
                          fetchExpenses();
                          showNotification(`Added ${toSuggest.length} recurring transactions`, "success");
                      }}
                  ]
              );
          }
      }

      let titleToSet = "💰ExpenseIQ";
      if (token) {
        try {
          const appNameRes = await axios.get(`${API_URL}/appnames`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (appNameRes.data?.data?.name) {
            titleToSet = appNameRes.data.data.name;
          }
        } catch (e) {
          console.error("Failed to load title from api", e);
        }
      }
      setAppTitle(titleToSet);

      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      console.error("Error fetching expenses:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [currentDate]),
  );

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return expenses;
    return expenses.filter(
      (e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.amount.toString().includes(search),
    );
  }, [expenses, search]);

  const { balance, totalIncome, totalExpenses } = useMemo(() => {
    return filteredExpenses.reduce(
      (acc, e) => {
        if (e.type === "income") {
          acc.totalIncome += e.amount;
          acc.balance += e.amount;
        } else {
          acc.totalExpenses += e.amount;
          acc.balance -= e.amount;
        }
        return acc;
      },
      { balance: 0, totalIncome: 0, totalExpenses: 0 },
    );
  }, [filteredExpenses]);

  const deleteExpense = (id: string | number) => {
    Alert.alert("Delete Expense", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (user) {
            try {
              await axios.delete(`${API_URL}/transactions/${id}`);
            } catch (e) {
              console.error("Backend delete failed", e);
            }
          }
          await db.runAsync("DELETE FROM transactions WHERE id=?;", [id]);
          fetchExpenses();
          showNotification("Expense deleted successfully", "success");
        },
      },
    ]);
  };

  const formattedMonth = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white dark:bg-black"
    >
      <View className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-4 mt-2">
          <Text className="text-2xl font-bold text-black dark:text-white">
            {appTitle}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={{ position: "relative", padding: 8 }}
          >
            <Ionicons name="notifications-outline" size={26} color={theme.text} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#ef4444",
                  borderWidth: 2,
                  borderColor: colorScheme === "dark" ? "#000" : "#fff",
                }}
              />
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center mb-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-xl">
          <TouchableOpacity onPress={() => changeMonth(-1)} className="p-2">
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setTempDate(new Date(currentDate));
              setShowPicker(true);
            }}
            className="flex-row items-center px-4 py-2"
          >
            <Text className="text-lg font-bold text-black dark:text-white mr-1">
              {formattedMonth}
            </Text>
            <Ionicons name="caret-down" size={12} color={theme.gray} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeMonth(1)} className="p-2">
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Month/Year Picker Modal */}
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50 px-6">
            <View className="bg-white dark:bg-gray-900 w-full rounded-3xl p-6 shadow-2xl">
              <Text className="text-xl font-bold mb-6 text-center text-black dark:text-white">
                Choose Date
              </Text>

              <View className="flex-row justify-between mb-8">
                {/* Year Selection */}
                <View className="flex-1 mr-2">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                    Year
                  </Text>
                  <ScrollView
                    style={{ maxHeight: 200 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {Array.from(
                      { length: 10 },
                      (_, i) => new Date().getFullYear() - 5 + i,
                    ).map((year) => (
                      <TouchableOpacity
                        key={year}
                        onPress={() => {
                          const nd = new Date(tempDate);
                          nd.setFullYear(year);
                          setTempDate(nd);
                        }}
                        className={`py-3 rounded-xl mb-1 ${tempDate.getFullYear() === year ? "bg-cyan-100 dark:bg-cyan-900/40" : ""}`}
                      >
                        <Text
                          className={`text-center font-bold ${tempDate.getFullYear() === year ? "text-cyan-800 dark:text-cyan-400" : "text-gray-500"}`}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Month Selection */}
                <View className="flex-1 ml-2">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">
                    Month
                  </Text>
                  <ScrollView
                    style={{ maxHeight: 200 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {Array.from({ length: 12 }, (_, i) => i).map((month) => {
                      const mName = new Date(2000, month).toLocaleString(
                        "default",
                        { month: "short" },
                      );
                      const isSelected = tempDate.getMonth() === month;
                      return (
                        <TouchableOpacity
                          key={month}
                          onPress={() => {
                            const nd = new Date(tempDate);
                            nd.setMonth(month);
                            setTempDate(nd);
                          }}
                          className={`py-3 rounded-xl mb-1 ${isSelected ? "bg-cyan-100 dark:bg-cyan-900/40" : ""}`}
                        >
                          <Text
                            className={`text-center font-bold ${isSelected ? "text-cyan-800 dark:text-cyan-400" : "text-gray-500"}`}
                          >
                            {mName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  className="flex-1 p-4 rounded-2xl bg-gray-100 dark:bg-gray-800"
                >
                  <Text className="text-center font-bold text-gray-600 dark:text-gray-400">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setCurrentDate(new Date(tempDate));
                    setShowPicker(false);
                  }}
                  className="flex-1 p-4 rounded-2xl bg-cyan-800"
                >
                  <Text className="text-center font-bold text-white">
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View className="bg-cyan-800 p-5 rounded-3xl mb-6 shadow-lg shadow-cyan-900/30">
          <View className="mb-4">
            <Text className="text-cyan-200 text-xs font-bold uppercase tracking-widest pl-1 mb-1">
              Net Balance
            </Text>
            <Text
              className={`text-4xl font-extrabold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {balance >= 0 ? "+ " : "- "}₹ {Math.abs(balance).toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between pt-4 border-t border-cyan-700/50">
            <View>
              <Text className="text-cyan-200 text-[10px] font-bold uppercase tracking-widest mb-1">
                Income
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name="trending-up"
                  size={16}
                  color="#4ade80"
                  className="mr-1"
                />
                <Text className="text-green-400 text-lg font-bold">
                  + ₹{totalIncome.toFixed(2)}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-cyan-200 text-[10px] font-bold uppercase tracking-widest mb-1">
                Expenses
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name="trending-down"
                  size={16}
                  color="#f87171"
                  className="mr-1"
                />
                <Text className="text-red-400 text-lg font-bold">
                  - ₹{totalExpenses.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="flex-row items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl mb-4 px-3">
          <Ionicons name="search" size={20} color={theme.gray} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search expense..."
            placeholderTextColor={theme.gray}
            className="flex-1 py-3 px-2 text-black dark:text-white"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color={theme.gray} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          data={filteredExpenses}
          keyExtractor={(i, index) => (i.id || i._id || index).toString()}
          renderItem={({ item }) => (
            <ExpenseItem
              item={item}
              onEdit={(expense) =>
                router.push({
                  pathname: "/add-expense" as any,
                  params: {
                    id: expense.id.toString(),
                    title: expense.title,
                    amount: expense.amount,
                    type: expense.type,
                    category: expense.category,
                    payment_mode: expense.payment_mode,
                    is_recurring: expense.is_recurring?.toString(),
                    use_limit: (expense.use_limit !== undefined ? expense.use_limit : (expense.useLimit ? 1 : 0)).toString(),
                    created_at: expense.created_at,
                    tags: expense.tags
                  },
                })
              }
              onPress={(expense) =>
                router.push({
                  pathname: "/expense-details" as any,
                  params: {
                    id: expense.id.toString(),
                    title: expense.title,
                    amount: expense.amount,
                    type: expense.type,
                    category: expense.category,
                    payment_mode: expense.payment_mode,
                    is_recurring: expense.is_recurring?.toString(),
                    use_limit: (expense.use_limit !== undefined ? expense.use_limit : (expense.useLimit ? 1 : 0)).toString(),
                    created_at: expense.created_at,
                    tags: expense.tags
                  },
                })
              }
              onDelete={deleteExpense}
            />
          )}
          ListEmptyComponent={
            <View className="items-center mt-10">
              <Ionicons
                name="receipt-outline"
                size={64}
                color={theme.tabIconDefault}
              />
              <Text className="text-center text-gray-400 mt-4 text-lg">
                No expenses found for this month
              </Text>
            </View>
          }
        />

        <TouchableOpacity
          onPress={() => router.push("/add-expense" as any)}
          style={{ backgroundColor: theme.primary }}
          className="absolute bottom-10 right-8 w-16 h-16 rounded-full items-center justify-center shadow-xl shadow-cyan-900/40"
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
