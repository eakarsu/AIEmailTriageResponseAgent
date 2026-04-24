import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings } from '../services/api';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await getSettings();
        const savedTheme = settings?.theme || 'light';
        applyTheme(savedTheme);
      } catch (error) {
        // If not logged in or error, use light theme
        applyTheme('light');
      }
      setIsReady(true);
    };

    loadTheme();
  }, []);

  const applyTheme = (newTheme) => {
    let effectiveTheme = newTheme;

    if (newTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    setTheme(newTheme);

    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const updateTheme = (newTheme) => {
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, isReady }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
