import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/colors';
import Ionicons from '@expo/vector-icons/Ionicons';

const THEMES = [
  { id: 'light', name: 'Light', icon: 'sunny' },
  { id: 'dark', name: 'Dark', icon: 'moon' },
  { id: 'electric', name: 'Electric', icon: 'flash' },
  { id: 'neon', name: 'Neon', icon: 'heart' },
  { id: 'cyber', name: 'Cyber', icon: 'game-controller' },
  { id: 'tropical', name: 'Tropical', icon: 'leaf' },
] as const;

export const ThemeSwitcher: React.FC = () => {
  const { themeName, theme, setTheme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Personalize Theme</Text>
      <View style={styles.grid}>
        {THEMES.map((t) => {
          const isSelected = themeName === t.id;
          const tc = Colors[t.id];

          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTheme(t.id)}
              style={[
                styles.themeCard,
                {
                  backgroundColor: tc.background,
                  borderColor: isSelected ? tc.primary : tc.border,
                  borderWidth: isSelected ? 2.5 : 1.5,
                },
              ]}
            >
              {/* Color preview strip */}
              <View style={[styles.previewStrip, { backgroundColor: tc.primaryBg }]}>
                <View style={[styles.iconCircle, { backgroundColor: tc.primary }]}>
                  <Ionicons name={t.icon as any} size={18} color="#fff" />
                </View>
              </View>

              {/* Theme name + check */}
              <View style={styles.labelRow}>
                <Text style={[styles.themeName, { color: tc.text }]}>{t.name}</Text>
                {isSelected && (
                  <View style={[styles.checkDot, { backgroundColor: tc.primary }]}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    opacity: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '30.5%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  previewStrip: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  themeName: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
