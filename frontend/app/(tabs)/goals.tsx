import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "../../constants/colors";
import { db } from "../../db/database";
import Ionicons from "@expo/vector-icons/Ionicons";

interface Goal {
  id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  icon: string;
  color: string;
}

const GOAL_ICONS = ["vocation", "car", "home", "laptop", "airplane", "heart", "star", "gift", "pizza"];
const GOAL_COLORS = ["#f87171", "#60a5fa", "#4ade80", "#fbbf24", "#a78bfa", "#f472b6", "#fb7185", "#3b82f6", "#10b981"];

export default function GoalsScreen() {
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("vocation");
  const [selectedColor, setSelectedColor] = useState("#60a5fa");

  const fetchGoals = async () => {
    try {
      const rows = await db.getAllAsync<Goal>("SELECT * FROM goals ORDER BY id DESC;");
      setGoals(rows);
    } catch (e) {
      console.error("Error fetching goals:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [])
  );

  const saveGoal = async () => {
    if (!title || !targetAmount) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      await db.runAsync(
        "INSERT INTO goals (title, target_amount, current_amount, icon, color, created_at) VALUES (?, ?, ?, ?, ?, ?);",
        [title, parseFloat(targetAmount), parseFloat(currentAmount || "0"), selectedIcon, selectedColor, new Date().toISOString()]
      );
      setModalVisible(false);
      resetForm();
      fetchGoals();
    } catch (e) {
      console.error("Error saving goal:", e);
    }
  };

  const updateGoalProgress = async (goal: Goal, amount: number) => {
      try {
          const newAmount = goal.current_amount + amount;
          await db.runAsync("UPDATE goals SET current_amount = ? WHERE id = ?;", [newAmount, goal.id]);
          fetchGoals();
      } catch (e) {
          console.error("Error updating goal:", e);
      }
  };

  const deleteGoal = (id: number) => {
    Alert.alert("Delete Goal", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            await db.runAsync("DELETE FROM goals WHERE id = ?;", [id]);
            fetchGoals();
        }}
    ]);
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
                    <Text className="text-sm font-bold text-gray-600 dark:text-gray-300">₹{goal.current_amount.toFixed(0)} saved</Text>
                    <Text className="text-sm font-bold text-gray-600 dark:text-gray-300">{progress.toFixed(0)}%</Text>
                  </View>
                  <View className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <View 
                          className="h-full rounded-full" 
                          style={{ width: `${progress}%`, backgroundColor: goal.color }} 
                      />
                  </View>
                </View>

                <View className="flex-row gap-3">
                    <TouchableOpacity 
                      onPress={() => updateGoalProgress(goal, 500)}
                      className="flex-1 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 items-center"
                    >
                        <Text className="font-bold text-gray-500 text-xs">+ ₹500</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                       onPress={() => updateGoalProgress(goal, 1000)}
                      className="flex-1 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 items-center"
                    >
                        <Text className="font-bold text-gray-500 text-xs">+ ₹1000</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                       onPress={() => {
                          Alert.prompt("Add Amount", "Enter amount to add to your goal", (amt) => {
                              if (!isNaN(parseFloat(amt))) updateGoalProgress(goal, parseFloat(amt));
                          }, 'plain-text', '', 'numeric');
                       }}
                      className="flex-1 py-3 bg-cyan-800 rounded-xl items-center"
                    >
                        <Text className="font-bold text-white text-xs">Custom</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
