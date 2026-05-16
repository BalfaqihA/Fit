import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  AdminButton,
  AdminScreen,
  StatCard,
  StateBlock,
} from '@/components/admin/admin-kit';
import { useAdmin } from '@/hooks/use-admin';
import { adminApi } from '@/lib/admin';

export default function AdminChatbot() {
  const { can } = useAdmin();
  const [stats, setStats] = useState<{
    sessions: number;
    feedbackUp: number;
    feedbackDown: number;
    unreviewed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setStats(await adminApi.chatbot.stats());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminScreen
      title="Chatbot"
      subtitle="Usage & feedback health"
      refreshing={loading}
      onRefresh={load}
    >
      {loading || error ? (
        <StateBlock loading={loading} error={error} onRetry={load} />
      ) : (
        <>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
          >
            <StatCard
              label="Chat sessions"
              value={stats?.sessions ?? 0}
              icon="chatbubbles-outline"
            />
            <StatCard
              label="Thumbs up"
              value={stats?.feedbackUp ?? 0}
              icon="thumbs-up-outline"
            />
            <StatCard
              label="Thumbs down"
              value={stats?.feedbackDown ?? 0}
              icon="thumbs-down-outline"
            />
            <StatCard
              label="Unreviewed"
              value={stats?.unreviewed ?? 0}
              icon="alert-circle-outline"
            />
          </View>
          {can('chatbot.feedback') ? (
            <AdminButton
              label="Review feedback"
              onPress={() =>
                router.push('/admin/chatbot/feedback' as never)
              }
            />
          ) : null}
        </>
      )}
    </AdminScreen>
  );
}
