import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import { initDB } from "../db/database";
import { Colors } from "../constants/colors";
import { NotificationProvider } from "../components/NotificationContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import "../global.css";

function MainLayout() {
  const { colorScheme } = useColorScheme();
  const [dbLoaded, setDbLoaded] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initDB()
      .then(() => setDbLoaded(true))
      .catch((err) => console.error("Database initialization failed:", err));
  }, []);

  useEffect(() => {
    if (authLoading || !dbLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not logged in and not in auth group
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Redirect to tabs if logged in and in auth group
      router.replace('/');
    }
  }, [user, segments, authLoading, dbLoaded]);

  if (!dbLoaded || authLoading) {
    const theme = Colors[colorScheme ?? 'light'];
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 10, color: theme.primary, fontWeight: "bold" }}>
          {!dbLoaded ? "Initialising Database..." : "Verifying Session..."}
        </Text>
      </View>
    );
  }

  const theme = Colors[colorScheme ?? 'light'];

  return (
    <NotificationProvider>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="expense-details" 
          options={{ 
            presentation: 'modal', 
            title: 'Expense Details',
            headerStyle: {
              backgroundColor: theme.background,
            },
            headerTintColor: theme.text,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerShadowVisible: false,
            headerShown: false,
          }}
        />
      </Stack>
    </NotificationProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
