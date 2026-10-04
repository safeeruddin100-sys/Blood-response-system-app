/**
 * Color Palette for The Blood Response System
 * Designed for a calm, trustworthy health/emergency nonprofit context (Alkhidmat Foundation).
 * Red/Crimson (#DC2626) is used SPARINGLY for critical emergencies only.
 *
 * Both light and dark palettes share the same key structure so every component
 * can swap them at runtime without any structural change.
 */

// ─── Semantic colour tokens (same keys in both palettes) ─────────────────────

export interface ColorPalette {
  // Brand
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryBorder: string;
  // Secondary
  secondary: string;
  secondaryLight: string;
  // Emergency / urgency
  emergency: string;
  emergencyLight: string;
  emergencyBorder: string;
  // Status
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  muted: string;
  mutedLight: string;
  // Surfaces
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderLight: string;
  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  // Blood group badge
  bloodGroup: { bg: string; text: string; border: string };
}

// ─── Light palette ────────────────────────────────────────────────────────────
export const lightColors: ColorPalette = {
  primary: '#0057A0',
  primaryDark: '#003D70',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',

  secondary: '#0284C7',
  secondaryLight: '#E0F2FE',

  emergency: '#DC2626',
  emergencyLight: '#FEF2F2',
  emergencyBorder: '#FCA5A5',

  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#0284C7',
  infoLight: '#E0F2FE',
  muted: '#64748B',
  mutedLight: '#F1F5F9',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  bloodGroup: { bg: '#FEF2F2', text: '#991B1B', border: '#FECDD3' },
};

// ─── Dark palette ─────────────────────────────────────────────────────────────
export const darkColors: ColorPalette = {
  primary: '#3B82F6',       // Brighter blue — readable on dark surfaces
  primaryDark: '#93C5FD',   // Soft light-blue for headings in dark mode
  primaryLight: '#1E3A5F',  // Darker tint for subtle highlights
  primaryBorder: '#2563EB',

  secondary: '#38BDF8',
  secondaryLight: '#0C4A6E',

  emergency: '#F87171',     // Softer red — still urgent but not harsh on OLED
  emergencyLight: '#3B1A1A',
  emergencyBorder: '#991B1B',

  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#451A03',
  info: '#38BDF8',
  infoLight: '#0C4A6E',
  muted: '#94A3B8',
  mutedLight: '#1E293B',

  background: '#0F172A',    // Slate 900
  surface: '#1E293B',       // Slate 800
  surfaceElevated: '#334155', // Slightly lighter card elevation
  border: '#334155',
  borderLight: '#1E293B',

  textPrimary: '#F1F5F9',   // Near-white — high contrast on dark bg
  textSecondary: '#CBD5E1', // Slate 300
  textMuted: '#64748B',     // Slate 500
  textInverse: '#0F172A',

  bloodGroup: { bg: '#3B1A1A', text: '#FCA5A5', border: '#991B1B' },
};

// ─── Legacy export — keeps existing `import { Colors } from '@/constants/colors'`
// working unchanged while we migrate to the theme system.
// After full migration this can be removed.
export const Colors = lightColors;
