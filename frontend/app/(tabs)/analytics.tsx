import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart, BarChart, LineChart } from "react-native-chart-kit";
import { useColorScheme } from "nativewind";
import { useFocusEffect } from "@react-navigation/native";
import { Colors } from "../../constants/colors";
import { db } from "../../db/database";
import { CATEGORIES, INCOME_CATEGORIES } from "../../constants/categories";
import { Expense } from "../../components/ExpenseItem";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen() {
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchMonthData = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const monthKey = `${year}-${month}`;

      const rows = await db.getAllAsync<Expense>(
        "SELECT * FROM expenses WHERE created_at LIKE ?;",
        [`${monthKey}%`]
      );
      setExpenses(rows);
    } catch (e) {
      console.error("Error fetching analytic data:", e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchMonthData();
    }, [currentDate])
  );

  const categoryData = useMemo(() => {
    const spending = expenses.filter(e => e.type === 'expense');
    const chartData = CATEGORIES.map(cat => {
      const amount = spending
        .filter(e => e.category === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        name: cat.name,
        population: amount,
        color: cat.color,
        legendFontColor: isDark ? "#fff" : "#333",
        legendFontSize: 12,
      };
    }).filter(d => d.population > 0);

    return chartData.length > 0 ? chartData : [
      { name: "No Data", population: 1, color: "#ccc", legendFontColor: "#999", legendFontSize: 12 }
    ];
  }, [expenses, isDark]);

  const weeklyData = useMemo(() => {
    const spending = expenses.filter(e => e.type === 'expense');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = new Array(7).fill(0);
    
    spending.forEach(e => {
      const day = new Date(e.created_at).getDay();
      data[day] += e.amount;
    });

    return {
      labels: days,
      datasets: [
        {
          data: data,
        },
      ],
    };
  }, [expenses]);

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

  const exportToCSV = async () => {
    if (expenses.length === 0) {
        Alert.alert("No Data", "There are no transactions to export for this month.");
        return;
    }

    try {
        const header = "ID,Title,Amount,Type,Category,Payment Mode,Date\n";
        const rows = expenses.map(e => 
            `${e.id},"${e.title}",${e.amount},${e.type},"${e.category || ''}","${e.payment_mode || ''}",${e.created_at}`
        ).join("\n");
        
        const csvContent = header + rows;
        const fileName = `ExpenseIQ_${currentDate.toISOString().slice(0, 7)}.csv`;
        const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: "utf8" });
        await Sharing.shareAsync(fileUri);
    } catch (e) {
        console.error("Export failed:", e);
        Alert.alert("Error", "Failed to export data");
    }
  };

  const chartConfig = {
    backgroundGradientFrom: isDark ? "#111" : "#fff",
    backgroundGradientTo: isDark ? "#111" : "#fff",
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(14, 116, 144, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(75, 85, 99, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const changeMonth = (dir: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-4 flex-row justify-between items-center">
        <Text className="text-3xl font-extrabold text-black dark:text-white">Analytics</Text>
        <TouchableOpacity 
            onPress={exportToCSV}
            className="p-3 bg-cyan-800 rounded-2xl flex-row items-center"
        >
            <Ionicons name="download-outline" size={20} color="white" />
            <Text className="text-white font-bold ml-2">Export</Text>
        </TouchableOpacity>
      </View>

      {/* Month Selector */}
      <View className="flex-row justify-between items-center mx-4 mb-6 bg-gray-100 dark:bg-gray-800 p-2 rounded-xl">
        <TouchableOpacity onPress={() => changeMonth(-1)} className="p-2">
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-black dark:text-white">
          {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} className="p-2">
          <Ionicons name="chevron-forward" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Category Breakdown */}
      <View className="mx-4 mb-8 bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <Text className="text-lg font-bold mb-4 text-black dark:text-white">Category Breakdown</Text>
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
      <View className="mx-4 mb-8 bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <Text className="text-lg font-bold mb-4 text-black dark:text-white">Weekly Spending (₹)</Text>
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

      {/* Heatmap Calendar */}
      <View className="mx-4 mb-8 bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-black dark:text-white">Spending Heatmap</Text>
            <View className="flex-row items-center">
                <View className="w-3 h-3 bg-green-500 rounded-sm mr-1" />
                <Text className="text-[10px] text-gray-400 mr-2">Low</Text>
                <View className="w-3 h-3 bg-red-500 rounded-sm mr-1" />
                <Text className="text-[10px] text-gray-400">High</Text>
            </View>
        </View>
        <View className="flex-row flex-wrap gap-2">
            {heatmapData.map((data, i) => {
                // Color scale: Green (low) to Red (high)
                // Intensity is 0 to 1
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

       {/* Monthly Trend (Line Chart placeholder for now or last 6 months) */}
       <View className="mx-4 mb-8 bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <Text className="text-lg font-bold mb-4 text-black dark:text-white">Top Categories</Text>
        {categoryData.filter(d => d.name !== "No Data").sort((a,b) => b.population - a.population).slice(0, 5).map((cat, i) => (
            <View key={i} className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cat.color, marginRight: 8 }} />
                    <Text className="text-gray-600 dark:text-gray-300 font-medium">{cat.name}</Text>
                </View>
                <Text className="text-black dark:text-white font-bold">₹{cat.population.toFixed(0)}</Text>
            </View>
        ))}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
