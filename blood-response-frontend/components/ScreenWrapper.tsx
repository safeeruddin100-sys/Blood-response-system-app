import React from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ScrollView,
  ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/constants/theme';

export type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

export interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Which edges to apply safe area insets to.
   * Default: ['top', 'bottom']
   */
  edges?: SafeAreaEdge[];
  /**
   * Screen background color. Defaults to theme C.background.
   */
  backgroundColor?: string;
  /**
   * Background color of the top safe area inset (status bar area).
   * Defaults to backgroundColor. Useful to pass C.surface when screen has a custom Header.
   */
  topInsetBg?: string;
  /**
   * Whether to wrap the screen in a ScrollView. Default: false.
   */
  scrollable?: boolean;
  /**
   * Optional ScrollView props when scrollable is true.
   */
  scrollViewProps?: Partial<ScrollViewProps>;
}

/**
 * ScreenWrapper provides consistent, app-wide safe area spacing.
 * Ensures notch, status bar, and bottom gesture indicators have proper breathing room
 * without doubling up spacing on screens with custom or native headers.
 */
export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  contentContainerStyle,
  edges = ['top', 'bottom'],
  backgroundColor,
  topInsetBg,
  scrollable = false,
  scrollViewProps,
}) => {
  const insets = useSafeAreaInsets();
  const C = useTheme();

  const bg = backgroundColor ?? C.background;
  const topBg = topInsetBg ?? bg;

  const hasTop = edges.includes('top');
  const hasBottom = edges.includes('bottom');
  const hasLeft = edges.includes('left');
  const hasRight = edges.includes('right');

  const topInset = hasTop ? insets.top : 0;
  const bottomInset = hasBottom ? insets.bottom : 0;
  const leftInset = hasLeft ? insets.left : 0;
  const rightInset = hasRight ? insets.right : 0;

  if (scrollable) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bg,
            paddingLeft: leftInset,
            paddingRight: rightInset,
          },
          style,
        ]}
      >
        {topInset > 0 && <View style={{ height: topInset, backgroundColor: topBg }} />}
        <ScrollView
          style={{ flex: 1, backgroundColor: bg }}
          contentContainerStyle={[
            {
              paddingBottom: Math.max(bottomInset, 16),
            },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          paddingBottom: bottomInset,
          paddingLeft: leftInset,
          paddingRight: rightInset,
        },
        style,
      ]}
    >
      {topInset > 0 && <View style={{ height: topInset, backgroundColor: topBg }} />}
      <View style={[styles.content, { backgroundColor: bg }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
