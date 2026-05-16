import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AdminScreen,
  StatCard,
  StateBlock,
} from '@/components/admin/admin-kit';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { adminApi } from '@/lib/admin';
import type { DashboardSummary } from '@/types/admin';

type NavItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  show: boolean;
};

export default function AdminDashboard() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { role, can } = useAdmin();

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await adminApi.dashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const navItems: NavItem[] = [
    {
      label: 'Users',
      icon: 'people-outline',
      route: '/admin/users',
      show: can('users.view'),
    },
    {
      label: 'Reports',
      icon: 'flag-outline',
      route: '/admin/reports',
      show: can('reports.view'),
    },
    {
      label: 'Moderation',
      icon: 'shield-outline',
      route: '/admin/moderation',
      show: can('content.moderate'),
    },
    {
      label: 'Chatbot',
      icon: 'chatbubbles-outline',
      route: '/admin/chatbot',
      show: can('chatbot.view'),
    },
    {
      label: 'Knowledge',
      icon: 'book-outline',
      route: '/admin/knowledge',
      show: can('knowledge.view'),
    },
    {
      label: 'Analytics',
      icon: 'stats-chart-outline',
      route: '/admin/analytics',
      show: can('analytics.view'),
    },
    {
      label: 'Audit Logs',
      icon: 'receipt-outline',
      route: '/admin/audit',
      show: can('audit.view'),
    },
    {
      label: 'Settings',
      icon: 'settings-outline',
      route: '/admin/settings',
      show: can('settings.view'),
    },
  ];

  return (
    <AdminScreen
      title="Admin"
      subtitle={`Signed in as ${role ?? 'admin'}`}
      refreshing={loading}
      onRefresh={load}
    >
      {loading || error ? (
        <StateBlock loading={loading} error={error} onRetry={load} />
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard
              label="Total users"
              value={data?.totalUsers ?? 0}
              icon="people-outline"
              onPress={
                can('users.view')
                  ? () => router.push('/admin/users' as never)
                  : undefined
              }
            />
            <StatCard
              label="Pending reports"
              value={data?.pendingReports ?? 0}
              icon="flag-outline"
              onPress={
                can('reports.view')
                  ? () => router.push('/admin/reports' as never)
                  : undefined
              }
            />
            <StatCard
              label="Hidden content"
              value={data?.hiddenContent ?? 0}
              icon="eye-off-outline"
            />
            <StatCard
              label="Unreviewed feedback"
              value={data?.unreviewedFeedback ?? 0}
              icon="chatbox-ellipses-outline"
              onPress={
                can('chatbot.feedback')
                  ? () => router.push('/admin/chatbot/feedback' as never)
                  : undefined
              }
            />
            <StatCard
              label="Knowledge docs"
              value={data?.knowledgeDocs ?? 0}
              icon="book-outline"
              onPress={
                can('knowledge.view')
                  ? () => router.push('/admin/knowledge' as never)
                  : undefined
              }
            />
          </View>

          <Text style={styles.section}>Manage</Text>
          <View style={styles.grid}>
            {navItems
              .filter((n) => n.show)
              .map((n) => (
                <Pressable
                  key={n.route}
                  style={({ pressed }) => [
                    styles.navCard,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => router.push(n.route as never)}
                >
                  <Ionicons name={n.icon} size={20} color={COLORS.primary} />
                  <Text style={styles.navLabel}>{n.label}</Text>
                </Pressable>
              ))}
          </View>

          <Text style={styles.section}>Recent activity</Text>
          {data?.recentAudit.length ? (
            data.recentAudit.map((a) => (
              <View key={a.id} style={styles.auditRow}>
                <Text style={styles.auditAction}>{a.action}</Text>
                <Text style={styles.auditMeta}>
                  {a.actorEmail ?? 'system'}
                  {a.targetType ? ` · ${a.targetType}` : ''}
                </Text>
              </View>
            ))
          ) : (
            <StateBlock empty emptyText="No admin activity yet." />
          )}
        </>
      )}
    </AdminScreen>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    section: {
      fontSize: 13,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.6,
      marginTop: 8,
    },
    navCard: {
      flexGrow: 1,
      flexBasis: '30%',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      paddingVertical: 18,
      ...SHADOWS.card,
    },
    navLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
    auditRow: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 12,
      ...SHADOWS.card,
    },
    auditAction: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    auditMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  });
