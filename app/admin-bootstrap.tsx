import { Redirect, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminButton, Field } from '@/components/admin/admin-kit';
import { BackButton } from '@/components/back-button';
import { type Palette } from '@/constants/design';
import { useAdmin } from '@/hooks/use-admin';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';

// One-time owner bootstrap entry. Lives OUTSIDE the /admin guard (you can't be
// an admin to grant yourself admin). Gated to dev builds — production users
// hitting the route get redirected home so the form is never reachable from a
// shipped build, even before the route is removed.
export default function AdminBootstrap() {
  const { user, initializing } = useAuth();
  const { refresh } = useAdmin();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);

  // Production builds: the bootstrap secret form must not be reachable.
  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }

  if (initializing) return null;
  if (!user) return <Redirect href="/auth/login" />;

  const submit = async () => {
    if (!secret.trim()) {
      Alert.alert('Required', 'Enter the bootstrap secret.');
      return;
    }
    setBusy(true);
    try {
      const res = await adminApi.bootstrapOwner(secret.trim());
      await refresh();
      Alert.alert('Success', res.message, [
        { text: 'Open Admin', onPress: () => router.replace('/admin' as never) },
      ]);
    } catch (e) {
      Alert.alert(
        'Bootstrap failed',
        e instanceof Error ? e.message : 'Unknown error.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Owner Bootstrap</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.note}>
          One-time setup. Grants the owner admin claim to{' '}
          <Text style={{ fontWeight: '800' }}>{user.email}</Text> if it matches
          the designated owner. Requires the deploy-time bootstrap secret.
        </Text>
        <Field
          label="BOOTSTRAP SECRET"
          value={secret}
          onChangeText={setSecret}
          placeholder="paste secret"
        />
        <AdminButton
          label={busy ? 'Working…' : 'Grant owner access'}
          onPress={submit}
          disabled={busy}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    body: { padding: 16, gap: 8 },
    note: { fontSize: 14, color: COLORS.muted, marginBottom: 12, lineHeight: 20 },
  });
