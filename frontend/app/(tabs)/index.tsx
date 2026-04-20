import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, FlatList, KeyboardAvoidingView, Platform, TextInput, Modal, StyleSheet, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { Colors } from "../../constants/colors";
import { db, getUnreadCount } from "../../db/database";
import ExpenseItem, { Expense } from "../../components/ExpenseItem";
import { useNotification } from "../../components/NotificationContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../utils/api";

export default function HomeScreen() {
  const { user, token, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
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
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = async () => {
    if (authLoading) return;
    try {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const monthStr = `${year}-${month}`;

      let rows: Expense[] = [];
      if (user) {
        setLoading(true);
        try {
          const response = await api.get(`/transactions`, { params: { month } });
          rows = response.data.data
            .filter((e: any) => e.created_at && e.created_at.startsWith(monthStr))
            .map((e: any) => ({ ...e, id: e.id || e._id }));
        } catch (e) {
          console.warn("API fetch failed, falling back to local storage");
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

      // Recursive Logic (Suggested from last month)
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
          const appNameRes = await api.get(`/appnames`);
          if (appNameRes.data?.data?.name) {
            titleToSet = appNameRes.data.data.name;
          }
        } catch (e) {
          console.warn("Failed to load title from api");
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
    }, [currentDate, token]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExpenses().finally(() => setRefreshing(refreshing));
    setTimeout(() => setRefreshing(false), 1000);
  }, [currentDate, token]);

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
              await api.delete(`/transactions/${id}`);
            } catch (e) {
              console.warn("Backend delete failed");
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
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex1}
      >
        <View style={styles.flex1}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                onPress={() => router.push("/profile" as any)}
                style={[styles.headerAvatar, { backgroundColor: theme.primaryBg, borderColor: theme.primary, borderWidth: 1 }]}
              >
                {user?.profilePhoto ? (
                  <Image source={{ uri: user.profilePhoto }} style={styles.avatarImg} />
                ) : (
                  <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </Text>
                )}
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {appTitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              style={styles.notificationBtn}
            >
              <Ionicons name="notifications-outline" size={26} color={theme.text} />
              {unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.error }]}>
                  <Text style={styles.unreadText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.balanceHeader}>
              <Text style={[styles.balanceLabel, { color: theme.gray }]}>NET BALANCE</Text>
              <TouchableOpacity 
                onPress={() => setShowPicker(true)}
                style={styles.datePickerBtn}
              >
                <Text style={[styles.monthLabel, { color: theme.primary }]}>{formattedMonth}</Text>
                <Ionicons name="chevron-down" size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.balanceVal, { color: theme.text }]}>₹{balance.toLocaleString()}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: theme.success + '20' }]}>
                  <Ionicons name="arrow-down" size={16} color={theme.success} />
                </View>
                <View>
                  <Text style={[styles.statLabel, { color: theme.gray }]}>Income</Text>
                  <Text style={[styles.incomeVal, { color: theme.success }]}>₹{totalIncome.toLocaleString()}</Text>
                </View>
              </View>
              <View style={[styles.vDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: theme.error + '20' }]}>
                  <Ionicons name="arrow-up" size={16} color={theme.error} />
                </View>
                <View>
                  <Text style={[styles.statLabel, { color: theme.gray }]}>Expenses</Text>
                  <Text style={[styles.expenseVal, { color: theme.error }]}>₹{totalExpenses.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Search & Actions */}
          <View style={styles.searchRow}>
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.gray} />
              <TextInput
                placeholder="Search transactions..."
                placeholderTextColor={theme.gray}
                value={search}
                onChangeText={setSearch}
                style={[styles.searchInput, { color: theme.text }]}
              />
            </View>
            <TouchableOpacity 
              onPress={() => router.push("/add-expense")}
              style={[styles.addBtn, { backgroundColor: theme.primaryBg, borderColor: theme.primary, borderWidth: 1 }]}
            >
              <Ionicons name="add" size={28} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* List Section */}
          <View style={styles.flex1}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
            {loading && expenses.length === 0 ? (
               <View style={styles.emptyContainer}>
                 <ActivityIndicator size="large" color={theme.primary} />
               </View>
            ) : filteredExpenses.length > 0 ? (
              <FlatList
                data={filteredExpenses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <ExpenseItem 
                    item={item} 
                    onDelete={deleteExpense} 
                    onEdit={(e) => router.push({ pathname: "/add-expense", params: { editId: e.id } })}
                    onPress={(e) => router.push({ 
                      pathname: "/expense-details" as any, 
                      params: { 
                        id: e.id,
                        title: e.title,
                        amount: e.amount.toString(),
                        type: e.type,
                        category: e.category,
                        payment_mode: e.payment_mode,
                        tags: e.tags,
                        created_at: e.created_at,
                        is_recurring: e.is_recurring?.toString(),
                        use_limit: e.use_limit?.toString()
                      } 
                    })}
                  />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color={theme.lightGray} />
                <Text style={[styles.emptyText, { color: theme.gray }]}>No transactions found</Text>
                <TouchableOpacity 
                   onPress={() => router.push("/add-expense")}
                   style={[styles.emptyAddBtn, { borderColor: theme.primary }]}
                >
                  <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Add Your First Item</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Month Picker Modal */}
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Month</Text>
              
              <View style={styles.pickerRow}>
                <View style={styles.pickerCol}>
                  <Text style={[styles.pickerLabel, { color: theme.gray }]}>YEAR</Text>
                  <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerScroll}>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                      <TouchableOpacity 
                        key={year} 
                        onPress={() => {
                          const nd = new Date(tempDate);
                          nd.setFullYear(year);
                          setTempDate(nd);
                        }}
                        style={[styles.pickerItem, tempDate.getFullYear() === year ? { backgroundColor: theme.primaryBg } : {}]}
                      >
                        <Text style={[styles.pickerItemText, tempDate.getFullYear() === year ? { color: theme.primary, fontWeight: 'bold' } : { color: theme.gray }]}>{year}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.pickerCol}>
                  <Text style={[styles.pickerLabel, { color: theme.gray }]}>MONTH</Text>
                  <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerScroll}>
                    {Array.from({ length: 12 }, (_, i) => i).map(month => {
                      const mName = new Date(2000, month).toLocaleString('default', { month: 'short' });
                      const isSelected = tempDate.getMonth() === month;
                      return (
                        <TouchableOpacity 
                          key={month} 
                          onPress={() => {
                            const nd = new Date(tempDate);
                            nd.setMonth(month);
                            setTempDate(nd);
                          }}
                          style={[styles.pickerItem, isSelected ? { backgroundColor: theme.primaryBg } : {}]}
                        >
                          <Text style={[styles.pickerItemText, isSelected ? { color: theme.primary, fontWeight: 'bold' } : { color: theme.gray }]}>{mName}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setShowPicker(false)}
                  style={[styles.modalBtn, { backgroundColor: theme.lightGray }]}
                >
                  <Text style={{ color: theme.gray, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    setCurrentDate(new Date(tempDate));
                    setShowPicker(false);
                  }}
                  style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex1: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerAvatar: { width: 50, height: 50, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  notificationBtn: { position: 'relative', padding: 8 },
  unreadBadge: { position: 'absolute', right: 4, top: 4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  unreadText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  balanceCard: { margin: 16, padding: 24, borderRadius: 32, borderWidth: 1, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  balanceLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center' },
  monthLabel: { fontSize: 13, fontWeight: 'bold', marginRight: 4 },
  balanceVal: { fontSize: 36, fontWeight: '800', marginBottom: 24 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statLabel: { fontSize: 10, fontWeight: 'bold' },
  incomeVal: { fontSize: 16, fontWeight: 'bold' },
  expenseVal: { fontSize: 16, fontWeight: 'bold' },
  vDivider: { width: 1, height: 40, marginHorizontal: 20 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  searchInput: { flex: 1, height: 50, marginLeft: 12, fontSize: 15, fontWeight: '500' },
  addBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowOpacity: 0.3, shadowRadius: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginBottom: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 15, fontWeight: '500' },
  emptyAddBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, borderWidth: 1.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 28, borderRadius: 36, borderWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  pickerCol: { flex: 1, marginHorizontal: 8 },
  pickerLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 16, textAlign: 'center' },
  pickerScroll: { maxHeight: 180 },
  pickerItem: { paddingVertical: 12, borderRadius: 16, marginBottom: 4 },
  pickerItemText: { textAlign: 'center', fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 16, borderRadius: 20, alignItems: 'center' },
});
