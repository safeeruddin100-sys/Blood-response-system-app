import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en } from '@/constants/i18n/en';
import { ur } from '@/constants/i18n/ur';

export type Language = 'en' | 'ur';
export type ThemeMode = 'light' | 'dark' | 'system';

interface User {
  id: number;
  phone: string;
  full_name: string;
  role: 'donor' | 'requester' | 'admin';
  is_verified: boolean;
  consent_given: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  language: Language;
  t: typeof en;
  // ── Issue 2: theme preference ─────────────────────────────────────────────
  themeMode: ThemeMode;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: User | null) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setTheme: (mode: ThemeMode) => Promise<void>;
  logout: () => Promise<void>;
  hydrateAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  language: 'en',
  t: en,
  themeMode: 'system', // default: follow the OS

  setTokens: async (accessToken: string, refreshToken: string) => {
    set({ accessToken, refreshToken });
    try {
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
    } catch (e) {
      console.warn('Failed to save tokens to storage', e);
    }
  },

  setUser: async (user: User | null) => {
    set({ user });
    try {
      if (user) {
        await AsyncStorage.setItem('user_profile', JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem('user_profile');
      }
    } catch (e) {
      console.warn('Failed to save user to storage', e);
    }
  },

  setLanguage: async (language: Language) => {
    const t = language === 'ur' ? ur : en;
    set({ language, t });
    try {
      await AsyncStorage.setItem('app_language', language);
    } catch (e) {
      console.warn('Failed to save language', e);
    }
  },

  // ── Issue 2: persist theme choice to AsyncStorage ────────────────────────
  setTheme: async (themeMode: ThemeMode) => {
    set({ themeMode });
    try {
      await AsyncStorage.setItem('app_theme', themeMode);
    } catch (e) {
      console.warn('Failed to save theme', e);
    }
  },

  logout: async () => {
    set({ user: null, accessToken: null, refreshToken: null });
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_profile']);
    } catch (e) {
      console.warn('Failed to clear storage on logout', e);
    }
  },

  hydrateAuth: async () => {
    try {
      const [accessToken, refreshToken, userJson, lang, theme] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('refresh_token'),
        AsyncStorage.getItem('user_profile'),
        AsyncStorage.getItem('app_language'),
        AsyncStorage.getItem('app_theme'),
      ]);

      // Restore cached user as a fast first-paint snapshot so the app renders
      // immediately without waiting for a network round-trip.
      const cachedUser = userJson ? JSON.parse(userJson) : null;
      const language = (lang === 'ur' ? 'ur' : 'en') as Language;
      const t = language === 'ur' ? ur : en;
      const themeMode = (['light', 'dark', 'system'].includes(theme as string)
        ? theme
        : 'system') as ThemeMode;

      set({
        accessToken,
        refreshToken,
        user: cachedUser,
        language,
        t,
        themeMode,
        isLoading: false,
      });

      // ─── FIX: Issue 1 — Data Persistence ─────────────────────────────────
      // If a valid access token exists, fetch the LIVE user profile from the
      // backend so that on every app restart we sync from the real database
      // (MongoDB Atlas), not from the potentially stale AsyncStorage cache.
      //
      // We do this AFTER setting isLoading=false so the UI renders immediately
      // from the cached snapshot and then silently updates to fresh data.
      // ─────────────────────────────────────────────────────────────────────
      if (accessToken) {
        try {
          // Lazy import avoids a circular dependency at module init time
          // (api.ts reads from useAuthStore which is defined in this file).
          const { Api } = await import('@/services/api');
          const meRes = await Api.getMe();
          const freshUser = meRes.data as User;
          // Persist the fresh profile back to AsyncStorage so the NEXT
          // restart also shows up-to-date data even while offline.
          set({ user: freshUser });
          await AsyncStorage.setItem('user_profile', JSON.stringify(freshUser));
        } catch (e) {
          // The Axios response interceptor in api.ts will automatically attempt
          // a token refresh on 401. If that also fails it calls logout(), which
          // clears state. We only warn here so existing UI remains visible.
          console.warn('Could not refresh user profile from API on startup:', e);
        }
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },
}));
