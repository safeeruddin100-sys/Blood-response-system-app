import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/constants/theme';

export default function AuthLayout() {
  const C = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp-verify" />
    </Stack>
  );
}
