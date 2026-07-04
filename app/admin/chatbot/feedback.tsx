import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

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
import type { FeedbackSummary } from '@/types/admin';

const FILTERS = ['unreviewed', 'all', 'down', 'up'];

export default function AdminFeedback() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [filter, setFilter] = useState('unreviewed');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    (cursor: string | null) =>
      adminApi.chatbot.listFeedback({
        cursor,
        reviewed: filter === 'unreviewed' ? false : undefined,
        rating:
          filter === 'up' || filter === 'down' ? filter : undefined,
      }),
    [filter],
  );
  const list = useAdminList<FeedbackSummary>(load, [filter]);

  const review = async (id: string) => {
    setBusy(id);
    try {
      await adminApi.chatbot.reviewFeedback(id);
      list.reload();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminScreen
      title="Feedback"
      refreshing={list.refreshing}
      onRefresh={list.refresh}
    >
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={f}
            active={filter === f}
            onPress={() => setFilter(f)}
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
        <StateBlock empty emptyText="No feedback." />
      ) : (
        <>
          {list.items.map((f) => (
            <Card key={f.id}>
              <Text style={styles.rating}>
                {f.rating === 'up' ? '👍 Helpful' : '👎 Not helpful'}
                {f.reviewed ? ' · reviewed' : ''}
              </Text>
              {f.reason ? (
                <Text style={styles.reason}>{f.reason}</Text>
              ) : null}
              <Text style={styles.meta}>
                msg {f.messageId ?? '—'} ·{' '}
                {f.createdAtMs
                  ? new Date(f.createdAtMs).toLocaleDateString()
                  : ''}
              </Text>
              {!f.reviewed ? (
                <View style={{ marginTop: 10 }}>
                  <AdminButton
                    label={busy === f.id ? 'Saving…' : 'Mark reviewed'}
                    variant="ghost"
                    disabled={busy === f.id}
                    onPress={() => review(f.id)}
                  />
                </View>
              ) : null}
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
    rating: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    reason: { fontSize: 14, color: COLORS.text, marginTop: 6, lineHeight: 20 },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  });
