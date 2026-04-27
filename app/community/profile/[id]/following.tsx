import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { UserListRow } from '@/components/user-list-row';
import { type Palette } from '@/constants/design';
import { useCommunity } from '@/hooks/use-community';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function FollowingList() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();
  const { getUserById, getFollowing } = useCommunity();

  const user = id ? getUserById(id) : undefined;
  const following = id ? getFollowing(id) : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{user?.displayName ?? 'Following'}</Text>
          <Text style={styles.headerSub}>Following · {following.length}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 6, paddingBottom: 30 }}>
        {following.length === 0 ? (
          <Text style={styles.empty}>Not following anyone yet.</Text>
        ) : (
          following.map((u) => (
            <UserListRow
              key={u.id}
              user={u}
              isCurrentUser={u.id === profile.id}
              onPress={() =>
                router.push(`/community/profile/${u.id}` as never)
              }
            />
          ))
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
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 6,
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
    headerSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    empty: { paddingHorizontal: 20, paddingTop: 12, fontSize: 14, color: COLORS.muted },
  });
