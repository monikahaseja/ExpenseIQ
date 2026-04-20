import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AboutScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const features = [
    { icon: 'wallet-outline', title: 'Track Transactions', desc: 'Monitor income & expenses with categories and tags' },
    { icon: 'trophy-outline', title: 'Savings Goals', desc: 'Set financial goals and track your progress' },
    { icon: 'pie-chart-outline', title: 'Smart Analytics', desc: 'Visual breakdowns of your spending patterns' },
    { icon: 'sparkles-outline', title: 'AI Advisor', desc: 'Get personalized financial tips and insights' },
    { icon: 'color-palette-outline', title: 'Premium Themes', desc: 'Customize your app with beautiful themes' },
    { icon: 'shield-checkmark-outline', title: 'Secure & Private', desc: 'Your data is encrypted and protected' },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>About</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* App Logo Section */}
        <View style={[styles.logoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primaryBg }]}>
            <Text style={styles.logoEmoji}>💰</Text>
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>ExpenseIQ</Text>
          <Text style={[styles.version, { color: theme.gray }]}>Version 1.0.0</Text>
          <Text style={[styles.tagline, { color: theme.primary }]}>Your Smart Finance Companion</Text>
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What is ExpenseIQ?</Text>
          <Text style={[styles.desc, { color: theme.gray }]}>
            ExpenseIQ is a powerful personal finance management app designed to help you take full control of your money. Track every transaction, set savings goals, analyze spending patterns, and get AI-powered financial advice — all in one beautiful app.
          </Text>
        </View>

        {/* Features */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Features</Text>
          {features.map((f, i) => (
            <View key={i} style={[styles.featureRow, i < features.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: theme.primaryBg }]}>
                <Ionicons name={f.icon as any} size={20} color={theme.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: theme.gray }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tech Stack */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Built With</Text>
          <View style={styles.techRow}>
            {['React Native', 'Expo', 'MongoDB', 'Node.js'].map((tech, i) => (
              <View key={i} style={[styles.techBadge, { backgroundColor: theme.primaryBg }]}>
                <Text style={[styles.techText, { color: theme.primary }]}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: theme.gray }]}>Made with ❤️ for smarter finances</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex1: { flex: 1 },
  scrollContent: { padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  logoCard: { alignItems: 'center', padding: 32, borderRadius: 28, borderWidth: 1, marginBottom: 20 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  version: { fontSize: 14, marginBottom: 8 },
  tagline: { fontSize: 15, fontWeight: '600' },
  card: { padding: 24, borderRadius: 28, borderWidth: 1, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  desc: { fontSize: 15, lineHeight: 22 },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  featureTitle: { fontSize: 15, fontWeight: '600' },
  featureDesc: { fontSize: 12, marginTop: 2 },
  techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  techBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  techText: { fontSize: 13, fontWeight: 'bold' },
  footer: { textAlign: 'center', fontSize: 13, marginTop: 8 },
});
