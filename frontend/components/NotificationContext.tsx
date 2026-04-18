import Ionicons from "@expo/vector-icons/Ionicons";
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import axios from "axios";
import { API_URL } from "../constants/api";
import { useAuth } from "../context/AuthContext";
import { saveNotification } from "../db/database";

type NotificationType = "success" | "error" | "warning" | "info";

interface NotificationConfig {
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (
    message: string,
    type?: NotificationType,
    duration?: number,
  ) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  showNotification: () => {},
});

export const useNotification = () => useContext(NotificationContext);

const ICON_MAP: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  warning: "warning",
  info: "information-circle",
};

const COLOR_MAP: Record<
  NotificationType,
  { bg: string; border: string; text: string; icon: string }
> = {
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

export { COLOR_MAP, ICON_MAP, NotificationType };

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notification, setNotification] = useState<NotificationConfig | null>(
    null,
  );
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideNotification = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  }, [translateY, opacity]);

  const { token } = useAuth();
  
  const showNotification = useCallback(
    (
      message: string,
      type: NotificationType = "info",
      duration: number = 3000,
    ) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Persist to local DB
      saveNotification(message, type);

      // Reset position
      translateY.setValue(-120);
      opacity.setValue(0);

      setNotification({ message, type, duration });

      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      timeoutRef.current = setTimeout(() => {
        hideNotification();
      }, duration);
    },
    [translateY, opacity, hideNotification, token],
  );

  const colors = notification ? COLOR_MAP[notification.type] : COLOR_MAP.info;
  const iconName = notification ? ICON_MAP[notification.type] : ICON_MAP.info;

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <Animated.View
          style={{
            position: "absolute",
            top: Platform.OS === "ios" ? 50 : 40,
            left: 16,
            right: 16,
            zIndex: 9999,
            elevation: 9999,
            transform: [{ translateY }],
            opacity,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name={iconName} size={20} color={colors.icon} />
            </View>
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontWeight: "700",
                fontSize: 14,
                lineHeight: 20,
              }}
              numberOfLines={2}
            >
              {notification.message}
            </Text>
            <TouchableOpacity
              onPress={hideNotification}
              style={{
                padding: 4,
                marginLeft: 8,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}
