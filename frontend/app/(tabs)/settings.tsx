import { View, Text, TextInput, ScrollView, Alert, TouchableOpacity, Platform, LayoutAnimation, UIManager, Switch, Modal, Linking, Image, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useColorScheme } from "nativewind";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/colors";
import { useNotification } from "../../components/NotificationContext";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import * as ImagePicker from 'expo-image-picker';
import { ThemeSwitcher } from "../../components/ThemeSwitcher";
import { useTheme } from "../../context/ThemeContext";
import api from "../../utils/api";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, token, updateProfile, isLoading: authLoading } = useAuth();
  const { showNotification } = useNotification();
  const { theme, themeName } = useTheme();
  const { logout } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [spent, setSpent] = useState(0);
  const [budgetLimit, setBudgetLimit] = useState("");
  const [lastSavedBudget, setLastSavedBudget] = useState("");
  const [income, setIncome] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [appTitle, setAppTitle] = useState("💰ExpenseIQ");
  const [titleError, setTitleError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);


  const getCurrentMonthKey = () => {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  };

  const loadMonthData = async () => {
    if (authLoading || !token) return;
    try {
      const monthKey = getCurrentMonthKey();
      const budgetRes = await api.get(`/budgets?month=${monthKey}`);
      const limit = budgetRes.data.data.length > 0 ? budgetRes.data.data[0].amount : 0;
      setBudgetLimit(limit > 0 ? limit.toString() : "");
      setLastSavedBudget(limit > 0 ? limit.toString() : "");

      const expensesRes = await api.get(`/analytics?month=${monthKey}`);
      const expenses = expensesRes.data.data.expenses;
      
      let totalSpent = 0;
      let totalIncome = 0;
      expenses.forEach((item: any) => {
        if (item.type === 'income') totalIncome += item.amount;
        else if (item.useLimit !== false) totalSpent += item.amount;
      });
      
      setSpent(totalSpent);
      setIncome(totalIncome);

      const appNameRes = await api.get(`/appnames`);
      if (appNameRes.data?.data?.name) {
        setAppTitle(appNameRes.data.data.name);
      }
    } catch (e) {
      console.error("Error loading month data:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMonthData();
    }, [currentDate, token])
  );

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleSaveBudget = async () => {
    if (!token) return;
    try {
      const limit = parseFloat(budgetLimit) || 0;
      const monthKey = getCurrentMonthKey();
      await api.post(`/budgets`, { month: monthKey, amount: limit });
      setLastSavedBudget(budgetLimit);
      showNotification("Budget limit updated!", "success");
    } catch (e) {
      console.error("Save budget error", e);
      showNotification("Failed to update budget", "error");
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('profilePhoto', { uri, name: filename, type } as any);
      const res = await api.put('/users/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateProfile({ ...user!, profilePhoto: res.data.profilePhoto });
      showNotification("Profile photo updated!", "success");
    } catch (error) {
      console.error("Upload failed", error);
      showNotification("Failed to update profile photo", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const formattedMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const progress = budgetLimit ? (spent / parseFloat(budgetLimit)) * 100 : 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.flex1} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        </View>

        {/* Profile Section */}
        <TouchableOpacity 
          onPress={() => router.push("/profile" as any)}
          style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={styles.profileRow}>
            <TouchableOpacity 
              onPress={() => setPreviewModalVisible(true)}
              disabled={isUploading}
              style={[styles.avatarContainer, { backgroundColor: theme.primary, borderColor: theme.accent }]}
            >
              {user?.profilePhoto ? (
                <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
              ) : (
                <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
              )}
              {isUploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="white" size="small" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.flex1}>
              <Text style={[styles.profileName, { color: theme.text }]}>{user?.name || 'User Profile'}</Text>
              <Text style={[styles.profileSubtitle, { color: theme.gray }]}>VIEW & EDIT PROFILE</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.tabIconDefault} />
          </View>
        </TouchableOpacity>

        {/* Premium Theme Switcher */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: 8, paddingTop: 8 }]}>
          <ThemeSwitcher />
        </View>

        {/* App Title Section */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>App Customization</Text>
            {isSaved && !titleError && (
              <View style={[styles.savedBadge, { backgroundColor: theme.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                <Text style={[styles.savedText, { color: theme.success }]}>Saved</Text>
              </View>
            )}
          </View>
          <Text style={[styles.smallLabel, { color: theme.gray }]}>NAME YOUR TRACKER</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.lightGray, borderColor: titleError ? theme.error : theme.border }]}>
            <TextInput
              value={appTitle}
              onChangeText={(text) => {
                setAppTitle(text);
                setIsSaved(false);
                if (!text.trim()) {
                  setTitleError("Title cannot be empty");
                } else {
                  setTitleError("");
                }
              }}
              placeholder="e.g., My Business Tracker"
              placeholderTextColor={theme.gray}
              style={[styles.titleInput, { color: theme.text }]}
            />
            {!titleError && appTitle.trim().length > 0 && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await api.post(`/appnames`, { name: appTitle });
                    setIsSaved(true);
                    showNotification("App name updated!", "success");
                    setTimeout(() => setIsSaved(false), 2000);
                  } catch (err) {
                    console.error("Save title error", err);
                  }
                }}
              >
                <Ionicons name="checkmark" size={20} color={theme.success} />
              </TouchableOpacity>
            )}
          </View>
          {titleError && <Text style={[styles.errorText, { color: theme.error }]}>{titleError}</Text>}
        </View>

        {/* Budget Section */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
             <Text style={[styles.cardTitle, { color: theme.text }]}>Cash Flow & Budget</Text>
             <View style={[styles.badge, { backgroundColor: theme.primaryBg }]}>
                <Text style={[styles.badgeText, { color: theme.primary }]}>Monthly Tracker</Text>
             </View>
          </View>
          
          <View style={[styles.monthNavigator, { backgroundColor: theme.lightGray }]}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                setTempDate(new Date(currentDate));
                setShowPicker(true);
              }}
              style={styles.monthPickerTrigger}
            >
              <Text style={[styles.monthText, { color: theme.text }]}>
                {formattedMonth}
              </Text>
              <Ionicons name="caret-down" size={12} color={theme.gray} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <Modal
            visible={showPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Budget Month</Text>
                
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerColumn}>
                    <Text style={[styles.pickerLabel, { color: theme.gray }]}>YEAR</Text>
                    <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
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
                          <Text style={[styles.pickerItemText, tempDate.getFullYear() === year ? { color: theme.primary, fontWeight: 'bold' } : { color: theme.gray }]}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.pickerColumn}>
                    <Text style={[styles.pickerLabel, { color: theme.gray }]}>MONTH</Text>
                    <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
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
                            <Text style={[styles.pickerItemText, isSelected ? { color: theme.primary, fontWeight: 'bold' } : { color: theme.gray }]}>
                              {mName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    onPress={() => setShowPicker(false)}
                    style={[styles.modalActionBtn, { backgroundColor: theme.lightGray }]}
                  >
                    <Text style={{ color: theme.gray, fontWeight: 'bold' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setCurrentDate(new Date(tempDate));
                      setShowPicker(false);
                    }}
                    style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View style={styles.marginB24}>
            <Text style={[styles.smallLabel, { color: theme.gray }]}>SET LIMIT (₹)</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.lightGray, borderColor: theme.border }]}>
              <TextInput
                value={budgetLimit}
                onChangeText={setBudgetLimit}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.gray}
                style={[styles.budgetInput, { color: theme.text }]}
              />
              {budgetLimit !== lastSavedBudget && (
                <TouchableOpacity
                  onPress={handleSaveBudget}
                  style={[styles.saveBtn, { backgroundColor: theme.success }]}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.flex1}>
              <Text style={[styles.tinyLabel, { color: theme.gray }]}>MONTHLY INCOME</Text>
              <Text style={[styles.incomeVal, { color: theme.success }]}>+ ₹{income.toFixed(0)}</Text>
            </View>
            <View style={[styles.flex1, styles.alignEnd]}>
              <Text style={[styles.tinyLabel, { color: theme.gray }]}>MONTHLY EXPENSES</Text>
              <Text style={[styles.expenseVal, { color: theme.text }]}>₹{spent.toFixed(0)}</Text>
            </View>
          </View>

          <View style={styles.progressLabelRow}>
            <Text style={[styles.tinyLabel, { color: theme.gray }]}>BUDGET PROGRESS</Text>
            <Text style={[styles.progressPct, { color: theme.gray }]}>{progress.toFixed(0)}%</Text>
          </View>

          <View style={[styles.progressBase, { backgroundColor: theme.lightGray }]}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(progress, 100)}%`, backgroundColor: progress >= 100 ? theme.error : theme.primary }
              ]} 
            />
          </View>
          
          {progress > 80 && (
            <View style={[styles.warningBox, { backgroundColor: theme.error + '15', borderColor: theme.error + '30' }]}>
              <Ionicons name="warning" size={16} color={theme.error} />
              <Text style={[styles.warningText, { color: theme.error }]}>
                {progress >= 100 ? "Budget Limit Exceeded!" : "High Spending Alert: Over 80% Used"}
              </Text>
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 16 }]}>Account</Text>
          
          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.border }]}
            onPress={() => setPasswordModalVisible(true)}
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: theme.primaryBg }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.settingsRowTitle, { color: theme.text }]}>Change Password</Text>
              <Text style={[styles.settingsRowSub, { color: theme.gray }]}>Update your account password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.tabIconDefault} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.border }]}
            onPress={() => router.push("/notifications" as any)}
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: theme.primaryBg }]}>
              <Ionicons name="notifications-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.settingsRowTitle, { color: theme.text }]}>Notifications</Text>
              <Text style={[styles.settingsRowSub, { color: theme.gray }]}>View notification history</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.tabIconDefault} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomWidth: 0 }]}
            onPress={() => router.push("/privacy" as any)}
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: theme.primaryBg }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.settingsRowTitle, { color: theme.text }]}>Privacy & Security</Text>
              <Text style={[styles.settingsRowSub, { color: theme.gray }]}>Data protection info</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.tabIconDefault} />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 16 }]}>Support</Text>
          
          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.border }]}
            onPress={() => router.push("/help-center" as any)}
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: theme.primaryBg }]}>
              <Ionicons name="help-circle-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.settingsRowTitle, { color: theme.text }]}>Help Center</Text>
              <Text style={[styles.settingsRowSub, { color: theme.gray }]}>FAQs and contact support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.tabIconDefault} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomColor: theme.border }]}
            onPress={() => router.push("/rate-app" as any)}
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: theme.primaryBg }]}>
              <Ionicons name="star-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.settingsRowTitle, { color: theme.text }]}>Rate App</Text>
              <Text style={[styles.settingsRowSub, { color: theme.gray }]}>Love the app? Let us know!</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.tabIconDefault} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingsRow, { borderBottomWidth: 0 }]}
            onPress={() => router.push("/about" as any)}
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: theme.primaryBg }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.settingsRowTitle, { color: theme.text }]}>About</Text>
              <Text style={[styles.settingsRowSub, { color: theme.gray }]}>Version 1.0.0</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.tabIconDefault} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity 
          style={[styles.logoutBtn, { borderColor: theme.error }]}
          onPress={() => {
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", onPress: logout, style: "destructive" }
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={22} color={theme.error} />
          <Text style={{ color: theme.error, fontSize: 16, fontWeight: 'bold', marginLeft: 10 }}>Log Out</Text>
        </TouchableOpacity>

        {/* Change Password Modal */}
        <Modal visible={passwordModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Change Password</Text>
              <TextInput
                style={[styles.pwInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.lightGray }]}
                placeholder="Current Password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholderTextColor={theme.gray}
              />
              <TextInput
                style={[styles.pwInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.lightGray }]}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor={theme.gray}
              />
              <TextInput
                style={[styles.pwInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.lightGray }]}
                placeholder="Confirm New Password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor={theme.gray}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setPasswordModalVisible(false)}
                  style={[styles.modalActionBtn, { backgroundColor: theme.lightGray }]}
                >
                  <Text style={{ color: theme.gray, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={async () => {
                    if (!currentPassword || !newPassword || !confirmPassword) {
                      Alert.alert('Error', 'Please fill in all fields'); return;
                    }
                    if (newPassword !== confirmPassword) {
                      Alert.alert('Error', 'New passwords do not match'); return;
                    }
                    setPwLoading(true);
                    try {
                      await api.put('/auth/change-password', { currentPassword, newPassword });
                      setPasswordModalVisible(false);
                      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                      showNotification('Password changed successfully!', 'success');
                    } catch (e: any) {
                      Alert.alert('Error', e.response?.data?.message || 'Failed to change password');
                    } finally { setPwLoading(false); }
                  }}
                  style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}
                  disabled={pwLoading}
                >
                  {pwLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Update</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.paddingB40} />
      </ScrollView>

      {/* Photo Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 1, padding: 10 }}
            onPress={() => setPreviewModalVisible(false)}
          >
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
          
          <View style={{ width: '90%', aspectRatio: 1, backgroundColor: theme.card, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: theme.border }}>
            {user?.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.primary }}>
                 <Text style={{ fontSize: 100, fontWeight: 'bold', color: 'white' }}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex1: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { marginTop: 16, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '800' },
  profileCard: { padding: 16, borderRadius: 28, borderWidth: 1, marginBottom: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'hidden', borderWidth: 2 },
  avatar: { width: '100%', height: '100%' },
  avatarInitial: { color: 'white', fontWeight: 'bold', fontSize: 24 },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 20, fontWeight: 'bold' },
  profileSubtitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  card: { padding: 24, borderRadius: 32, borderWidth: 1, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  savedText: { fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  smallLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, borderWidth: 1 },
  titleInput: { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: 'bold' },
  errorText: { fontSize: 11, fontWeight: 'bold', marginTop: 8, marginLeft: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  monthNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 20, marginBottom: 24 },
  navBtn: { padding: 10 },
  monthPickerTrigger: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  monthText: { fontSize: 15, fontWeight: 'bold', marginRight: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 28, borderRadius: 36, borderWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  pickerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  pickerColumn: { flex: 1, marginHorizontal: 8 },
  pickerLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 16, textAlign: 'center' },
  pickerScroll: { maxHeight: 180 },
  pickerItem: { paddingVertical: 12, borderRadius: 16, marginBottom: 4 },
  pickerItemText: { textAlign: 'center', fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalActionBtn: { flex: 1, padding: 16, borderRadius: 20, alignItems: 'center' },
  marginB24: { marginBottom: 24 },
  budgetInput: { flex: 1, paddingVertical: 14, fontSize: 24, fontWeight: '800' },
  saveBtn: { padding: 10, borderRadius: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  tinyLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  incomeVal: { fontSize: 17, fontWeight: 'bold' },
  expenseVal: { fontSize: 17, fontWeight: 'bold' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressPct: { fontSize: 12, fontWeight: 'bold' },
  progressBase: { height: 14, borderRadius: 7, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 7 },
  warningBox: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 16, borderWidth: 1 },
  warningText: { fontSize: 12, fontWeight: 'bold', marginLeft: 8 },
  alignEnd: { alignItems: 'flex-end' },
  paddingB40: { paddingBottom: 40 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  settingsIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  settingsRowTitle: { fontSize: 15, fontWeight: '600' },
  settingsRowSub: { fontSize: 12, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, borderWidth: 1.5, marginBottom: 50 },
  pwInput: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12 },
});
