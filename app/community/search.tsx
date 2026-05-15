import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { UserListRow } from '@/components/user-list-row';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { searchUsers, type SearchUser } from '@/lib/users';

export default function SearchScreen() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  const trimmed = query.trim().toLowerCase();

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const found = await searchUsers(trimmed);
      if (cancelled) return;
      setResults(found);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmed]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Search</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
              {searching
                ? 'Searching…'
                : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
            </Text>
            {searching ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 14 }} />
            ) : results.length === 0 ? (
              <Text style={styles.emptyText}>No users match &quot;{query}&quot;.</Text>
            ) : (
              results.map((user) => (
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
          <View style={styles.emptyHint}>
            <Ionicons name="people-outline" size={28} color={COLORS.muted} />
            <Text style={styles.emptyText}>Start typing to find users.</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
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
    emptyHint: {
      alignItems: 'center',
      marginTop: 40,
      gap: 10,
    },
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
