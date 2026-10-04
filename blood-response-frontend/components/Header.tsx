import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLanguageToggle?: boolean;
  showThemeToggle?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showLanguageToggle = true,
  showThemeToggle = true,
}) => {
  const { language, setLanguage, themeMode, setTheme, t } = useAuthStore();
  const C = useTheme();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  };

  // Cycle: system → light → dark → system
  const cycleTheme = () => {
    if (themeMode === 'system') setTheme('light');
    else if (themeMode === 'light') setTheme('dark');
    else setTheme('system');
  };

  const themeIcon =
    themeMode === 'dark' ? 'moon' :
    themeMode === 'light' ? 'sunny' :
    'contrast-outline'; // 'system'

  return (
    <View style={[styles.container, {
      backgroundColor: C.surface,
      borderBottomColor: C.borderLight,
    }]}>
      <View style={styles.titleContainer}>
        <View style={styles.brandRow}>
          <Image
            source={require('../assets/alkhidmat-logo.png')}
            style={styles.logoImage}
            accessibilityLabel="Alkhidmat Foundation Pakistan Logo"
          />
          <View style={styles.brandTextCol}>
            <Text style={[styles.appName, { color: C.primaryDark }]}>
              {title || t.appName}
            </Text>
            <Text style={[styles.orgTag, { color: C.primary }]}>
              Alkhidmat Foundation Pakistan
            </Text>
          </View>
        </View>
        {subtitle && <Text style={[styles.subtitle, { color: C.textMuted }]}>{subtitle}</Text>}
      </View>

      <View style={styles.rightControls}>
        {/* ── Issue 2: Theme toggle ── */}
        {showThemeToggle && (
          <TouchableOpacity
            onPress={cycleTheme}
            activeOpacity={0.7}
            style={[styles.iconButton, {
              backgroundColor: C.primaryLight,
              borderColor: C.primaryBorder,
            }]}
            accessibilityLabel="Toggle dark mode"
            accessibilityHint="Cycles between system, light, and dark theme"
          >
            <Ionicons name={themeIcon as any} size={16} color={C.primary} />
          </TouchableOpacity>
        )}

        {showLanguageToggle && (
          <TouchableOpacity
            onPress={toggleLanguage}
            activeOpacity={0.7}
            style={[styles.langButton, {
              backgroundColor: C.primaryLight,
              borderColor: C.primaryBorder,
            }]}
          >
            <Text style={[styles.langText, { color: C.primary }]}>
              {language === 'en' ? 'اردو' : 'EN'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0057A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    resizeMode: 'contain',
  },
  brandTextCol: {
    flexDirection: 'column',
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  orgTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  langText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
