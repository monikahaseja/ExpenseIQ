import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import { initDB } from "../db/database";
import { Colors } from "../constants/colors";
import "../global.css";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    initDB()
      .then(() => setDbLoaded(true))
      .catch((err) => console.error("Database initialization failed:", err));
  }, []);

  if (!dbLoaded) {
    const theme = Colors[colorScheme ?? 'light'];
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 10, color: theme.primary, fontWeight: "bold" }}>Initialising Database...</Text>
      </View>
    );
  }

  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="add-expense" 
        options={{ 
          presentation: 'modal', 
          title: 'Add Expense',
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShadowVisible: false,
        }} 
      />
    </Stack>
  );
}
