import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../constants/colors';

type ThemeName = keyof typeof Colors;

interface ThemeContextType {
  themeName: ThemeName;
  theme: typeof Colors.light;
  setTheme: (name: ThemeName) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colorScheme } = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>((colorScheme as ThemeName) || 'light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync('userTheme');
      if (savedTheme && Colors[savedTheme as ThemeName]) {
        setThemeName(savedTheme as ThemeName);
      } else {
        setThemeName((colorScheme as ThemeName) || 'light');
      }
    } catch (e) {
      console.error('Failed to load theme', e);
    }
  };

  const setTheme = async (name: ThemeName) => {
    try {
      await SecureStore.setItemAsync('userTheme', name);
      setThemeName(name);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  // Sync with nativewind colorScheme if it changes and we are in light/dark mode
  useEffect(() => {
    if (themeName === 'light' || themeName === 'dark') {
      setThemeName((colorScheme as ThemeName) || 'light');
    }
  }, [colorScheme]);

  const value = {
    themeName,
    theme: Colors[themeName],
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
