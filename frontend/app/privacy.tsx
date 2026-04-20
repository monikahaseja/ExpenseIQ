import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function PrivacyScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const sections = [
    {
      icon: 'shield-checkmark-outline',
      title: 'Data Protection',
      items: [
        'All financial data is encrypted at rest and in transit',
        'Passwords are hashed using bcrypt with salt rounds',
        'JWT tokens are used for secure session management',
        'No financial data is ever shared with third parties',
      ]
    },
    {
      icon: 'server-outline',
      title: 'Data Storage',
      items: [
        'Data is stored on your personal MongoDB database',
        'Profile photos are securely uploaded and stored',
        'Transaction history is maintained per-user basis',
        'You can delete your data at any time',
      ]
    },
    {
      icon: 'eye-off-outline',
      title: 'Privacy Controls',
      items: [
        'No tracking or analytics cookies are used',
        'Your spending patterns are never sold or shared',
        'AI Advisor runs locally — no data sent externally',
        'You have full control over your notification settings',
      ]
    },
    {
      icon: 'finger-print-outline',
      title: 'Account Security',
      items: [
        'Change your password at any time from Settings',
        'Sessions expire after extended inactivity',
        'All API endpoints require authentication',
        'Cookie-based token storage for added security',
      ]
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy & Security</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Top Banner */}
        <View style={[styles.banner, { backgroundColor: theme.primaryBg, borderColor: theme.border }]}>
          <Ionicons name="lock-closed" size={32} color={theme.primary} />
          <Text style={[styles.bannerTitle, { color: theme.primary }]}>Your Data is Protected</Text>
          <Text style={[styles.bannerDesc, { color: theme.gray }]}>
            We take your privacy seriously. Here's how we keep your financial data safe and secure.
          </Text>
        </View>

        {/* Sections */}
        {sections.map((section, i) => (
          <View key={i} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: theme.primaryBg }]}>
                <Ionicons name={section.icon as any} size={22} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
            </View>
            {section.items.map((item, j) => (
              <View key={j} style={styles.itemRow}>
                <Ionicons name="checkmark-circle" size={18} color={theme.success} style={{ marginRight: 12, marginTop: 2 }} />
                <Text style={[styles.itemText, { color: theme.gray }]}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Contact */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.contactTitle, { color: theme.text }]}>Questions?</Text>
          <Text style={[styles.contactDesc, { color: theme.gray }]}>
            If you have any privacy concerns or questions about how your data is handled, reach out to us at{' '}
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>privacy@expenseiq.app</Text>
          </Text>
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
  bannerTitle: { fontSize: 20, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  bannerDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  card: { padding: 24, borderRadius: 28, borderWidth: 1, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  itemText: { flex: 1, fontSize: 14, lineHeight: 20 },
  contactTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  contactDesc: { fontSize: 14, lineHeight: 20 },
});
