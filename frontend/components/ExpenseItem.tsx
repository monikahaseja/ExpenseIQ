import { View, Text, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../context/ThemeContext";
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
  useLimit?: boolean;
  use_limit?: number; // Local DB column
  created_at: string;
  updated_at: string;
}

interface Props {
  item: Expense;
  onEdit: (item: Expense) => void;
  onDelete: (id: string | number) => void;
  onPress?: (item: Expense) => void;
}

export default function ExpenseItem({ item, onEdit, onDelete, onPress }: Props) {
  const { theme } = useTheme();
  const isIncome = item.type === 'income';
  const knownCategory = isIncome 
    ? INCOME_CATEGORIES.find(c => c.id === item.category) 
    : CATEGORIES.find(c => c.id === item.category);
  const categoryIcon = knownCategory?.icon || (isIncome ? "trending-up" : "grid");
  const categoryColor = knownCategory?.color || (isIncome ? theme.success : "#94a3b8");
  const categoryName = knownCategory?.name || item.category || "Others";

  return (
    <TouchableOpacity 
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
      className="flex-row items-center justify-between p-4 rounded-2xl mb-3 shadow-sm border"
      style={{ backgroundColor: theme.card, borderColor: theme.border }}
    >
      <View className="flex-row items-center flex-1">
        <View 
          className="p-2 rounded-xl mr-3"
          style={{ backgroundColor: `${categoryColor}20` }}
        >
          <Ionicons name={categoryIcon as any} size={24} color={categoryColor} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: theme.text }} numberOfLines={1}>
            {item.title}
          </Text>
          <View className="flex-row items-center overflow-hidden">
            {categoryName && (
              <Text 
                className="text-gray-400 text-xs mr-2 flex-shrink" 
                style={{ color: categoryColor }}
                numberOfLines={1}
              >
                {categoryName}
              </Text>
            )}
            <Text className="text-xs flex-shrink-0" style={{ color: theme.gray }}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          {item.tags ? (
            <View className="flex-row flex-wrap mt-1">
              {item.tags.split(',').map((tag, i) => (
                <View key={i} className="px-2 py-0.5 rounded-md mr-1 mb-1 border" style={{ backgroundColor: theme.border, borderColor: theme.border }}>
                  <Text className="text-[9px]" style={{ color: theme.gray }}>#{tag.trim()}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center ml-2">
        <Text 
           className="text-lg font-bold mr-3 flex-shrink-0"
           style={{ color: isIncome ? theme.success : theme.error }}
           numberOfLines={1}
        >
          {isIncome ? '+ ' : '- '}₹ {item.amount.toFixed(2)}
        </Text>
        
        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={() => onEdit(item)}
            className="p-2 rounded-full"
            style={{ backgroundColor: theme.lightGray }}
          >
            <Ionicons name="pencil" size={18} color={theme.gray} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onDelete(item.id)}
            className="p-2 rounded-full"
            style={{ backgroundColor: theme.error + '20' }}
          >
            <Ionicons name="trash" size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
);
}
