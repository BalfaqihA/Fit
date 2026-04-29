import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import {
  ALL_EXERCISES,
  exerciseImageUrl,
  type ExerciseRecord,
} from '@/lib/exercises';

const SUGGESTION_LIMIT = 8;
const FILTER_ALL = 'All';

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function WorkoutPlan() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [filter, setFilter] = useState<string>(FILTER_ALL);
  const [query, setQuery] = useState('');

  const filterOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of ALL_EXERCISES) {
      for (const m of e.primaryMuscles) set.add(m);
    }
    return [FILTER_ALL, ...Array.from(set).sort()];
  }, []);

  const heroStats = useMemo(() => {
    const muscles = new Set<string>();
    const equipment = new Set<string>();
    for (const e of ALL_EXERCISES) {
      for (const m of e.primaryMuscles) muscles.add(m);
      if (e.equipment) equipment.add(e.equipment);
    }
    return {
      total: ALL_EXERCISES.length,
      muscles: muscles.size,
      equipment: equipment.size,
    };
  }, []);

  const trimmedQuery = query.trim().toLowerCase();

  const list = useMemo(() => {
    return ALL_EXERCISES.filter((e) => {
      if (filter !== FILTER_ALL && !e.primaryMuscles.includes(filter)) return false;
      if (trimmedQuery && !e.name.toLowerCase().includes(trimmedQuery)) return false;
      return true;
    });
  }, [filter, trimmedQuery]);

  const suggestions = useMemo(() => {
    if (!trimmedQuery) return [];
    return ALL_EXERCISES.filter((e) =>
      e.name.toLowerCase().includes(trimmedQuery)
    ).slice(0, SUGGESTION_LIMIT);
  }, [trimmedQuery]);

  const renderItem = ({ item }: { item: ExerciseRecord }) => {
    const thumb = item.images?.[0];
    const muscle = item.primaryMuscles[0];
    return (
      <Pressable
        onPress={() => router.push(`/workout/exercise/${item.id}` as never)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.cardThumb}>
          {thumb ? (
            <Image
              source={{ uri: exerciseImageUrl(thumb) }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <MaterialCommunityIcons
              name="dumbbell"
              size={26}
              color={COLORS.primary}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.cardChipRow}>
            {muscle ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{titleCase(muscle)}</Text>
              </View>
            ) : null}
            {item.level !== 'unknown' ? (
              <View style={styles.chipOutline}>
                <Text style={styles.chipOutlineText}>{titleCase(item.level)}</Text>
              </View>
            ) : null}
          </View>
          {item.equipment ? (
            <Text style={styles.cardMeta}>{titleCase(item.equipment)}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Exercise Library</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={list}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={['#8E54E9', '#6C56D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <Text style={styles.bannerLabel}>Exercise Library</Text>
              <View style={styles.bannerRow}>
                <BannerStat value={heroStats.total} label="Exercises" />
                <View style={styles.bannerDivider} />
                <BannerStat value={heroStats.muscles} label="Muscles" />
                <View style={styles.bannerDivider} />
                <BannerStat value={heroStats.equipment} label="Equipment" />
              </View>
            </LinearGradient>

            <View style={styles.searchWrap}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={COLORS.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search exercises…"
                  placeholderTextColor={COLORS.muted}
                  style={styles.searchInput}
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={COLORS.muted} />
                  </Pressable>
                )}
              </View>

              {suggestions.length > 0 && (
                <View style={styles.suggestionPanel}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        setQuery('');
                        router.push(`/workout/exercise/${s.id}` as never);
                      }}
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        pressed && { backgroundColor: COLORS.primarySoft },
                      ]}
                    >
                      <Ionicons name="search-outline" size={14} color={COLORS.muted} />
                      <Text style={styles.suggestionText} numberOfLines={1}>
                        {s.name}
                      </Text>
                      {s.primaryMuscles[0] && (
                        <Text style={styles.suggestionMeta}>
                          {titleCase(s.primaryMuscles[0])}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              keyboardShouldPersistTaps="handled"
            >
              {filterOptions.map((f) => {
                const active = f === filter;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {f === FILTER_ALL ? f : titleCase(f)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>
              {list.length} {list.length === 1 ? 'exercise' : 'exercises'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="magnify-close" size={32} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              No exercises match your filters.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 14 }}>
            <PrimaryButton
              label="View My Week Plan"
              onPress={() => router.push('/workout/week-plan' as never)}
              icon={<Ionicons name="calendar-outline" size={18} color="#fff" />}
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function BannerStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={bannerStatStyles.value}>{value.toLocaleString()}</Text>
      <Text style={bannerStatStyles.label}>{label}</Text>
    </View>
  );
}

const bannerStatStyles = StyleSheet.create({
  value: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});

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
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    banner: {
      borderRadius: RADIUS.lg,
      padding: 18,
      marginBottom: 16,
      ...SHADOWS.button,
    },
    bannerLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    bannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bannerDivider: {
      width: 1,
      height: 30,
      backgroundColor: 'rgba(255,255,255,0.25)',
      marginHorizontal: 8,
    },
    searchWrap: {
      marginBottom: 12,
      position: 'relative',
      zIndex: 10,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: COLORS.text,
      paddingVertical: 0,
    },
    suggestionPanel: {
      marginTop: 6,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
      ...SHADOWS.card,
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    suggestionText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.text,
    },
    suggestionMeta: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.muted,
    },
    filterRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    filterChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
    },
    filterChipTextActive: { color: '#FFFFFF' },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.muted,
      marginTop: 14,
      marginBottom: 10,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 12,
      marginBottom: 10,
      gap: 12,
      ...SHADOWS.card,
    },
    cardThumb: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: COLORS.primarySoft,
    },
    cardName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
    cardChipRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primarySoft,
    },
    chipText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
    chipOutline: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    chipOutlineText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
    cardMeta: {
      fontSize: 11,
      color: COLORS.muted,
      marginTop: 4,
      fontWeight: '700',
    },
    emptyCard: {
      alignItems: 'center',
      padding: 24,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      ...SHADOWS.card,
    },
    emptyText: {
      fontSize: 13,
      color: COLORS.muted,
      marginTop: 8,
      textAlign: 'center',
      fontWeight: '600',
    },
  });
