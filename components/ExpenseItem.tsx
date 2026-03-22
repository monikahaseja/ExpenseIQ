import { View, Text, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColorScheme } from "nativewind";
import { Colors } from "../constants/colors";

export interface Expense {
  id: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  created_at: string;
  updated_at: string;
}

interface Props {
  item: Expense;
  onEdit: (item: Expense) => void;
  onDelete: (id: number) => void;
}

export default function ExpenseItem({ item, onEdit, onDelete }: Props) {
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isIncome = item.type === 'income';

  return (
    <View className="flex-row items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 dark:border-gray-800">
      <View className="flex-row items-center flex-1">
        <View className={`p-2 rounded-xl mr-3 ${isIncome ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
          <Ionicons name={isIncome ? "trending-up" : "trending-down"} size={24} color={isIncome ? theme.success : theme.error} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-black dark:text-white" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-sm">
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center">
        <Text className={`text-lg font-bold mr-4 ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isIncome ? '+ ' : '- '}₹ {item.amount.toFixed(2)}
        </Text>
        
        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={() => onEdit(item)}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
          >
            <Ionicons name="pencil" size={18} color={Colors[colorScheme ?? 'light'].icon} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onDelete(item.id)}
            className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"
          >
            <Ionicons name="trash" size={18} color={Colors[colorScheme ?? 'light'].error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
