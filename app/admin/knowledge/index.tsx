import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  Card,
  Chip,
  Field,
  StateBlock,
} from '@/components/admin/admin-kit';
import { type Palette } from '@/constants/design';
import { useAdmin } from '@/hooks/use-admin';
import { useAdminList } from '@/hooks/use-admin-list';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';
import type { KnowledgeSummary } from '@/types/admin';

const STATUSES = ['all', 'active', 'archived'];

export default function AdminKnowledge() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { can } = useAdmin();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const load = useCallback(
    (cursor: string | null) =>
      adminApi.knowledge.list({
        cursor,
        search: query || undefined,
        status: status === 'all' ? undefined : status,
      }),
    [query, status],
  );
  const list = useAdminList<KnowledgeSummary>(load, [query, status]);

  return (
    <AdminScreen
      title="Knowledge"
      right={
        can('knowledge.write') ? (
          <AdminButton
            label="New"
            onPress={() => router.push('/admin/knowledge/new' as never)}
          />
        ) : undefined
      }
      refreshing={list.refreshing}
      onRefresh={list.refresh}
    >
      <Field
        label="SEARCH TITLE"
        value={search}
        onChangeText={setSearch}
        placeholder="title contains"
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
        <StateBlock empty emptyText="No knowledge docs." />
      ) : (
        list.items.map((k) => (
          <Card
            key={k.id}
            onPress={() =>
              router.push(`/admin/knowledge/${k.id}` as never)
            }
          >
            <Text style={styles.title}>{k.title}</Text>
            <Text style={styles.meta}>
              {k.category ?? 'uncategorized'} · {k.status}
            </Text>
            {k.tags.length ? (
              <Text style={styles.meta}>{k.tags.join(', ')}</Text>
            ) : null}
          </Card>
        ))
      )}
    </AdminScreen>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    title: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  });
