import { View, Text, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColorScheme } from "nativewind";
import { Colors } from "../constants/colors";
import { CATEGORIES, INCOME_CATEGORIES } from "../constants/categories";

export interface Expense {
  id: string | number;
  _id?: string; // MongoDB optional ID
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  payment_mode?: string;
  tags?: string;
  is_recurring?: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  item: Expense;
  onEdit: (item: Expense) => void;
  onDelete: (id: string | number) => void;
  onPress: (item: Expense) => void;
}

export default function ExpenseItem({ item, onEdit, onDelete, onPress }: Props) {
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isIncome = item.type === 'income';
  const category = isIncome 
    ? INCOME_CATEGORIES.find(c => c.id === item.category) 
    : CATEGORIES.find(c => c.id === item.category);
  const categoryIcon = category?.icon || (isIncome ? "trending-up" : "trending-down");
  const categoryColor = category?.color || (isIncome ? theme.success : theme.error);

  return (
    <TouchableOpacity 
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      className="flex-row items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 dark:border-gray-800"
    >
      <View className="flex-row items-center flex-1">
        <View 
          className="p-2 rounded-xl mr-3"
          style={{ backgroundColor: `${categoryColor}20` }}
        >
          <Ionicons name={categoryIcon as any} size={24} color={categoryColor} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-black dark:text-white" numberOfLines={1}>
            {item.title}
          </Text>
          <View className="flex-row items-center">
            {category && (
              <Text className="text-gray-400 text-xs mr-2" style={{ color: categoryColor }}>
                {category.name}
              </Text>
            )}
            <Text className="text-gray-500 dark:text-gray-400 text-xs">
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          {item.tags ? (
            <View className="flex-row flex-wrap mt-1">
              {item.tags.split(',').map((tag, i) => (
                <View key={i} className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md mr-1 mb-1 border border-gray-200 dark:border-gray-700">
                  <Text className="text-[9px] text-gray-500 dark:text-gray-400">#{tag.trim()}</Text>
                </View>
              ))}
            </View>
          ) : null}
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
    </TouchableOpacity>
);
}
