import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  Card,
  StateBlock,
} from '@/components/admin/admin-kit';
import { type Palette } from '@/constants/design';
import { useAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';
import type { AdminSettings } from '@/types/admin';

export default function AdminSettingsScreen() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { role, can } = useAdmin();

  const [data, setData] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await adminApi.settings.get();
      setData(s);
      setMaintenance(s.public.maintenanceMode === true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canWrite = can('settings.write');

  return (
    <AdminScreen
      title="Settings"
      subtitle={`Your role: ${role ?? '—'}`}
      refreshing={loading}
      onRefresh={load}
    >
      {loading || error ? (
        <StateBlock loading={loading} error={error} onRetry={load} />
      ) : (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Maintenance mode</Text>
                <Text style={styles.meta}>
                  Blocks normal usage when on (owner only).
                </Text>
              </View>
              <Switch
                value={maintenance}
                disabled={!canWrite}
                onValueChange={setMaintenance}
                trackColor={{ true: COLORS.primary }}
              />
            </View>
            {canWrite ? (
              <View style={{ marginTop: 12 }}>
                <AdminButton
                  label={busy ? 'Saving…' : 'Save settings'}
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await adminApi.settings.update({
                        maintenanceMode: maintenance,
                      });
                      Alert.alert('Saved', 'Settings updated.');
                      await load();
                    } catch (e) {
                      Alert.alert(
                        'Error',
                        e instanceof Error ? e.message : 'Failed.',
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </View>
            ) : null}
          </Card>

          {data?.private ? (
            <Card>
              <Text style={styles.label}>Owner</Text>
              <Text style={styles.meta}>{data.private.ownerEmail}</Text>
              <Text style={styles.meta}>
                Bootstrapped:{' '}
                {data.private.bootstrappedAtMs
                  ? new Date(
                      data.private.bootstrappedAtMs,
                    ).toLocaleDateString()
                  : '—'}
              </Text>
            </Card>
          ) : null}

          {can('roles.manage') ? (
            <AdminButton
              label="Manage admin roles"
              onPress={() => router.push('/admin/settings/roles' as never)}
            />
          ) : null}
        </>
      )}
    </AdminScreen>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    label: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  });
