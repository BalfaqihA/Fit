import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  Card,
  Chip,
  Field,
  StateBlock,
} from '@/components/admin/admin-kit';
import { type Palette } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';

const ROLES = ['admin', 'moderator', 'analyst', 'owner'];

export default function AdminRoles() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('moderator');
  const [busy, setBusy] = useState(false);
  const [rolesMap, setRolesMap] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await adminApi.settings.get();
      setRolesMap(s.roles ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grant = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Enter the user email.');
      return;
    }
    setBusy(true);
    try {
      await adminApi.roles.set({ email: email.trim(), role });
      Alert.alert('Done', `Granted ${role} to ${email.trim()}.`);
      setEmail('');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = (uid: string) =>
    Alert.alert('Revoke', `Remove admin from ${uid}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminApi.roles.remove(uid);
            await load();
          } catch (e) {
            Alert.alert(
              'Error',
              e instanceof Error ? e.message : 'Failed.',
            );
          }
        },
      },
    ]);

  const entries = rolesMap
    ? Object.entries(rolesMap as Record<string, { role?: string; email?: string }>)
    : [];

  return (
    <AdminScreen title="Admin Roles" refreshing={loading} onRefresh={load}>
      <Card>
        <Text style={styles.label}>Grant role</Text>
        <Field
          label="USER EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="person@example.com"
        />
        <View style={styles.chips}>
          {ROLES.map((r) => (
            <Chip
              key={r}
              label={r}
              active={role === r}
              onPress={() => setRole(r)}
            />
          ))}
        </View>
        <View style={{ marginTop: 12 }}>
          <AdminButton
            label={busy ? 'Granting…' : 'Grant'}
            disabled={busy}
            onPress={grant}
          />
        </View>
      </Card>

      <Text style={styles.section}>Current admins</Text>
      {loading || error ? (
        <StateBlock loading={loading} error={error} onRetry={load} />
      ) : entries.length === 0 ? (
        <StateBlock empty emptyText="No admins recorded." />
      ) : (
        entries.map(([uid, info]) => (
          <Card key={uid}>
            <Text style={styles.label}>{info.email ?? uid}</Text>
            <Text style={styles.meta}>
              {info.role ?? '—'} · {uid}
            </Text>
            <View style={{ marginTop: 10 }}>
              <AdminButton
                label="Revoke"
                variant="danger"
                onPress={() => revoke(uid)}
              />
            </View>
          </Card>
        ))
      )}
    </AdminScreen>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    label: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
    section: {
      fontSize: 13,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.6,
      marginTop: 8,
    },
  });
