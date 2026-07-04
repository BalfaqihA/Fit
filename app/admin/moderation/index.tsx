import React, { useCallback, useMemo, useState } from 'react';
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
import { useAdmin } from '@/hooks/use-admin';
import { useAdminList } from '@/hooks/use-admin-list';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';

type Post = Awaited<
  ReturnType<typeof adminApi.moderation.listPosts>
>['items'][number];

const STATUSES = ['all', 'visible', 'hidden', 'removed'];

export default function AdminModeration() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { can } = useAdmin();
  const [status, setStatus] = useState('visible');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    (cursor: string | null) =>
      adminApi.moderation.listPosts({
        cursor,
        moderationStatus: status === 'all' ? undefined : status,
        search: query || undefined,
      }),
    [status, query],
  );
  const list = useAdminList<Post>(load, [status, query]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      Alert.alert('Done', ok);
      list.reload();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminScreen
      title="Moderation"
      refreshing={list.refreshing}
      onRefresh={list.refresh}
    >
      <Field
        label="SEARCH CAPTION"
        value={search}
        onChangeText={setSearch}
        placeholder="text in caption"
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
      <Field
        label="ACTION REASON"
        value={reason}
        onChangeText={setReason}
        placeholder="required for hide / remove"
        autoCapitalize="sentences"
      />

      {list.loading || list.error ? (
        <StateBlock
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <StateBlock empty emptyText="No posts." />
      ) : (
        <>
          {list.items.map((p) => (
            <Card key={p.id}>
              <Text style={styles.caption} numberOfLines={3}>
                {p.caption || '(no caption)'}
              </Text>
              <Text style={styles.meta}>
                {p.authorName ?? '—'} · {p.likeCount}♥ {p.commentCount}💬 ·{' '}
                {p.moderationStatus}
              </Text>
              {can('content.moderate') ? (
                <View style={styles.actions}>
                  {p.moderationStatus !== 'hidden' ? (
                    <AdminButton
                      label="Hide"
                      variant="ghost"
                      disabled={busy}
                      onPress={() =>
                        act(
                          () =>
                            adminApi.moderation.hidePost(p.id, reason),
                          'Post hidden.',
                        )
                      }
                    />
                  ) : null}
                  {can('content.delete') ? (
                    <AdminButton
                      label="Remove"
                      variant="danger"
                      disabled={busy}
                      onPress={() =>
                        Alert.alert(
                          'Remove post',
                          'Soft-remove this post from the feed?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: () =>
                                act(
                                  () =>
                                    adminApi.moderation.deletePost(
                                      p.id,
                                      false,
                                      reason,
                                    ),
                                  'Post removed.',
                                ),
                            },
                          ],
                        )
                      }
                    />
                  ) : null}
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
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    caption: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
  });
