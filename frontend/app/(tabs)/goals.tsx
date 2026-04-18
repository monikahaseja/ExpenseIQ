import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "../../constants/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { API_URL } from "../../constants/api";
import { useAuth } from "../../context/AuthContext";
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
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { token } = useAuth();
  const { showNotification } = useNotification();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("briefcase");
  const [selectedColor, setSelectedColor] = useState("#60a5fa");
  const [loading, setLoading] = useState(false);
  
  // Progress Adjustment Modal States
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");

  const fetchGoals = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/goals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGoals(response.data.data);
    } catch (e) {
      console.error("Error fetching goals:", e);
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
      await axios.post(`${API_URL}/goals`, {
        title,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount || "0"),
        icon: selectedIcon,
        color: selectedColor,
        deadline: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setModalVisible(false);
      setTitle("");
      setTargetAmount("");
      setCurrentAmount("");
      fetchGoals();
    } catch (e) {
      console.error("Error saving goal:", e);
      Alert.alert("Error", "Failed to save goal.");
    } finally {
      setLoading(false);
    }
  };

  const updateGoalProgress = async (goal: Goal, amount: number) => {
    try {
      await axios.put(`${API_URL}/goals/${goal.id}/progress`, {
        amount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGoals();
    } catch (e) {
      console.error("Error updating progress:", e);
      Alert.alert("Error", "Failed to update progress.");
    }
  };

  const handleAdjustProgress = (goal: Goal, type: "add" | "subtract") => {
    setSelectedGoal(goal);
    setAdjustmentType(type);
    setAdjustmentAmount("");
    setAdjustModalVisible(true);
  };

  const submitAdjustment = async () => {
    if (!selectedGoal || !adjustmentAmount) return;
    const amt = parseFloat(adjustmentAmount);
    if (isNaN(amt) || amt <= 0) return;
    
    // Validation: prevent adding more than remaining
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

  const deleteGoal = async (id: string) => {
    Alert.alert(
      "Delete Goal",
      "Are you sure you want to delete this goal?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/goals/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              fetchGoals();
            } catch (e) {
              console.error("Error deleting goal:", e);
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("");
    setSelectedIcon("vocation");
    setSelectedColor("#60a5fa");
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: theme.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-3xl font-extrabold text-black dark:text-white">Savings Goals</Text>
            <TouchableOpacity 
              onPress={() => setModalVisible(true)}
              className="p-2 bg-cyan-800 rounded-full"
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {goals.map((goal) => {
            const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            return (
              <View key={goal.id} className="bg-white dark:bg-gray-900 rounded-3xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View 
                      style={{ backgroundColor: `${goal.color}20`, padding: 10, borderRadius: 15, marginRight: 12 }}
                    >
                      <Ionicons name={goal.icon as any} size={24} color={goal.color} />
                    </View>
                    <View>
                      <Text className="text-lg font-bold text-black dark:text-white">{goal.title}</Text>
                      <Text className="text-gray-400 text-xs">Target: ₹{goal.target_amount.toFixed(0)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                      <Ionicons name="trash-outline" size={20} color={theme.gray} />
                  </TouchableOpacity>
                </View>

                  <View className="mb-4">
                    <View className="flex-row justify-between mb-1">
                      <View>
                        <Text className="text-sm font-bold text-gray-600 dark:text-gray-300">₹{goal.current_amount.toLocaleString()} saved</Text>
                        {goal.current_amount < goal.target_amount ? (
                            <Text className="text-[10px] text-gray-400">Remaining: ₹{(goal.target_amount - goal.current_amount).toLocaleString()}</Text>
                        ) : (
                            <View className="flex-row items-center">
                                <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                                <Text className="text-[10px] text-green-500 font-bold ml-1">Goal Achieved!</Text>
                            </View>
                        )}
                      </View>
                      <Text className="text-sm font-bold text-gray-600 dark:text-gray-300">{progress.toFixed(0)}%</Text>
                    </View>
                    <View className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <View 
                            className="h-full rounded-full" 
                            style={{ width: `${progress}%`, backgroundColor: goal.current_amount >= goal.target_amount ? "#10b981" : goal.color }} 
                        />
                    </View>
                  </View>

                  <View className="flex-row gap-2">
                      <TouchableOpacity 
                        onPress={() => handleAdjustProgress(goal, "subtract")}
                        className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl items-center justify-center border border-gray-200 dark:border-gray-700"
                      >
                          <Ionicons name="remove" size={20} color={theme.gray} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => handleAdjustProgress(goal, "add")}
                        disabled={goal.current_amount >= goal.target_amount}
                        className={`flex-1 h-12 rounded-2xl items-center justify-center shadow-sm ${goal.current_amount >= goal.target_amount ? "bg-gray-300 dark:bg-gray-700" : "bg-cyan-800"}`}
                      >
                          <View className="flex-row items-center">
                            <Ionicons 
                                name={goal.current_amount >= goal.target_amount ? "ribbon-outline" : "add"} 
                                size={20} 
                                color={goal.current_amount >= goal.target_amount ? theme.gray : "white"} 
                                className="mr-1" 
                            />
                            <Text className={`font-bold text-sm ${goal.current_amount >= goal.target_amount ? "text-gray-500" : "text-white"}`}>
                                {goal.current_amount >= goal.target_amount ? "Goal Achieved" : "Add Progress"}
                            </Text>
                          </View>
                      </TouchableOpacity>
                  </View>
              </View>
            );
          })}

          {goals.length === 0 && (
             <View className="items-center mt-20">
                 <Ionicons name="trophy-outline" size={80} color={theme.tabIconDefault} />
                 <Text className="text-gray-400 mt-4 text-center">You haven't set any savings goals yet. Start small and save big!</Text>
             </View>
          )}
        </ScrollView>

        {/* Add Goal Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6 h-4/5 shadow-2xl">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-2xl font-bold text-black dark:text-white">New Goal</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text className="text-gray-400 font-bold text-[10px] mb-2 uppercase tracking-widest pl-1">Goal Title</Text>
                        <TextInput 
                          value={title}
                          onChangeText={setTitle}
                          placeholder="e.g., Vacation to Bali"
                          placeholderTextColor={theme.gray}
                          className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl mb-4 text-black dark:text-white font-bold"
                        />

                        <Text className="text-gray-400 font-bold text-[10px] mb-2 uppercase tracking-widest pl-1">Target Amount (₹)</Text>
                        <TextInput 
                          value={targetAmount}
                          onChangeText={setTargetAmount}
                          placeholder="0"
                          keyboardType="numeric"
                          placeholderTextColor={theme.gray}
                          className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl mb-4 text-black dark:text-white font-bold"
                        />

                        <Text className="text-gray-400 font-bold text-[10px] mb-2 uppercase tracking-widest pl-1">Initial Amount (₹)</Text>
                        <TextInput 
                          value={currentAmount}
                          onChangeText={setCurrentAmount}
                          placeholder="0"
                          keyboardType="numeric"
                          placeholderTextColor={theme.gray}
                          className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl mb-4 text-black dark:text-white font-bold"
                        />

                        <Text className="text-gray-400 font-bold text-[10px] mb-2 uppercase tracking-widest pl-1">Icon</Text>
                        <View className="flex-row flex-wrap gap-3 mb-4">
                            {GOAL_ICONS.map(icon => (
                                <TouchableOpacity 
                                  key={icon} 
                                  onPress={() => setSelectedIcon(icon)}
                                  className={`p-3 rounded-2xl ${selectedIcon === icon ? "bg-cyan-800" : "bg-gray-100 dark:bg-gray-800"}`}
                                >
                                    <Ionicons name={icon as any} size={24} color={selectedIcon === icon ? "white" : theme.gray} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text className="text-gray-400 font-bold text-[10px] mb-2 uppercase tracking-widest pl-1">Color</Text>
                        <View className="flex-row flex-wrap gap-3 mb-8">
                            {GOAL_COLORS.map(color => (
                                <TouchableOpacity 
                                  key={color} 
                                  onPress={() => setSelectedColor(color)}
                                  style={{ backgroundColor: color, width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: selectedColor === color ? "white" : "transparent" }}
                                />
                            ))}
                        </View>

                        <TouchableOpacity 
                          onPress={saveGoal}
                          className="bg-cyan-800 p-5 rounded-2xl items-center shadow-lg shadow-cyan-900/30 mb-10"
                        >
                            <Text className="text-white font-bold text-lg">Create Goal</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>

        {/* Progress Adjustment Modal */}
        <Modal 
            visible={adjustModalVisible} 
            animationType="fade" 
            transparent={true}
            onRequestClose={() => setAdjustModalVisible(false)}
        >
            <View className="flex-1 justify-center items-center bg-black/60 px-6">
                <View className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full shadow-2xl">
                    <Text className="text-xl font-bold text-center mb-2 text-black dark:text-white">
                        {adjustmentType === "add" ? "Add to Savings" : "Remove from Savings"}
                    </Text>
                    <Text className="text-gray-400 text-center text-sm mb-6">
                        Goal: {selectedGoal?.title}
                    </Text>

                    <TextInput 
                        autoFocus
                        value={adjustmentAmount}
                        onChangeText={setAdjustmentAmount}
                        placeholder="Enter amount (₹)"
                        keyboardType="numeric"
                        placeholderTextColor={theme.gray}
                        className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl mb-6 text-center text-2xl font-bold text-black dark:text-white"
                    />

                    <View className="flex-row gap-3">
                        <TouchableOpacity 
                            onPress={() => setAdjustModalVisible(false)}
                            className="flex-1 p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl items-center"
                        >
                            <Text className="font-bold text-gray-500">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={submitAdjustment}
                            disabled={loading}
                            className={`flex-1 p-4 rounded-2xl items-center ${adjustmentType === "add" ? "bg-green-600" : "bg-red-600"}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="font-bold text-white">
                                    {adjustmentType === "add" ? "Add" : "Remove"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
