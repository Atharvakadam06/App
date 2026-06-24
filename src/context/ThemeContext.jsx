import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const { user, updateProfile } = useAuth() || {};
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('stugrow-theme');
    return saved ? saved === 'dark' : false;
  });

  // Sync theme when user object loads from database
  useEffect(() => {
    if (user?.settings?.theme) {
      const dbDark = user.settings.theme === 'dark';
      if (dbDark !== darkMode) {
        setDarkMode(dbDark);
      }
    }
  }, [user?.id, user?.settings?.theme]);

  // Apply theme class to document and save to localStorage
  useEffect(() => {
    localStorage.setItem('stugrow-theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = async () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    const themeName = nextMode ? 'dark' : 'light';
    
    // Save to DB if user is logged in
    if (user?.id && updateProfile) {
      try {
        const updatedSettings = {
          ...(user.settings || {}),
          theme: themeName
        };
        await updateProfile({ settings: JSON.stringify(updatedSettings) });
      } catch (e) {
        console.warn('Failed to save theme preference in database:', e);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
