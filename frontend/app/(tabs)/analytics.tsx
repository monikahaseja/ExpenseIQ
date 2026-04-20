import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart, BarChart, LineChart } from "react-native-chart-kit";
import { useColorScheme } from "nativewind";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "../../constants/colors";
import { CATEGORIES, INCOME_CATEGORIES } from "../../constants/categories";
import { Expense } from "../../components/ExpenseItem";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from 'expo-print';
import { API_URL } from "../../constants/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../utils/api";

const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDark = theme.background === "#000000" || theme.background === "#020617" || theme.background === "#0F0F17";
  const { token, isLoading: authLoading } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [timeframe, setTimeframe] = useState<"Days" | "Months" | "Years">("Days");
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchMonthData = async () => {
    if (authLoading || !token) return;
    try {
      const year = currentDate.getFullYear();
      let url = `${API_URL}/analytics`;
      
      if (timeframe === "Days") {
          const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
          url += `?month=${year}-${month}`;
      } else if (timeframe === "Months") {
          url += `?year=${year}`;
      } else {
          url += `?all=true`;
      }

      // Convert full URL back to relative if it starts with the base
      const finalPath = url.replace(API_URL, '');

      const response = await api.get(finalPath);
      setExpenses(response.data.data.expenses);
    } catch (e) {
      console.error("Error fetching analytic data:", e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchMonthData();
    }, [currentDate, token, timeframe])
  );

  const categoryData = useMemo(() => {
    const spending = expenses.filter(e => e.type === 'expense');
    const grouped = new Map<string, number>();

    spending.forEach(e => {
       const cat = e.category || 'others';
       grouped.set(cat, (grouped.get(cat) || 0) + e.amount);
    });

    const chartData = Array.from(grouped.entries()).map(([catId, amount]) => {
      const knownCat = CATEGORIES.find(c => c.id === catId);
      return {
        name: knownCat ? knownCat.name : catId,
        population: amount,
        color: knownCat ? knownCat.color : "#94a3b8", // Fallback grey for custom categories
        legendFontColor: isDark ? "#fff" : "#333",
        legendFontSize: 12,
      };
    }).sort((a, b) => b.population - a.population);

    return chartData.length > 0 ? chartData : [
      { name: "No Data", population: 1, color: "#ccc", legendFontColor: "#999", legendFontSize: 12 }
    ];
  }, [expenses, isDark]);

  const weeklyData = useMemo(() => {
    const spending = expenses.filter(e => e.type === 'expense');
    let labels: string[] = [];
    let data: number[] = [];
    
    if (timeframe === "Days") {
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        data = new Array(7).fill(0);
        spending.forEach(e => {
            const day = new Date(e.created_at).getDay();
            data[day] += e.amount;
        });
    } else if (timeframe === "Months") {
        labels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
        data = new Array(12).fill(0);
        spending.forEach(e => {
            const d = new Date(e.created_at);
            data[d.getMonth()] += e.amount;
        });
    } else if (timeframe === "Years") {
        const yearMap = new Map<number, number>();
        spending.forEach(e => {
            const y = new Date(e.created_at).getFullYear();
            yearMap.set(y, (yearMap.get(y) || 0) + e.amount);
        });
        const sortedYears = Array.from(yearMap.keys()).sort();
        if (sortedYears.length > 0) {
            labels = sortedYears.map(y => String(y).substring(2, 4)); // e.g. "26" 
            data = sortedYears.map(y => yearMap.get(y)!);
        } else {
            labels = [currentDate.getFullYear().toString()];
            data = [0];
        }
    }

    return {
      labels,
      datasets: [{ data }],
    };
  }, [expenses, timeframe, currentDate]);

  const heatmapData = useMemo(() => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const data = new Array(daysInMonth).fill(0);
    
    expenses.filter(e => e.type === 'expense').forEach(e => {
        const day = new Date(e.created_at).getDate();
        data[day - 1] += e.amount;
    });

    const max = Math.max(...data, 1);
    return data.map(amt => ({
        amount: amt,
        intensity: amt / max
    }));
  }, [expenses, currentDate]);

  const exportToPDF = async () => {
    if (expenses.length === 0) {
        Alert.alert("No Data", "There are no transactions to export.");
        return;
    }

    try {
        const timeframeLabel = timeframe === "Days" 
            ? currentDate.toLocaleString("default", { month: "long", year: "numeric" })
            : timeframe === "Months" 
              ? currentDate.getFullYear().toString()
              : "All Time";

        const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
        const totalIncome = expenses.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);

        const html = `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
      h1 { color: #086d81; margin-bottom: 5px; }
      .header-info { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
      .summary { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8f9fa; padding: 15px; rounded: 10px; }
      .summary-item { text-align: center; flex: 1; }
      .summary-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
      .summary-value { font-size: 20px; font-weight: bold; }
      .expense { color: #e53935; }
      .income { color: #43a047; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th { background-color: #086d81; color: white; text-align: left; padding: 12px; font-size: 14px; }
      td { padding: 12px; border-bottom: 1px solid #eee; font-size: 12px; }
      tr:nth-child(even) { background-color: #fcfcfc; }
      .cat-tag { padding: 4px 8px; border-radius: 4px; background: #eee; font-size: 10px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="header-info">
      <h1>💰 ExpenseIQ Report</h1>
      <p>Report Type: <strong>${timeframe}ly</strong> | Period: <strong>${timeframeLabel}</strong></p>
    </div>

    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">Total Expenses</div>
        <div class="summary-value expense">₹${totalExpenses.toFixed(2)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Income</div>
        <div class="summary-value income">₹${totalIncome.toFixed(2)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Net Balance</div>
        <div class="summary-value">${(totalIncome - totalExpenses).toFixed(2)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Title</th>
          <th>Category</th>
          <th>Type</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${expenses.map(e => `
          <tr>
            <td>${new Date(e.created_at).toLocaleDateString()}</td>
            <td>${e.title}</td>
            <td><span class="cat-tag">${e.category || 'Other'}</span></td>
            <td style="color: ${e.type === 'expense' ? '#e53935' : '#43a047'}; font-weight: bold;">${e.type.toUpperCase()}</td>
            <td style="font-weight: bold;">₹${e.amount.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </body>
</html>
        `;

        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        
    } catch (e) {
        console.error("Export failed:", e);
        Alert.alert("Error", "Failed to generate PDF report");
    }
  };

  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : theme.primary,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : theme.text,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const changeMonth = (dir: number) => {
    const d = new Date(currentDate);
    if (timeframe === "Months") {
        d.setFullYear(d.getFullYear() + dir);
    } else if (timeframe === "Days") {
        d.setMonth(d.getMonth() + dir);
    }
    setCurrentDate(d);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row justify-between items-center">
        <Text className="text-3xl font-extrabold" style={{ color: theme.text }}>Analytics</Text>
        <TouchableOpacity 
            onPress={exportToPDF}
            className="p-3 rounded-2xl flex-row items-center"
            style={{ backgroundColor: theme.primary }}
        >
            <Ionicons name="document-text-outline" size={20} color="white" />
            <Text className="text-white font-bold ml-2">Export PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Month Selector & Custom Dropdown */}
      <View style={{ zIndex: 50, elevation: 10 }}>
        <View className="flex-row items-center mx-4 mb-4">
            <View className="flex-row justify-between items-center p-2 rounded-xl flex-1" style={{ backgroundColor: theme.card }}>
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
                <Text className="text-lg font-bold mr-1" style={{ color: theme.text }}>
                  {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
                </Text>
                <Ionicons name="caret-down" size={12} color={theme.gray} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeMonth(1)} className="p-2">
                <Ionicons name="chevron-forward" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
        </View>
      </View>

      <View className="mx-4 mb-4 rounded-3xl p-1 shadow-sm border flex-row justify-around" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          {["Days", "Months", "Years"].map(tf => (
              <TouchableOpacity 
                key={tf} 
                onPress={() => setTimeframe(tf as any)} 
                className={`py-3 flex-1 items-center rounded-2xl ${timeframe === tf ? "bg-cyan-100 dark:bg-cyan-900/40" : ""}`}
              >
                  <Text className={`text-center font-bold`} style={{ color: timeframe === tf ? theme.primary : theme.text }}>{tf}</Text>
              </TouchableOpacity>
          ))}
      </View>


      {/* Category Breakdown */}
      <View className="mx-4 mb-4 rounded-3xl p-4 shadow-sm border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
        <Text className="text-lg font-bold mb-4" style={{ color: theme.text }}>Category Breakdown</Text>
        <PieChart
          data={categoryData}
          width={screenWidth - 64}
          height={220}
          chartConfig={chartConfig}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          absolute
        />
      </View>

      {/* Weekly Spending */}
      <View className="mx-4 mb-4 rounded-3xl p-4 shadow-sm border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
        <Text className="text-lg font-bold mb-4" style={{ color: theme.text }}>Weekly Spending (₹)</Text>
        <BarChart
          data={weeklyData}
          width={screenWidth - 64}
          height={220}
          yAxisLabel="₹"
          yAxisSuffix=""
          chartConfig={chartConfig}
          verticalLabelRotation={0}
          fromZero
          showValuesOnTopOfBars
        />
      </View>
      {/* Heatmap Calendar (Only visible in Days mode) */}
      {timeframe === "Days" && (
      <View className="mx-4 mb-4 rounded-3xl p-4 shadow-sm border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
        <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold" style={{ color: theme.text }}>Spending Heatmap</Text>
            <View className="flex-row items-center">
                <View className="w-3 h-3 bg-green-500 rounded-sm mr-1" />
                <Text className="text-[10px] text-gray-400 mr-2">Low</Text>
                <View className="w-3 h-3 bg-red-500 rounded-sm mr-1" />
                <Text className="text-[10px] text-gray-400">High</Text>
            </View>
        </View>
        <View className="flex-row flex-wrap gap-2">
            {heatmapData.map((data, i) => {
                const r = Math.floor(data.intensity * 255);
                const g = Math.floor((1 - data.intensity) * 200);
                const b = 50;
                const bgColor = data.amount === 0 ? (isDark ? "#1f2937" : "#f3f4f6") : `rgb(${r}, ${g}, ${b})`;
                
                return (
                    <View 
                        key={i} 
                        style={{ width: (screenWidth - 84) / 7, height: 40, backgroundColor: bgColor, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: data.amount === 0 ? (isDark ? "#4b5563" : "#9ca3af") : "white" }}>{i + 1}</Text>
                        {data.amount > 0 && <Text style={{ fontSize: 7, color: "white" }}>₹{data.amount > 999 ? (data.amount/1000).toFixed(1)+'k' : data.amount.toFixed(0)}</Text>}
                    </View>
                );
            })}
        </View>
      </View>
      )}

       {/* Monthly Trend (Line Chart placeholder for now or last 6 months) */}
      <View className="mx-4 mb-8 rounded-3xl p-4 shadow-sm border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
        <Text className="text-lg font-bold mb-4" style={{ color: theme.text }}>Top Categories</Text>
        {categoryData.filter(d => d.name !== "No Data").sort((a,b) => b.population - a.population).slice(0, 5).map((cat, i) => (
            <View key={i} className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cat.color, marginRight: 8 }} />
                    <Text className="font-medium" style={{ color: theme.gray }}>{cat.name}</Text>
                </View>
                <Text className="font-bold" style={{ color: theme.text }}>₹{cat.population.toFixed(0)}</Text>
            </View>
        ))}
      </View>
      {/* Month/Year Picker Modal */}
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="w-full rounded-3xl p-6 shadow-2xl" style={{ backgroundColor: theme.card }}>
            <Text className="text-xl font-bold mb-6 text-center" style={{ color: theme.text }}>
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
                      className={`py-3 rounded-2xl mb-1 ${tempDate.getFullYear() === year ? "bg-cyan-100 dark:bg-cyan-900/40" : ""}`}
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
                        className={`py-3 rounded-2xl mb-1 ${isSelected ? "bg-cyan-100 dark:bg-cyan-900/40" : ""}`}
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

    </ScrollView>
    </SafeAreaView>
  );
}
