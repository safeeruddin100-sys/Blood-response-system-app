/**
 * Theme system for Blood Response System.
 *
 * Usage in any component:
 *   const C = useTheme();
 *   // then use C.primary, C.background, C.textPrimary, etc.
 *
 * The hook reads the user's preferred theme from authStore and automatically
 * falls back to the device's system appearance when the preference is 'system'.
 */

import { useColorScheme } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { lightColors, darkColors, ColorPalette } from '@/constants/colors';

/**
 * Returns the active colour palette (light or dark) based on:
 *  1. User's explicit preference stored in authStore (light / dark)
 *  2. Device system preference when user chose 'system' (default)
 */
export function useTheme(): ColorPalette {
  const { themeMode } = useAuthStore();
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  if (themeMode === 'dark') return darkColors;
  if (themeMode === 'light') return lightColors;

  // 'system' (default) — follow the OS setting
  return systemScheme === 'dark' ? darkColors : lightColors;
}

/** Returns true when the active theme is dark. */
export function useIsDark(): boolean {
  const { themeMode } = useAuthStore();
  const systemScheme = useColorScheme();
  if (themeMode === 'dark') return true;
  if (themeMode === 'light') return false;
  return systemScheme === 'dark';
}

export type ThemeMode = 'light' | 'dark' | 'system';
