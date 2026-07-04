import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  Chip,
  StatCard,
  StateBlock,
} from '@/components/admin/admin-kit';
import { useAdmin } from '@/hooks/use-admin';
import { adminApi } from '@/lib/admin';
import type { AnalyticsSummary } from '@/types/admin';

const RANGES = [7, 30, 90];

export default function AdminAnalytics() {
  const { can } = useAdmin();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await adminApi.analytics.summary(days));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  return (
    <AdminScreen
      title="Analytics"
      subtitle={data ? `source: ${data.source}` : undefined}
      refreshing={loading}
      onRefresh={load}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {RANGES.map((r) => (
          <Chip
            key={r}
            label={`${r}d`}
            active={days === r}
            onPress={() => setDays(r)}
          />
        ))}
      </View>

      {loading || error ? (
        <StateBlock loading={loading} error={error} onRetry={load} />
      ) : (
        <>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
          >
            <StatCard
              label="Total users"
              value={data?.totalUsers ?? 0}
              icon="people-outline"
            />
            <StatCard
              label={`New (~${days}d)`}
              value={data?.newUsersApprox ?? 0}
              icon="person-add-outline"
            />
            <StatCard
              label="Posts"
              value={data?.posts ?? 0}
              icon="image-outline"
            />
            <StatCard
              label="Comments"
              value={data?.comments ?? 0}
              icon="chatbubble-outline"
            />
            <StatCard
              label="Reports"
              value={data?.reports ?? 0}
              icon="flag-outline"
            />
            <StatCard
              label="Feedback +/-"
              value={`${data?.feedbackUp ?? 0}/${data?.feedbackDown ?? 0}`}
              icon="thumbs-up-outline"
            />
          </View>

          {can('analytics.rebuild') ? (
            <AdminButton
              label={busy ? 'Rebuilding…' : 'Rebuild daily stats'}
              variant="ghost"
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  const r = await adminApi.analytics.rebuildDaily(days);
                  Alert.alert(
                    'Rebuilt',
                    `Wrote ${r.written.length} day(s).`,
                  );
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
          ) : null}
        </>
      )}
    </AdminScreen>
  );
}
