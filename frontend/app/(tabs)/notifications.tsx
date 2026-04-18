import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { useNotification } from "../../components/NotificationContext";
import axios from "axios";
import { API_URL } from "../../constants/api";
import { useAuth } from "../../context/AuthContext";

export interface NotificationRecord {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  warning: "warning",
  info: "information-circle",
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    text: "#166534",
    icon: "#22c55e",
  },
  error: {
    bg: "#fef2f2",
    border: "#fecaca",
    text: "#991b1b",
    icon: "#ef4444",
  },
  warning: {
    bg: "#fffbeb",
    border: "#fde68a",
    text: "#92400e",
    icon: "#f59e0b",
  },
  info: {
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e3a5f",
    icon: "#3b82f6",
  },
};

const DARK_COLOR_MAP: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: "#052e16",
    border: "#166534",
    text: "#4ade80",
    icon: "#22c55e",
  },
  error: {
    bg: "#450a0a",
    border: "#991b1b",
    text: "#f87171",
    icon: "#ef4444",
  },
  warning: {
    bg: "#422006",
    border: "#92400e",
    text: "#fbbf24",
    icon: "#f59e0b",
  },
  info: {
    bg: "#0c1a3d",
    border: "#1e3a5f",
    text: "#60a5fa",
    icon: "#3b82f6",
  },
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("default", { month: "short", day: "numeric" });
}

export default function NotificationsScreen() {
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { showNotification } = useNotification();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { token } = useAuth();
  
  const loadNotifications = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data: NotificationRecord[] = response.data.data;
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (e) {
      console.error("Error loading notifications:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, []),
  );

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (!isRead) {
      try {
        await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        loadNotifications();
      } catch (e) {
        console.error("Error marking as read:", e);
      }
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Notification", "Remove this notification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/notifications/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            loadNotifications();
            showNotification("Notification removed", "success");
          } catch (e) {
             console.error("Error deleting notification:", e);
          }
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      "Clear All",
      "Remove all notifications? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/notifications/all`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setNotifications([]);
              setUnreadCount(0);
              showNotification("All notifications cleared", "success");
            } catch (e) {
               console.error("Error clearing notifications:", e);
               showNotification("Failed to clear notifications", "error");
            }
          },
        },
      ],
    );
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await axios.put(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadNotifications();
    } catch (e) {
       console.error("Error marking all read:", e);
    }
  };

  const colorMap = isDark ? DARK_COLOR_MAP : COLOR_MAP;

  const renderItem = ({ item }: { item: NotificationRecord }) => {
    const colors = colorMap[item.type] || colorMap.info;
    const icon = ICON_MAP[item.type] || ICON_MAP.info;
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        onPress={() => handleMarkAsRead(item.id, item.is_read)}
        activeOpacity={isUnread ? 0.7 : 1}
      >
        <View
          style={{
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            padding: 16,
            marginBottom: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Unread dot */}
          {isUnread && (
            <View
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#ef4444",
              }}
            />
          )}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={icon} size={22} color={colors.icon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontWeight: isUnread ? "800" : "600",
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 2,
              }}
              numberOfLines={2}
            >
              {item.message}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: colors.text,
                  opacity: 0.6,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {formatTime(item.created_at)}
              </Text>
              {isUnread && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: "#ef4444",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>NEW</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={{
              padding: 8,
              marginLeft: 8,
              borderRadius: 10,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={isDark ? "#9ca3af" : "#6b7280"} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }} className="flex-1 bg-gray-50 dark:bg-black p-4">
      <View className="flex-row items-center mb-6 mt-4">
        <TouchableOpacity
          onPress={() => router.push("/(tabs)")}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
        >
          <Ionicons name="arrow-back" size={22} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text className="text-3xl font-extrabold text-black dark:text-white flex-1 text-center">
          Notifications
        </Text>
        {notifications.length > 0 ? (
          <TouchableOpacity
            onPress={handleClearAll}
            className="flex-row items-center bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-100 dark:border-red-900/30"
          >
            <Ionicons name="trash" size={14} color={isDark ? "#f87171" : "#dc2626"} />
            <Text className="text-red-600 dark:text-red-400 text-xs font-bold ml-1">
              Clear All
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {notifications.length > 0 && (
        <View className="flex-row items-center justify-between mb-4 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl">
          <View className="flex-row items-center">
            <Ionicons name="notifications" size={14} color={theme.gray} />
            <Text className="text-gray-500 text-xs font-bold ml-2 uppercase tracking-widest">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              {unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text className="text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center mt-20">
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: isDark ? "#1f2937" : "#f3f4f6",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color={theme.tabIconDefault}
              />
            </View>
            <Text className="text-center text-gray-400 text-lg font-bold">
              No notifications yet
            </Text>
            <Text className="text-center text-gray-400 text-sm mt-2">
              Your activity notifications will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
