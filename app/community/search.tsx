import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { UserListRow } from '@/components/user-list-row';
import { SEED_USERS } from '@/constants/community-data';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useCommunity } from '@/hooks/use-community';
import { useTheme } from '@/hooks/use-theme';

export default function SearchScreen() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { isFollowing } = useCommunity();
  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!trimmed) return [];
    return SEED_USERS.filter(
      (u) =>
        u.displayName.toLowerCase().includes(trimmed) ||
        u.handle.toLowerCase().includes(trimmed)
    );
  }, [trimmed]);

  const suggested = useMemo(
    () => SEED_USERS.filter((u) => !isFollowing(u.id)).slice(0, 5),
    [isFollowing]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Search</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or handle"
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color={COLORS.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {trimmed ? (
          <>
            <Text style={styles.sectionTitle}>
              {matches.length} {matches.length === 1 ? 'result' : 'results'}
            </Text>
            {matches.length === 0 ? (
              <Text style={styles.emptyText}>No users match &quot;{query}&quot;.</Text>
            ) : (
              matches.map((user) => (
                <UserListRow
                  key={user.id}
                  user={user}
                  onPress={() =>
                    router.push(`/community/profile/${user.id}` as never)
                  }
                />
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Suggested for you</Text>
            {suggested.map((user) => (
              <UserListRow
                key={user.id}
                user={user}
                onPress={() =>
                  router.push(`/community/profile/${user.id}` as never)
                }
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    searchWrap: { paddingHorizontal: 20, paddingVertical: 6 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      ...SHADOWS.card,
    },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.text, padding: 0 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: COLORS.muted,
      letterSpacing: 0.6,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 6,
    },
    emptyText: { paddingHorizontal: 20, paddingTop: 12, fontSize: 14, color: COLORS.muted },
  });
