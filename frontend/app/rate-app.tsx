import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../components/NotificationContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import api from '../utils/api';

export default function RateAppScreen() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();

  const [selectedRating, setSelectedRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [avgRating, setAvgRating] = useState('0');
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    fetchExistingRating();
    fetchStats();
  }, []);

  const fetchExistingRating = async () => {
    try {
      const res = await api.get('/ratings');
      if (res.data.data) {
        setSelectedRating(res.data.data.rating);
        setFeedback(res.data.data.feedback || '');
        setSubmitted(true);
      }
    } catch (e) { /* no existing rating */ }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/ratings/stats');
      setAvgRating(res.data.data.avgRating);
      setTotalRatings(res.data.data.totalRatings);
    } catch (e) { /* ignore */ }
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      Alert.alert('Select Rating', 'Please tap a star to rate the app');
      return;
    }
    setLoading(true);
    try {
      await api.post('/ratings', { rating: selectedRating, feedback });
      setSubmitted(true);
      showNotification('Thank you for your rating! ⭐', 'success');
      fetchStats();
    } catch (e) {
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
  const ratingEmojis = ['', '😞', '😐', '🙂', '😊', '🤩'];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Rate App</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Community Stats */}
        <View style={[styles.statsCard, { backgroundColor: theme.primaryBg, borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>⭐ {avgRating}</Text>
            <Text style={[styles.statLabel, { color: theme.gray }]}>Avg Rating</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>{totalRatings}</Text>
            <Text style={[styles.statLabel, { color: theme.gray }]}>Total Ratings</Text>
          </View>
        </View>

        {/* Rating Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {submitted && (
            <View style={[styles.updatedBadge, { backgroundColor: theme.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.success} />
              <Text style={[styles.updatedText, { color: theme.success }]}>
                {submitted ? 'You can update your rating anytime' : ''}
              </Text>
            </View>
          )}

          <Text style={[styles.ratingPrompt, { color: theme.text }]}>
            {selectedRating > 0 ? ratingEmojis[selectedRating] : '⭐'}
          </Text>
          <Text style={[styles.ratingLabel, { color: theme.text }]}>
            {selectedRating > 0 ? ratingLabels[selectedRating] : 'How would you rate ExpenseIQ?'}
          </Text>

          {/* Star Selector */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setSelectedRating(star)} style={styles.starBtn}>
                <Ionicons
                  name={star <= selectedRating ? 'star' : 'star-outline'}
                  size={44}
                  color={star <= selectedRating ? '#FBBF24' : theme.tabIconDefault}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Feedback Input */}
          <Text style={[styles.feedbackLabel, { color: theme.gray }]}>Tell us more (optional)</Text>
          <TextInput
            style={[styles.feedbackInput, { color: theme.text, backgroundColor: theme.lightGray, borderColor: theme.border }]}
            placeholder="What do you love? What can we improve?"
            placeholderTextColor={theme.gray}
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Ionicons name={submitted ? 'refresh' : 'send'} size={20} color="#fff" />
            <Text style={styles.submitText}>{loading ? 'Submitting...' : submitted ? 'Update Rating' : 'Submit Rating'}</Text>
          </TouchableOpacity>
        </View>

        {/* Why Rate */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.whyTitle, { color: theme.text }]}>Why Rate?</Text>
          {[
            { icon: 'heart-outline', text: 'Help us understand what you love about ExpenseIQ' },
            { icon: 'construct-outline', text: 'Your feedback directly shapes future updates' },
            { icon: 'people-outline', text: 'Help other users discover the app' },
          ].map((item, i) => (
            <View key={i} style={styles.whyRow}>
              <Ionicons name={item.icon as any} size={20} color={theme.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.whyText, { color: theme.gray }]}>{item.text}</Text>
            </View>
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
  statsCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 28, borderWidth: 1, marginBottom: 20 },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 28, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  statDivider: { width: 1, height: 40 },
  card: { padding: 24, borderRadius: 28, borderWidth: 1, marginBottom: 20 },
  updatedBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, marginBottom: 16 },
  updatedText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  ratingPrompt: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  ratingLabel: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  starBtn: { padding: 4 },
  feedbackLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  feedbackInput: { borderWidth: 1, borderRadius: 20, padding: 16, fontSize: 15, minHeight: 100 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, marginTop: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  whyTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 16 },
  whyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  whyText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
