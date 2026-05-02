import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useAchievements } from '@/hooks/use-achievements';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { ACHIEVEMENTS, type Achievement } from '@/lib/achievements';

function formatDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AchievementsScreen() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user } = useAuth();

  const isSelf = !!user && user.uid === uid;
  const { unlocked, loading } = useAchievements(isSelf ? uid : undefined);

  const unlockedMap = useMemo(() => {
    const map = new Map<string, { unlockedAt: Date | null; xpReward: number }>();
    for (const u of unlocked) {
      map.set(u.id, { unlockedAt: u.unlockedAt, xpReward: u.xpReward });
    }
    return map;
  }, [unlocked]);

  const unlockedCount = unlocked.length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="trophy" size={26} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>
              {unlockedCount} / {totalCount} unlocked
            </Text>
            <Text style={styles.summaryMeta}>
              {isSelf
                ? 'Earn more by training and tracking weight.'
                : 'Viewing another user.'}
            </Text>
          </View>
        </View>

        {!isSelf && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Cross-profile achievements aren&apos;t available yet.
            </Text>
          </View>
        )}

        {loading && isSelf ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : (
          ACHIEVEMENTS.map((a) => {
            const got = unlockedMap.get(a.id);
            return (
              <AchievementCard
                key={a.id}
                COLORS={COLORS}
                styles={styles}
                achievement={a}
                unlockedAt={got?.unlockedAt ?? null}
                isUnlocked={!!got}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AchievementCard({
  COLORS,
  styles,
  achievement,
  unlockedAt,
  isUnlocked,
}: {
  COLORS: Palette;
  styles: ReturnType<typeof makeStyles>;
  achievement: Achievement;
  unlockedAt: Date | null;
  isUnlocked: boolean;
}) {
  const Icon =
    achievement.iconLib === 'material-community'
      ? MaterialCommunityIcons
      : Ionicons;
  return (
    <View style={[styles.card, !isUnlocked && styles.cardLocked]}>
      <View
        style={[
          styles.cardIcon,
          !isUnlocked && { backgroundColor: COLORS.divider },
        ]}
      >
        <Icon
          name={achievement.icon as never}
          size={22}
          color={isUnlocked ? COLORS.primary : COLORS.muted}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, !isUnlocked && { color: COLORS.muted }]}>
          {achievement.title}
        </Text>
        <Text style={styles.cardDesc}>{achievement.description}</Text>
        {isUnlocked && unlockedAt && (
          <Text style={styles.cardDate}>Unlocked {formatDate(unlockedAt)}</Text>
        )}
      </View>
      <View style={styles.xpPill}>
        <Text style={styles.xpPillText}>+{achievement.xpReward}</Text>
      </View>
    </View>
  );
}

const makeStyles = (COLORS: Palette) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
    scroll: { padding: 20, paddingBottom: 40 },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.lg,
      padding: 16,
      marginBottom: 18,
      ...SHADOWS.card,
    },
    summaryIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    summaryMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    notice: {
      backgroundColor: COLORS.primarySoft,
      padding: 12,
      borderRadius: RADIUS.md,
      marginBottom: 14,
    },
    noticeText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
    loadingText: { color: COLORS.muted, textAlign: 'center', marginTop: 24 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      marginBottom: 10,
      ...SHADOWS.card,
    },
    cardLocked: { opacity: 0.6 },
    cardIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    cardDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    cardDate: {
      fontSize: 11,
      color: COLORS.success,
      marginTop: 4,
      fontWeight: '700',
    },
    xpPill: {
      backgroundColor: COLORS.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.pill,
    },
    xpPillText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  });
