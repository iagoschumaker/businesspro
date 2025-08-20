<<<<<<< HEAD
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
=======
import React, { createContext, useContext, useEffect } from 'react';

interface ThemeContextType {
  isDark: boolean;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

<<<<<<< HEAD
const getInitialTheme = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('theme');
    if (saved === 'true' || saved === 'false') {
      return saved === 'true';
    }
  }
  return false;
};

=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
<<<<<<< HEAD
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('theme', String(isDark));
    }
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
=======
  // Forçando o tema escuro sempre
  const isDark = true;

  useEffect(() => {
    // Salvando o tema escuro no localStorage
    localStorage.setItem('theme', JSON.stringify(true));
    // Aplicando a classe dark ao documento
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark }}>
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      {children}
    </ThemeContext.Provider>
  );
};