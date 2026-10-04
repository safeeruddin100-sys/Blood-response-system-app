import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'blood' | 'critical' | 'normal' | 'success' | 'warning' | 'neutral';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', style }) => {
  const C = useTheme();

  const getBadgeStyle = () => {
    switch (variant) {
      case 'blood':
        return {
          bg: C.bloodGroup.bg,
          text: C.bloodGroup.text,
          border: C.bloodGroup.border,
        };
      case 'critical':
        return {
          bg: C.emergencyLight,
          text: C.emergency,
          border: C.emergencyBorder,
        };
      case 'success':
        return {
          bg: C.successLight,
          text: C.success,
          border: C.success,
        };
      case 'warning':
        return {
          bg: C.warningLight,
          text: C.warning,
          border: C.warning,
        };
      default:
        return {
          bg: C.mutedLight,
          text: C.textSecondary,
          border: C.border,
        };
    }
  };

  const current = getBadgeStyle();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: current.bg, borderColor: current.border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: current.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
