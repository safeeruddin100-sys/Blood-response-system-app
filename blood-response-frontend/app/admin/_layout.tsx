import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/constants/theme';

export default function AdminLayout() {
  const C = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: 'Admin Moderation',
        headerTintColor: C.textPrimary,
        headerStyle: { backgroundColor: C.surface },
        contentStyle: { backgroundColor: C.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Admin Dashboard' }} />
    </Stack>
  );
}
