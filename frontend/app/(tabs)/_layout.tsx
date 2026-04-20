import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { Platform, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";

export default function TabLayout() {
  const { theme } = useTheme();
  const isDark = theme.background === "#000000" || theme.background === "#020617" || theme.background === "#0F0F17";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 60 + Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 0),
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 6),
          paddingTop: 14,
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
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? theme.primaryBg : 'transparent', width: 64, height: 50, borderRadius: 10 }}>
               <Ionicons name="home" size={24} color={focused ? theme.primary : theme.tabIconDefault} />
               <Text numberOfLines={1} style={{ color: focused ? theme.primary : theme.tabIconDefault, fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>Home</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Goals",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? theme.primaryBg : 'transparent', width: 64, height: 50, borderRadius: 10 }}>
               <Ionicons name="trophy" size={24} color={focused ? theme.primary : theme.tabIconDefault} />
               <Text numberOfLines={1} style={{ color: focused ? theme.primary : theme.tabIconDefault, fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>Goals</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? theme.primaryBg : 'transparent', width: 64, height: 50, borderRadius: 10 }}>
               <Ionicons name="pie-chart" size={24} color={focused ? theme.primary : theme.tabIconDefault} />
               <Text numberOfLines={1} style={{ color: focused ? theme.primary : theme.tabIconDefault, fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>Stats</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: "Notifications",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? theme.primaryBg : 'transparent', width: 64, height: 50, borderRadius: 10 }}>
               <Ionicons name="notifications" size={24} color={focused ? theme.primary : theme.tabIconDefault} />
               <Text numberOfLines={1} style={{ color: focused ? theme.primary : theme.tabIconDefault, fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>Alerts</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          title: "Advisor",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? theme.primaryBg : 'transparent', width: 64, height: 50, borderRadius: 10 }}>
               <Ionicons name="sparkles" size={24} color={focused ? theme.primary : theme.tabIconDefault} />
               <Text numberOfLines={1} style={{ color: focused ? theme.primary : theme.tabIconDefault, fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>Advisor</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? theme.primaryBg : 'transparent', width: 64, height: 50, borderRadius: 10 }}>
               <Ionicons name="person" size={24} color={focused ? theme.primary : theme.tabIconDefault} />
               <Text numberOfLines={1} style={{ color: focused ? theme.primary : theme.tabIconDefault, fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>Profile</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? theme.primaryBg : 'transparent', width: 64, height: 50, borderRadius: 10 }}>
               <Ionicons name="settings" size={24} color={focused ? theme.primary : theme.tabIconDefault} />
               <Text numberOfLines={1} style={{ color: focused ? theme.primary : theme.tabIconDefault, fontSize: 10, fontWeight: 'bold', marginTop: 2 }}>Settings</Text>
            </View>
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
