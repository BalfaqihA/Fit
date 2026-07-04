import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  Card,
  StateBlock,
} from '@/components/admin/admin-kit';
import { type Palette } from '@/constants/design';
import { useAdminList } from '@/hooks/use-admin-list';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';
import type { AuditLogEntry } from '@/types/admin';

export default function AdminAudit() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const load = useCallback(
    (cursor: string | null) => adminApi.audit.list({ cursor }),
    [],
  );
  const list = useAdminList<AuditLogEntry>(load, []);

  return (
    <AdminScreen
      title="Audit Logs"
      refreshing={list.refreshing}
      onRefresh={list.refresh}
    >
      {list.loading || list.error ? (
        <StateBlock
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
        />
      ) : list.items.length === 0 ? (
        <StateBlock empty emptyText="No audit entries." />
      ) : (
        <>
          {list.items.map((a) => (
            <Card key={a.id}>
              <Text style={styles.action}>{a.action}</Text>
              <Text style={styles.meta}>
                {a.actorEmail ?? a.actorUid ?? 'system'} ({a.actorRole ?? '—'})
              </Text>
              <Text style={styles.meta}>
                {a.targetType ?? '—'}
                {a.targetId ? ` · ${a.targetId}` : ''} ·{' '}
                {a.atMs ? new Date(a.atMs).toLocaleString() : ''}
              </Text>
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
    action: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  });
