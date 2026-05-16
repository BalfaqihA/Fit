import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';

// Hard route guard. Children never mount until the admin claim is confirmed,
// so there is no flash of admin UI. This is defense-in-depth — the real
// security boundary is `assertAdmin` inside every admin Cloud Function.
export default function AdminLayout() {
  const { loading, isAdmin } = useAdmin();
  const { COLORS } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.bg,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
