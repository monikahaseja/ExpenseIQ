import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Image, Animated, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'ExpenseIQ',
    description: 'Master your finances with ease. Take control of your spending and grow your wealth.',
    image: require('../assets/images/onboarding_welcome.png'),
    isWelcome: true,
  },
  {
    id: '2',
    title: 'Track Transactions',
    subtitle: 'Stay on Top of Your Cash',
    description: 'Log expenses and income effortlessly. Categorize your spending to see where your money goes.',
    image: require('../assets/images/onboarding_track.png'),
  },
  {
    id: '3',
    title: 'Smart Analytics',
    subtitle: 'Visualize Your Wealth',
    description: 'Insightful charts and spending patterns help you understand your financial health at a glance.',
    image: require('../assets/images/onboarding_analytics.png'),
  },
  {
    id: '4',
    title: 'Savings Goals',
    subtitle: 'Reach Your Milestones',
    description: 'Set targets for what matters most. Track your progress and celebrate every milestone reached.',
    image: { uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png' },
  },
  {
    id: '5',
    title: 'AI Advisor',
    subtitle: 'Personalized Financial IQ',
    description: 'Get smart tips and personalized insights from your AI assistant to optimize your savings.',
    image: { uri: 'https://cdn-icons-png.flaticon.com/512/2103/2103633.png' },
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, themeName } = useTheme();

  const isDark = themeName !== 'light' && themeName !== 'tropical';
  const statusBarStyle = isDark ? 'light-content' : 'dark-content';

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const finishOnboarding = async () => {
    try {
      await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
      router.replace('/');
    } catch (error) {
      console.error('Error saving onboarding state:', error);
      router.replace('/');
    }
  };

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0], index: number }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.imageContainer}>
          <View style={[styles.windowFrame, { backgroundColor: theme.card, borderColor: theme.border }]}>
             {item.isWelcome ? (
                <Image source={item.image} style={styles.logoImage} resizeMode="contain" />
             ) : (
                <Image source={item.image} style={styles.slideImage} resizeMode="contain" />
             )}
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
          {item.subtitle && <Text style={[styles.subtitle, { color: theme.primary }]}>{item.subtitle}</Text>}
          <Text style={[styles.description, { color: theme.gray }]}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={statusBarStyle} />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {currentIndex > 0 ? (
            <TouchableOpacity onPress={() => flatListRef.current?.scrollToIndex({ index: currentIndex - 1 })}>
              <Ionicons name="chevron-back" size={28} color={theme.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 28 }} />
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleSkip}>
            <Text style={[styles.skipText, { color: theme.gray }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 20, 10],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={index}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: theme.primary }]}
              />
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }, currentIndex === SLIDES.length - 1 ? styles.getStartedBtn : {}]} 
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          {currentIndex === SLIDES.length - 1 && <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  skipText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  imageContainer: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  windowFrame: {
    width: width * 0.8,
    height: width * 0.9,
    backgroundColor: '#111',
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  logoImage: {
    width: '60%',
    height: '60%',
  },
  slideImage: {
    width: '80%',
    height: '80%',
  },
  textContainer: {
    flex: 0.4,
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  button: {
    height: 60,
    backgroundColor: '#3498db',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  getStartedBtn: {
    backgroundColor: '#2980b9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
