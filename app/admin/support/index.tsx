import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminScreen, Card, StateBlock } from '@/components/admin/admin-kit';
import { type Palette } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { subscribeSupportThreads, type SupportThread } from '@/lib/support';

export default function AdminSupportList() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [items, setItems] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeSupportThreads(
      (list) => {
        setItems(list);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return (
    <AdminScreen title="Support" refreshing={loading}>
      {error ? (
        <StateBlock error={error} />
      ) : items.length === 0 && !loading ? (
        <StateBlock empty emptyText="No support messages yet." />
      ) : (
        items.map((t) => (
          <Pressable
            key={t.uid}
            onPress={() => router.push(`/admin/support/${t.uid}` as never)}
          >
            <Card>
              <View style={styles.row}>
                <Text style={styles.name}>{t.userName}</Text>
                {t.unreadForAdmin > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t.unreadForAdmin}</Text>
                  </View>
                ) : null}
              </View>
              {t.userEmail ? (
                <Text style={styles.meta}>{t.userEmail}</Text>
              ) : null}
              <Text style={styles.preview} numberOfLines={1}>
                {t.lastSender === 'admin' ? 'You: ' : ''}
                {t.lastMessage}
              </Text>
              <Text style={styles.meta}>
                {t.lastMessageAtMs
                  ? new Date(t.lastMessageAtMs).toLocaleString()
                  : ''}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </AdminScreen>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    meta: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
    preview: { fontSize: 13, color: COLORS.text, marginTop: 6 },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  });
