import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  Card,
  Field,
  StateBlock,
} from '@/components/admin/admin-kit';
import { type Palette } from '@/constants/design';
import { useAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';
import type { AdminUserDetail } from '@/types/admin';

export default function AdminUserDetailScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { can } = useAdmin();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setError(null);
    try {
      setDetail(await adminApi.users.detail(uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      Alert.alert('Done', ok);
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = (
    title: string,
    msg: string,
    onYes: () => void,
  ) =>
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: title, style: 'destructive', onPress: onYes },
    ]);

  const status =
    (detail?.moderation?.status as string | undefined) ?? 'active';

  return (
    <AdminScreen title="User" refreshing={loading} onRefresh={load}>
      {loading || error ? (
        <StateBlock loading={loading} error={error} onRetry={load} />
      ) : detail ? (
        <>
          <Card>
            <Text style={styles.name}>
              {(detail.profile.displayName as string) ?? 'Unnamed'}
            </Text>
            <Text style={styles.meta}>
              {(detail.profile.email as string) ?? 'no email'}
            </Text>
            <Text style={styles.meta}>uid: {detail.uid}</Text>
            <Text style={styles.meta}>
              Status: {status}
              {detail.auth?.disabled ? ' · auth disabled' : ''}
            </Text>
            <Text style={styles.meta}>
              Posts: {detail.counts.posts} · Reports filed:{' '}
              {detail.counts.reportsFiledByUser}
            </Text>
            {detail.auth ? (
              <Text style={styles.meta}>
                Joined:{' '}
                {detail.auth.createdAtMs
                  ? new Date(detail.auth.createdAtMs).toLocaleDateString()
                  : '—'}
              </Text>
            ) : null}
          </Card>

          {can('users.status') ? (
            <Card>
              <Text style={styles.section}>Moderation</Text>
              <Field
                label="REASON / NOTE"
                value={note}
                onChangeText={setNote}
                placeholder="why you are taking this action"
                multiline
                autoCapitalize="sentences"
              />
              {status === 'active' ? (
                <AdminButton
                  label="Suspend user"
                  variant="danger"
                  disabled={busy}
                  onPress={() =>
                    confirm('Suspend', 'Suspend this user?', () =>
                      run(
                        () =>
                          adminApi.users.updateStatus(
                            detail.uid,
                            'suspended',
                            note,
                          ),
                        'User suspended.',
                      ),
                    )
                  }
                />
              ) : (
                <AdminButton
                  label="Reinstate user"
                  disabled={busy}
                  onPress={() =>
                    run(
                      () =>
                        adminApi.users.updateStatus(
                          detail.uid,
                          'active',
                          note,
                        ),
                      'User reinstated.',
                    )
                  }
                />
              )}
            </Card>
          ) : null}

          <Card>
            <Text style={styles.section}>Account</Text>
            {can('users.passwordReset') ? (
              <AdminButton
                label="Send password reset"
                variant="ghost"
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    const r = await adminApi.users.sendPasswordReset(
                      detail.uid,
                    );
                    Alert.alert('Reset link', r.link);
                  }, 'Reset link generated.')
                }
              />
            ) : null}
            {can('users.disable') ? (
              <View style={{ marginTop: 10 }}>
                <AdminButton
                  label={
                    detail.auth?.disabled
                      ? 'Enable auth account'
                      : 'Disable auth account'
                  }
                  variant="danger"
                  disabled={busy}
                  onPress={() =>
                    confirm(
                      detail.auth?.disabled ? 'Enable' : 'Disable',
                      'Toggle this Firebase Auth account?',
                      () =>
                        run(
                          () =>
                            adminApi.users.disable(
                              detail.uid,
                              !detail.auth?.disabled,
                            ),
                          'Account updated.',
                        ),
                    )
                  }
                />
              </View>
            ) : null}
          </Card>
        </>
      ) : (
        <StateBlock empty emptyText="User not found." />
      )}
    </AdminScreen>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    name: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    meta: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
    section: {
      fontSize: 13,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 10,
    },
  });
