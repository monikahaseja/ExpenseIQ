import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { Colors } from "../../constants/colors";

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          paddingBottom: Platform.OS === "ios" ? 10 : 30,
          paddingTop: 10,
          height: Platform.OS === "ios" ? 90 : 85,
        },
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: "bold",
          color: theme.text,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
