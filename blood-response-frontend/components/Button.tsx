import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'emergency' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const C = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'emergency':
        return {
          backgroundColor: C.emergency,
          shadowColor: C.emergency,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 4,
        };
      case 'secondary':
        return { backgroundColor: C.secondary };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: C.primary,
        };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      default:
        return {
          backgroundColor: C.primary,
          shadowColor: C.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'outline':
        return C.primary;
      case 'ghost':
        return C.textSecondary;
      default:
        return C.textInverse;
    }
  };

  const spinnerColor = variant === 'outline' || variant === 'ghost' ? C.primary : C.textInverse;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        getVariantStyle(),
        size === 'large' ? styles.large : size === 'small' ? styles.small : styles.medium,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.baseText, { color: getTextColor() }, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  medium: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  large: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
});
