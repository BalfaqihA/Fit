import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  Card,
  Chip,
  Field,
  StateBlock,
} from '@/components/admin/admin-kit';
import { type Palette } from '@/constants/design';
import { useAdminList } from '@/hooks/use-admin-list';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';
import type { AdminUserSummary } from '@/types/admin';

const STATUSES = ['all', 'active', 'suspended', 'banned'];

export default function AdminUsers() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const load = useCallback(
    (cursor: string | null) =>
      adminApi.users.list({
        cursor,
        search: query || undefined,
        status: status === 'all' ? undefined : status,
      }),
    [query, status],
  );

  const list = useAdminList<AdminUserSummary>(load, [query, status]);

  return (
    <AdminScreen
      title="Users"
      refreshing={list.refreshing}
      onRefresh={list.refresh}
    >
      <Field
        label="SEARCH BY NAME"
        value={search}
        onChangeText={setSearch}
        placeholder="display name"
      />
      <AdminButton label="Search" onPress={() => setQuery(search.trim())} />
      <View style={styles.chips}>
        {STATUSES.map((s) => (
          <Chip
            key={s}
            label={s}
            active={status === s}
            onPress={() => setStatus(s)}
          />
        ))}
      </View>

      {list.loading || list.error ? (
        <StateBlock
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <StateBlock empty emptyText="No users match." />
      ) : (
        <>
          {list.items.map((u) => (
            <Card
              key={u.uid}
              onPress={() =>
                router.push(`/admin/users/${u.uid}` as never)
              }
            >
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {u.displayName ?? 'Unnamed'}
                  </Text>
                  <Text style={styles.meta}>
                    {u.email ?? 'no email'}
                    {u.handle ? ` · @${u.handle}` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {u.totalWorkouts} workouts · {u.totalXp} XP
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    u.moderationStatus !== 'active' && {
                      backgroundColor: COLORS.accent,
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>{u.moderationStatus}</Text>
                </View>
              </View>
            </Card>
          ))}
          {list.nextCursor ? (
            <AdminButton
              label={list.loadingMore ? 'Loading…' : 'Load more'}
              variant="ghost"
              onPress={list.more}
              disabled={list.loadingMore}
            />
          ) : null}
        </>
      )}
    </AdminScreen>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: COLORS.success,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
  });
