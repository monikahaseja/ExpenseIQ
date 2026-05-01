import React, { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, SectionList, KeyboardAvoidingView, Platform, TextInput, Modal, StyleSheet, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { db, getUnreadCount } from "../../db/database";
import ExpenseItem, { Expense } from "../../components/ExpenseItem";
import { useNotification } from "../../components/NotificationContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../utils/api";
import { CATEGORIES, INCOME_CATEGORIES } from "../../constants/categories";

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
  const [selectedCategory, setSelectedCategory] = useState("all");

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
            "SELECT * FROM transactions WHERE strftime('%Y-%m', created_at) = ? OR created_at LIKE ? ORDER BY created_at DESC, id DESC;",
            [monthStr, `${monthStr}%`],
          );
        } finally {
          setLoading(false);
        }
      } else {
        rows = await db.getAllAsync<Expense>(
          "SELECT * FROM transactions WHERE strftime('%Y-%m', created_at) = ? OR created_at LIKE ? ORDER BY created_at DESC, id DESC;",
          [monthStr, `${monthStr}%`],
        );
      }
      
      setExpenses(rows);

      // Sync API data to local DB for offline access
      if (user && rows.length > 0) {
        try {
          // Delete local entries for this month to avoid duplicates
          await db.runAsync("DELETE FROM transactions WHERE created_at LIKE ?;", [`${monthStr}%`]);
          
          // Insert new entries from API
          for (const exp of rows) {
            await db.runAsync(
              "INSERT INTO transactions (remote_id, title, amount, type, category, payment_mode, tags, is_recurring, use_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
              [
                exp.id.toString(), 
                exp.title || "", 
                exp.amount || 0, 
                exp.type || "expense", 
                exp.category || null, 
                exp.payment_mode || null, 
                exp.tags || null, 
                exp.is_recurring ? 1 : 0, 
                exp.use_limit ? 1 : 0, 
                exp.created_at || new Date().toISOString(), 
                exp.updated_at || new Date().toISOString()
              ]
            );
          }
        } catch (syncErr) {
          console.warn("Failed to sync API data to local DB:", syncErr);
        }
      }

      const count = await getUnreadCount(user?.id || null);
      setUnreadCount(count);

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
    fetchExpenses().finally(() => setRefreshing(false));
  }, [currentDate, token]);

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (selectedCategory !== "all") {
      if (selectedCategory === "others") {
        result = result.filter(e => e.category === "others" || (e.category && e.category.startsWith("Others - ")));
      } else {
        result = result.filter(e => e.category === selectedCategory);
      }
    }
    if (search.trim()) {
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.amount.toString().includes(search),
      );
    }
    return result;
  }, [expenses, search, selectedCategory]);

  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: Expense[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    filteredExpenses.forEach(exp => {
      const expDate = new Date(exp.created_at);
      expDate.setHours(0, 0, 0, 0);
      
      let dateKey: string;
      if (expDate.getTime() === today.getTime()) {
        dateKey = "TODAY";
      } else if (expDate.getTime() === yesterday.getTime()) {
        dateKey = "YESTERDAY";
      } else {
        // Format: 10 SEP, 20
        const day = expDate.getDate().toString().padStart(2, '0');
        const month = expDate.toLocaleString('default', { month: 'short' }).toUpperCase();
        const year = expDate.getFullYear().toString().slice(-2);
        dateKey = `${day} ${month}, ${year}`;
      }
      
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(exp);
    });

    return Object.keys(groups).map(date => ({
      title: date,
      data: groups[date]
    }));
  }, [filteredExpenses]);

  const { balance, totalIncome, totalExpenses } = useMemo(() => {
    return expenses.reduce(
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
  }, [expenses]);

  const deleteExpense = (id: string | number) => {
    Alert.alert("Delete Transaction", "Are you sure you want to delete this?", [
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
          showNotification("Deleted successfully", "success");
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

          {/* Category Filter Card */}
          <View style={[styles.categoryCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              <TouchableOpacity 
                onPress={() => setSelectedCategory("all")}
                style={styles.categoryItem}
              >
                <View style={[
                  styles.categoryIcon, 
                  { backgroundColor: selectedCategory === "all" ? theme.primary : theme.primaryBg, borderColor: theme.border, borderWidth: 1 }
                ]}>
                  <Ionicons name="layers" size={20} color={selectedCategory === "all" ? "#fff" : theme.primary} />
                </View>
                <Text style={[styles.categoryLabel, { color: selectedCategory === "all" ? theme.primary : theme.gray }]}>All</Text>
              </TouchableOpacity>

              {CATEGORIES.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  onPress={() => setSelectedCategory(cat.id)}
                  style={styles.categoryItem}
                >
                  <View style={[
                    styles.categoryIcon, 
                    { backgroundColor: selectedCategory === cat.id ? theme.primary : theme.primaryBg, borderColor: theme.border, borderWidth: 1 }
                  ]}>
                    <Ionicons name={cat.icon as any} size={20} color={selectedCategory === cat.id ? "#fff" : theme.primary} />
                  </View>
                  <Text style={[styles.categoryLabel, { color: selectedCategory === cat.id ? theme.primary : theme.gray }]}>{cat.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
              onPress={() => {
                const year = currentDate.getFullYear();
                const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
                router.push({
                  pathname: "/add-expense",
                  params: { initialDate: `${year}-${month}-01` }
                });
              }}
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
            ) : groupedExpenses.length > 0 ? (
              <SectionList
                sections={groupedExpenses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <ExpenseItem 
                    item={item} 
                    showDate={false}
                    onDelete={deleteExpense} 
                    onEdit={(e) => router.push({ 
                      pathname: "/add-expense", 
                      params: { 
                        id: e.id,
                        title: e.title,
                        amount: e.amount.toString(),
                        type: e.type,
                        category: e.category,
                        payment_mode: e.payment_mode,
                        tags: e.tags,
                        created_at: e.created_at,
                        is_recurring: e.is_recurring ? "1" : "0",
                        use_limit: e.use_limit === 0 ? "0" : "1"
                      } 
                    })}
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
                renderSectionHeader={({ section: { title } }) => (
                  <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
                    <Text style={[styles.sectionHeaderText, { color: theme.gray }]}>{title}</Text>
                  </View>
                )}
                stickySectionHeadersEnabled={false}
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
                
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                  <TouchableOpacity 
                    onPress={() => {
                      const year = currentDate.getFullYear();
                      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
                      router.push({
                        pathname: "/add-expense",
                        params: { initialDate: `${year}-${month}-01` }
                      });
                    }}
                    style={[styles.emptyAddBtn, { borderColor: theme.primary }]}
                  >
                    <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Add Entry</Text>
                  </TouchableOpacity>
                </View>
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
  header: { paddingHorizontal: 16, paddingVertical: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 14, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  notificationBtn: { position: 'relative', padding: 6 },
  unreadBadge: { position: 'absolute', right: 2, top: 2, minWidth: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'white' },
  unreadText: { color: 'white', fontSize: 7, fontWeight: 'bold' },
  balanceCard: { marginHorizontal: 16, marginTop: 4, marginBottom: 10, padding: 16, borderRadius: 20, borderWidth: 1, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center' },
  monthLabel: { fontSize: 11, fontWeight: 'bold', marginRight: 4 },
  balanceVal: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  statLabel: { fontSize: 9, fontWeight: 'bold' },
  incomeVal: { fontSize: 14, fontWeight: 'bold' },
  expenseVal: { fontSize: 14, fontWeight: 'bold' },
  vDivider: { width: 1, height: 24, marginHorizontal: 10 },
  categoryCard: { marginHorizontal: 16, marginBottom: 10, paddingVertical: 8, borderRadius: 20, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  categoryItem: { alignItems: 'center', width: 60 },
  categoryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  categoryLabel: { fontSize: 9, fontWeight: '700' },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, height: 40, marginLeft: 6, fontSize: 13, fontWeight: '500' },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowOpacity: 0.2, shadowRadius: 3 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginHorizontal: 16, marginBottom: 6 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  sectionHeaderText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  emptyAddBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 24, borderRadius: 32, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  pickerCol: { flex: 1, marginHorizontal: 8 },
  pickerLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 12, textAlign: 'center' },
  pickerScroll: { maxHeight: 150 },
  pickerItem: { paddingVertical: 10, borderRadius: 12, marginBottom: 4 },
  pickerItemText: { textAlign: 'center', fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 16, alignItems: 'center' },
});
