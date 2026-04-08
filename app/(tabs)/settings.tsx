import { View, Text, TextInput, ScrollView, Alert, TouchableOpacity, Platform, LayoutAnimation, UIManager, Switch, Modal } from "react-native";
import { useState, useCallback } from "react";
import { useColorScheme } from "nativewind";
import { useFocusEffect } from "@react-navigation/native";
import { db, getBudget, saveBudget, getSetting, saveSetting } from "../../db/database";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../../constants/colors";
import { useNotification } from "../../components/NotificationContext";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}


export default function SettingsScreen() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { showNotification } = useNotification();
  const [limit, setLimit] = useState("");
  const [spent, setSpent] = useState(0);
  const [income, setIncome] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [appTitle, setAppTitle] = useState("💰 Expense Tracker");
  const [titleError, setTitleError] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const getCurrentMonthKey = () => {
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  };

  const loadMonthData = async () => {
    const monthKey = getCurrentMonthKey();
    const savedLimit = await getBudget(monthKey);
    setLimit(savedLimit.toString());

    const rows = await db.getAllAsync<{ amount: number; type: string }>(
      "SELECT amount, type FROM expenses WHERE created_at LIKE ?;",
      [`${monthKey}%`]
    );
    
    let totalSpent = 0;
    let totalIncome = 0;
    rows.forEach(item => {
      if (item.type === 'income') totalIncome += item.amount;
      else totalSpent += item.amount;
    });
    
    setSpent(totalSpent);
    setIncome(totalIncome);

    const savedTitle = await getSetting("app_title");
    if (savedTitle) setAppTitle(savedTitle);
  };


  useFocusEffect(
    useCallback(() => {
      loadMonthData();
    }, [currentDate])
  );

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleLimitChange = async (text: string) => {
    setLimit(text);
    const monthKey = getCurrentMonthKey();
    const val = parseFloat(text) || 0;
    await saveBudget(monthKey, val);
    if (val > 0) {
      showNotification(`Budget limit set to ₹${val.toFixed(0)}`, "info");
    }
  };

  const limitNum = parseFloat(limit) || 0;
  const progressPercent = limitNum > 0 ? (spent / limitNum) * 100 : 0;
  const progress = Math.min(progressPercent, 100);
  
  let progressColor = "bg-green-500";
  if (progress > 75) progressColor = "bg-yellow-500";
  if (progress >= 100) progressColor = "bg-red-500";

  const formattedMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-black p-4">
        <View className="flex-row justify-between items-center mb-6 mt-10">
          <Text className="text-3xl font-extrabold text-black dark:text-white">Settings</Text>
        </View>

        {/* Editable App Title */}
        <View className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-black dark:text-white">App Customization</Text>
            {isSaved && !titleError && (
              <View className="flex-row items-center bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                <Text className="text-green-600 dark:text-green-400 text-[10px] font-bold ml-1">Saved</Text>
              </View>
            )}
          </View>
          <Text className="text-gray-500 text-xs font-bold mb-2 uppercase tracking-widest pl-1">Name Your Tracker</Text>
          <View className={`flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 border ${titleError ? 'border-red-500' : 'border-gray-100 dark:border-gray-700'}`}>
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
              className="flex-1 py-4 text-lg font-bold text-black dark:text-white"
            />
            {!titleError && appTitle.trim().length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  saveSetting("app_title", appTitle);
                  setIsSaved(true);
                  showNotification("App name updated!", "success");
                  setTimeout(() => setIsSaved(false), 2000);
                }}
              >
                <Ionicons name="checkmark" size={20} color={theme.success} />
              </TouchableOpacity>
            )}
          </View>
          {titleError && <Text className="text-red-500 text-xs ml-1 mt-2 font-bold">{titleError}</Text>}
        </View>

        <View className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
          <View className="flex-row justify-between items-center mb-4">
             <Text className="text-lg font-bold text-black dark:text-white">Cash Flow & Budget</Text>
             <View className="bg-cyan-100 dark:bg-cyan-900/30 px-2 py-1 rounded-lg">
                <Text className="text-cyan-800 dark:text-cyan-400 text-[10px] font-bold">Monthly Tracker</Text>
             </View>
          </View>
          
          <View className="flex-row justify-between items-center mb-6 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl">
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
              <Text className="text-sm font-bold text-gray-600 dark:text-gray-400 mr-1">
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
              <View className="bg-white dark:bg-gray-900 w-full rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
                <Text className="text-xl font-bold mb-6 text-center text-black dark:text-white">Choose Budget Month</Text>
                
                <View className="flex-row justify-between mb-8">
                  {/* Year Selection */}
                  <View className="flex-1 mr-2">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Year</Text>
                    <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                        <TouchableOpacity 
                          key={year} 
                          onPress={() => {
                            const nd = new Date(tempDate);
                            nd.setFullYear(year);
                            setTempDate(nd);
                          }}
                          className={`py-3 rounded-xl mb-1 ${tempDate.getFullYear() === year ? 'bg-cyan-100 dark:bg-cyan-900/40' : ''}`}
                        >
                          <Text className={`text-center font-bold ${tempDate.getFullYear() === year ? 'text-cyan-800 dark:text-cyan-400' : 'text-gray-500'}`}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Month Selection */}
                  <View className="flex-1 ml-2">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Month</Text>
                    <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
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
                            className={`py-3 rounded-xl mb-1 ${isSelected ? 'bg-cyan-100 dark:bg-cyan-900/40' : ''}`}
                          >
                            <Text className={`text-center font-bold ${isSelected ? 'text-cyan-800 dark:text-cyan-400' : 'text-gray-500'}`}>
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
                    <Text className="text-center font-bold text-gray-600 dark:text-gray-400">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setCurrentDate(new Date(tempDate));
                      setShowPicker(false);
                    }}
                    className="flex-1 p-4 rounded-2xl bg-cyan-800"
                  >
                    <Text className="text-center font-bold text-white">Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

        <View className="mb-6">
          <Text className="text-gray-500 text-xs font-bold mb-2 uppercase tracking-widest pl-1">Set Limit (₹)</Text>
          <TextInput
            value={limit}
            onChangeText={handleLimitChange}
            keyboardType="numeric"
            placeholder="0.00"
            className="text-2xl font-bold bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-black dark:text-white"
          />
        </View>

        <View className="flex-row justify-between items-end mb-4">
          <View className="flex-1">
            <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest pl-1">Monthly Income</Text>
            <Text className="text-lg font-bold text-green-600 dark:text-green-400">+ ₹{income.toFixed(0)}</Text>
          </View>
          <View className="flex-1 items-end">
            <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest pr-1">Monthly Expenses</Text>
            <Text className="text-lg font-bold text-black dark:text-white">₹{spent.toFixed(0)}</Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest pl-1">Budget Progress</Text>
          <Text className="text-gray-400 font-bold">{progress.toFixed(0)}%</Text>
        </View>

        <View className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <View 
            className={`h-full ${progressColor}`} 
            style={{ width: `${progress}%` }} 
          />
        </View>
        
        {progress > 80 && (
          <View className="mt-3 flex-row items-center justify-center bg-red-50 dark:bg-red-900/20 p-2 rounded-xl border border-red-100 dark:border-red-900/30">
            <Ionicons name="warning" size={16} color={theme.error} />
            <Text className="text-red-600 dark:text-red-400 text-xs font-bold ml-2">
              {progress >= 100 ? "Budget Limit Exceeded!" : "High Spending Alert: Over 80% Used"}
            </Text>
          </View>
        )}
      </View>

      {/* Appearance Section */}
        <View className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm mb-10 border border-gray-100 dark:border-gray-800">
          <Text className="text-lg font-bold mb-4 text-black dark:text-white">Appearance</Text>
          <View className="flex-row justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
            <View className="flex-row items-center">
              <View className={`p-2 rounded-xl mr-3 ${colorScheme === 'dark' ? 'bg-indigo-900/30' : 'bg-yellow-100'}`}>
                <Ionicons name={colorScheme === 'dark' ? 'moon' : 'sunny'} size={20} color={colorScheme === 'dark' ? theme.accent : theme.warning} />
              </View>
              <View>
                <Text className="font-bold text-black dark:text-white">Theme Mode</Text>
                <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{colorScheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</Text>
              </View>
            </View>
            <Switch
              value={colorScheme === 'dark'}
              onValueChange={() => {
                toggleColorScheme();
                showNotification(
                  `Switched to ${colorScheme === 'dark' ? 'Light' : 'Dark'} mode`,
                  "info"
                );
              }}
              trackColor={{ false: theme.tabIconDefault, true: theme.border }}
              thumbColor={colorScheme === 'dark' ? theme.accent : theme.warning}
            />
          </View>
        </View>
      </ScrollView>
  );
}
