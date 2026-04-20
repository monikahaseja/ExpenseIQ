import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function HelpCenterScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const faqs = [
    { q: 'How do I add a transaction?', a: 'Tap the "+" button on the Home screen. Fill in the title, amount, category, and type (income/expense), then save.' },
    { q: 'How do I set a budget?', a: 'Go to Settings → Cash Flow & Budget section. Set your monthly spending limit and track your progress.' },
    { q: 'How do I create a savings goal?', a: 'Navigate to the Goals tab and tap "+". Enter your goal name, target amount, and optional initial amount.' },
    { q: 'Can I change the app theme?', a: 'Yes! Go to Settings → Personalize Theme and choose from 6 beautiful themes including Electric, Neon, Cyber, and Tropical.' },
    { q: 'How does the AI Advisor work?', a: 'The AI Advisor analyzes your spending patterns locally on your device and provides personalized financial tips. No data is sent externally.' },
    { q: 'How do I export my data?', a: 'Go to the Analytics tab and tap "Export PDF" to download a summary of your financial data.' },
    { q: 'Is my data safe?', a: 'Absolutely. All data is encrypted, passwords are hashed, and we never share your financial information with anyone.' },
    { q: 'How do I delete my account?', a: 'Contact us at support@expenseiq.app and we will process your request within 48 hours.' },
  ];

  const contactOptions = [
    { icon: 'mail-outline', label: 'Email Support', value: 'support@expenseiq.app', onPress: () => Linking.openURL('mailto:support@expenseiq.app') },
    { icon: 'chatbubble-outline', label: 'Live Chat', value: 'Available 9 AM - 6 PM IST', onPress: () => {} },
    { icon: 'call-outline', label: 'Phone', value: '+91 98765 43210', onPress: () => Linking.openURL('tel:+919876543210') },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Help Center</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Search-like Banner */}
        <View style={[styles.banner, { backgroundColor: theme.primaryBg, borderColor: theme.border }]}>
          <Ionicons name="help-buoy" size={36} color={theme.primary} />
          <Text style={[styles.bannerTitle, { color: theme.primary }]}>How can we help?</Text>
          <Text style={[styles.bannerDesc, { color: theme.gray }]}>
            Find answers to common questions or reach out to our support team.
          </Text>
        </View>

        {/* FAQs */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
          {faqs.map((faq, i) => (
            <View key={i} style={[styles.faqItem, i < faqs.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={styles.faqQ}>
                <View style={[styles.qBadge, { backgroundColor: theme.primaryBg }]}>
                  <Text style={[styles.qText, { color: theme.primary }]}>Q</Text>
                </View>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.q}</Text>
              </View>
              <Text style={[styles.faqAnswer, { color: theme.gray }]}>{faq.a}</Text>
            </View>
          ))}
        </View>

        {/* Contact Us */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Us</Text>
          {contactOptions.map((opt, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.contactRow, i < contactOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              onPress={opt.onPress}
            >
              <View style={[styles.contactIcon, { backgroundColor: theme.primaryBg }]}>
                <Ionicons name={opt.icon as any} size={20} color={theme.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.contactLabel, { color: theme.text }]}>{opt.label}</Text>
                <Text style={[styles.contactValue, { color: theme.gray }]}>{opt.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.tabIconDefault} />
            </TouchableOpacity>
          ))}
        </View>

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
  banner: { alignItems: 'center', padding: 28, borderRadius: 28, borderWidth: 1, marginBottom: 20 },
  bannerTitle: { fontSize: 22, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  bannerDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  card: { padding: 24, borderRadius: 28, borderWidth: 1, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  faqItem: { paddingVertical: 16 },
  faqQ: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  qBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  qText: { fontWeight: '900', fontSize: 14 },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: '600' },
  faqAnswer: { fontSize: 14, lineHeight: 20, paddingLeft: 38 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  contactIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  contactLabel: { fontSize: 15, fontWeight: '600' },
  contactValue: { fontSize: 12, marginTop: 2 },
});
