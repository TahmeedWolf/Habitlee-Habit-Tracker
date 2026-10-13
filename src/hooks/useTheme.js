import { useState, useEffect, useCallback } from 'react';
import { Capacitor, SystemBars } from '@capacitor/core';

const STORAGE_KEY = 'habitlee:theme';
const BAR_COLOR = { dark: '#0B0E14', light: '#FAF7F2' };

export function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // storage blocked — fall back to the OS preference
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BAR_COLOR[theme]);

  // Statically imported — see the note in useReminder.js about dynamic
  // imports stalling behind Vite's crossorigin modulepreload under
  // Capacitor's local server. On the web the native check is simply false.
  try {
    if (Capacitor?.isNativePlatform?.()) {
      SystemBars?.setStyle?.({ style: theme === 'dark' ? 'DARK' : 'LIGHT' });
    }
  } catch {
    // system bar tint is cosmetic — never let it break the theme switch
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // preference just won't persist this session
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
