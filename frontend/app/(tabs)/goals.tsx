import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../utils/api";
import { useNotification } from "../../components/NotificationContext";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon: string;
  color: string;
}

const GOAL_ICONS = [
  "briefcase", "car", "home", "laptop", "airplane", 
  "heart", "star", "gift", "pizza", "school", 
  "bicycle", "fitness", "game-controller", "camera", "medal", 
  "diamond", "wallet", "cash", "trending-up", "boat"
];
const GOAL_COLORS = ["#f87171", "#60a5fa", "#4ade80", "#fbbf24", "#a78bfa", "#f472b6", "#fb7185", "#3b82f6", "#10b981", "#fb923c"];

export default function GoalsScreen() {
  const { theme } = useTheme();
  const { token, isLoading: authLoading } = useAuth();
  const { showNotification } = useNotification();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("briefcase");
  const [selectedColor, setSelectedColor] = useState("#60a5fa");
  const [loading, setLoading] = useState(false);
  
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");

  const fetchGoals = async () => {
    if (authLoading || !token) return;
    setLoading(true);
    try {
      const response = await api.get("/goals");
      setGoals(response.data.data.map((g: any) => ({ ...g, id: g.id || g._id })));
    } catch (error) {
      console.warn("Error fetching goals");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [token])
  );

  const saveGoal = async () => {
    if (!title || !targetAmount) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      if (token) {
        await api.post("/goals", {
          title,
          target_amount: parseFloat(targetAmount),
          current_amount: parseFloat(currentAmount || "0"),
          icon: selectedIcon,
          color: selectedColor,
          deadline: new Date().toISOString()
        });
      }
      
      setModalVisible(false);
      setTitle("");
      setTargetAmount("");
      setCurrentAmount("");
      fetchGoals();
      showNotification("New goal created!", "success");
    } catch (e) {
      console.error("Error saving goal:", e);
      Alert.alert("Error", "Failed to save goal.");
    } finally {
      setLoading(false);
    }
  };

  const updateGoalProgress = async (goal: Goal, amount: number) => {
    try {
      if (token) {
        await api.put(`/goals/${goal.id}/progress`, {
          amount: amount
        });
      }
      fetchGoals();
    } catch (e) {
      console.error("Error updating progress:", e);
      Alert.alert("Error", "Failed to update progress.");
    }
  };

  const submitAdjustment = async () => {
    if (!selectedGoal || !adjustmentAmount) return;
    const amt = parseFloat(adjustmentAmount);
    if (isNaN(amt) || amt <= 0) return;
    
    const remaining = selectedGoal.target_amount - selectedGoal.current_amount;
    if (adjustmentType === "add" && amt > remaining) {
      Alert.alert(
        "Invalid Amount", 
        `You only need ₹${remaining.toLocaleString()} more to reach this goal. Please enter a smaller amount.`
      );
      return;
    }

    const isNowComplete = adjustmentType === "add" && (selectedGoal.current_amount + amt) >= selectedGoal.target_amount;
    
    setLoading(true);
    await updateGoalProgress(selectedGoal, adjustmentType === "add" ? Math.abs(amt) : -Math.abs(amt));
    
    if (isNowComplete) {
      showNotification(`Congratulations! You've achieved your goal: ${selectedGoal.title}! 🏆`, "success");
    }

    setAdjustModalVisible(false);
    setLoading(false);
  };

  const deleteGoal = (id: string) => {
    Alert.alert("Delete Goal", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              if (token) await api.delete(`/goals/${id}`);
              fetchGoals();
              showNotification("Goal deleted", "info");
            } catch (e) { console.error("Error deleting goal:", e); }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
        <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Savings Goals</Text>
            <TouchableOpacity 
              onPress={() => setModalVisible(true)}
              style={[styles.addBtn, { backgroundColor: theme.primaryBg, borderColor: theme.primary, borderWidth: 1 }]}
            >
              <Ionicons name="add" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {loading && goals.length === 0 ? (
             <View style={styles.loadingContainer}>
               <ActivityIndicator size="large" color={theme.primary} />
             </View>
          ) : goals.length > 0 ? (
            goals.map((goal) => {
              const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              return (
                <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.goalHeader}>
                    <View style={[styles.iconWrapper, { backgroundColor: goal.color + '20' }]}>
                      <Ionicons name={goal.icon as any} size={24} color={goal.color} />
                    </View>
                    <View style={styles.goalInfo}>
                      <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
                      <Text style={[styles.goalAmount, { color: theme.gray }]}>
                        ₹{goal.current_amount.toLocaleString()} / ₹{goal.target_amount.toLocaleString()}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteGoal(goal.id)} style={{ padding: 8 }}>
                      <Ionicons name="trash-outline" size={20} color={theme.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }}>₹{goal.current_amount.toLocaleString()} saved</Text>
                        {goal.current_amount < goal.target_amount ? (
                            <Text style={{ fontSize: 10, color: theme.gray }}>Remaining: ₹{(goal.target_amount - goal.current_amount).toLocaleString()}</Text>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <Ionicons name="checkmark-circle" size={12} color={theme.success} />
                                <Text style={{ fontSize: 10, color: theme.success, fontWeight: 'bold', marginLeft: 4 }}>Goal Achieved!</Text>
                            </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }}>{progress.toFixed(0)}%</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: theme.lightGray, borderRadius: 4, overflow: 'hidden' }}>
                        <View 
                            style={{ height: '100%', borderRadius: 4, width: `${progress}%`, backgroundColor: goal.current_amount >= goal.target_amount ? theme.success : goal.color }} 
                        />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity 
                        onPress={() => {
                            setSelectedGoal(goal);
                            setAdjustmentType("subtract");
                            setAdjustModalVisible(true);
                        }}
                        style={{ width: 48, height: 48, backgroundColor: theme.lightGray, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}
                      >
                          <Ionicons name="remove" size={20} color={theme.gray} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => {
                            setSelectedGoal(goal);
                            setAdjustmentType("add");
                            setAdjustModalVisible(true);
                        }}
                        disabled={goal.current_amount >= goal.target_amount}
                        style={{ flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.1, backgroundColor: goal.current_amount >= goal.target_amount ? theme.lightGray : theme.primary }}
                      >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons 
                                name={goal.current_amount >= goal.target_amount ? "ribbon-outline" : "add"} 
                                size={20} 
                                color={goal.current_amount >= goal.target_amount ? theme.gray : "white"} 
                                style={{ marginRight: 4 }} 
                            />
                            <Text style={{ fontWeight: 'bold', fontSize: 14, color: goal.current_amount >= goal.target_amount ? theme.gray : "white" }}>
                                {goal.current_amount >= goal.target_amount ? "Goal Achieved" : "Add Progress"}
                            </Text>
                          </View>
                      </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="medal-outline" size={64} color={theme.lightGray} />
              <Text style={[styles.emptyText, { color: theme.gray }]}>No goals yet. Dream big!</Text>
            </View>
          )}
        </ScrollView>

        {/* Add Goal Modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
               <Text style={[styles.modalTitle, { color: theme.text }]}>New Savings Goal</Text>
               <TextInput 
                  placeholder="What is this goal for?" 
                  placeholderTextColor={theme.gray}
                  value={title}
                  onChangeText={setTitle}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.lightGray, borderColor: theme.border }]}
               />
               <TextInput 
                  placeholder="Target Amount (₹)" 
                  keyboardType="numeric"
                  placeholderTextColor={theme.gray}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.lightGray, borderColor: theme.border }]}
               />
               <TextInput 
                  placeholder="Initial Amount (₹)" 
                  keyboardType="numeric"
                  placeholderTextColor={theme.gray}
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.lightGray, borderColor: theme.border }]}
               />
               
               <Text style={[styles.label, { color: theme.gray }]}>Choose Icon & Color</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                  {GOAL_ICONS.map(i => (
                    <TouchableOpacity 
                      key={i} 
                      onPress={() => setSelectedIcon(i)}
                      style={[styles.iconPick, { borderColor: selectedIcon === i ? theme.primary : 'transparent' }]}
                    >
                      <Ionicons name={i as any} size={24} color={selectedIcon === i ? theme.primary : theme.gray} />
                    </TouchableOpacity>
                  ))}
               </ScrollView>

               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                  {GOAL_COLORS.map(c => (
                    <TouchableOpacity 
                      key={c} 
                      onPress={() => setSelectedColor(c)}
                      style={[styles.colorPick, { backgroundColor: c, borderWidth: selectedColor === c ? 3 : 0, borderColor: theme.text }]}
                    />
                  ))}
               </ScrollView>

               <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, { backgroundColor: theme.lightGray }]}>
                     <Text style={{ color: theme.gray, fontWeight: 'bold' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={saveGoal} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
                     <Text style={{ color: '#fff', fontWeight: 'bold' }}>Create Goal</Text>
                  </TouchableOpacity>
               </View>
            </View>
          </View>
        </Modal>

        {/* Adjust Progress Modal */}
        <Modal visible={adjustModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
             <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                   {adjustmentType === "add" ? "Add to Savings" : "Withdraw from Goal"}
                </Text>
                <Text style={[styles.label, { color: theme.gray, textAlign: 'center', marginBottom: 16 }]}>
                   {selectedGoal?.title}
                </Text>
                <TextInput 
                   placeholder="Amount (₹)"
                   keyboardType="numeric"
                   autoFocus
                   placeholderTextColor={theme.gray}
                   value={adjustmentAmount}
                   onChangeText={setAdjustmentAmount}
                   style={[styles.input, { color: theme.text, backgroundColor: theme.lightGray, height: 60, fontSize: 24, textAlign: 'center' }]}
                />
                <View style={[styles.modalActions, { marginTop: 20 }]}>
                   <TouchableOpacity onPress={() => setAdjustModalVisible(false)} style={[styles.modalBtn, { backgroundColor: theme.lightGray }]}>
                      <Text style={{ color: theme.gray, fontWeight: 'bold' }}>Cancel</Text>
                   </TouchableOpacity>
                   <TouchableOpacity onPress={submitAdjustment} style={[styles.modalBtn, { backgroundColor: adjustmentType === 'add' ? theme.success : theme.error }]}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm</Text>
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
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  headerTitle: { fontSize: 30, fontWeight: '800' },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  loadingContainer: { minHeight: 300, justifyContent: 'center' },
  goalCard: { padding: 20, borderRadius: 28, borderWidth: 1, marginBottom: 20, elevation: 2 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconWrapper: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 18, fontWeight: 'bold' },
  goalAmount: { fontSize: 13, marginTop: 2 },
  progressBase: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 6 },
  goalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressPct: { fontSize: 12, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 10 },
  miniActionBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 32, padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { height: 50, borderRadius: 16, paddingHorizontal: 16, marginBottom: 16, fontSize: 16, borderWidth: 1 },
  label: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 },
  iconScroll: { marginBottom: 16 },
  iconPick: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2 },
  colorScroll: { marginBottom: 24 },
  colorPick: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
