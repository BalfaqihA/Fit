import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  Card,
  Chip,
  StateBlock,
} from '@/components/admin/admin-kit';
import { type Palette } from '@/constants/design';
import { useAdminList } from '@/hooks/use-admin-list';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';
import type { ReportSummary } from '@/types/admin';

const STATUSES = ['all', 'pending', 'resolved', 'rejected'];

export default function AdminReports() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [status, setStatus] = useState('pending');

  const load = useCallback(
    (cursor: string | null) =>
      adminApi.reports.list({
        cursor,
        status: status === 'all' ? undefined : status,
      }),
    [status],
  );
  const list = useAdminList<ReportSummary>(load, [status]);

  return (
    <AdminScreen
      title="Reports"
      refreshing={list.refreshing}
      onRefresh={list.refresh}
    >
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
        <StateBlock empty emptyText="No reports." />
      ) : (
        <>
          {list.items.map((r) => (
            <Card
              key={r.id}
              onPress={() => router.push(`/admin/reports/${r.id}` as never)}
            >
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reason} numberOfLines={2}>
                    {r.reason}
                  </Text>
                  <Text style={styles.meta}>
                    {r.postId ? `post ${r.postId}` : 'no post'} ·{' '}
                    {r.createdAtMs
                      ? new Date(r.createdAtMs).toLocaleDateString()
                      : ''}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{r.status}</Text>
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
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reason: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: COLORS.primarySoft,
    },
    badgeText: {
      color: COLORS.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
  });
