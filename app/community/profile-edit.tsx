import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function CommunityProfileEdit() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile, updateProfile } = useUserProfile();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(profile.avatarUri);
  const [coverUri, setCoverUri] = useState<string | undefined>(profile.coverUri);
  const [goalsVisible, setGoalsVisible] = useState(profile.goalsVisible);

  const pick = async (
    setter: (uri: string) => void,
    aspect: [number, number]
  ) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'We need access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect,
    });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    updateProfile({
      displayName: displayName.trim() || profile.displayName,
      handle: handle.trim().replace(/^@+/, '') || profile.handle,
      bio: bio.trim(),
      avatarUri,
      coverUri,
      goalsVisible,
    });
    Alert.alert('Saved', 'Your community profile has been updated.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Community Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.coverWrap}
          onPress={() => pick(setCoverUri, [16, 9])}
        >
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, styles.coverEmpty]}>
              <Ionicons name="image-outline" size={28} color={COLORS.muted} />
              <Text style={styles.coverEmptyText}>Add cover photo</Text>
            </View>
          )}
          <View style={styles.coverEditBadge}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </Pressable>

        <Pressable
          style={styles.avatarWrap}
          onPress={() => pick(setAvatarUri, [1, 1])}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={36} color={COLORS.primary} />
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </Pressable>

        <Field label="Display name" value={displayName} onChange={setDisplayName} styles={styles} />
        <Field
          label="Handle"
          value={handle}
          onChange={(v) => setHandle(v.replace(/\s/g, ''))}
          prefix="@"
          styles={styles}
        />
        <Field
          label="Bio"
          value={bio}
          onChange={setBio}
          multiline
          styles={styles}
          COLORS={COLORS}
        />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Show fitness goals on profile</Text>
            <Text style={styles.toggleSub}>
              Let other people see what you&apos;re training for.
            </Text>
          </View>
          <Switch
            value={goalsVisible}
            onValueChange={setGoalsVisible}
            trackColor={{ true: COLORS.primary, false: COLORS.border }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={{ height: 16 }} />
        <PrimaryButton label="Save Changes" onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  prefix,
  styles,
  COLORS,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  prefix?: string;
  styles: ReturnType<typeof makeStyles>;
  COLORS?: Palette;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.input, multiline && styles.inputMultiline]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChange}
          multiline={multiline}
          placeholderTextColor={COLORS?.muted}
          style={styles.inputText}
          autoCapitalize={prefix === '@' ? 'none' : 'sentences'}
        />
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
    scroll: { paddingBottom: 40 },
    coverWrap: { width: '100%', height: 140 },
    cover: { width: '100%', height: '100%', backgroundColor: COLORS.border },
    coverEmpty: { alignItems: 'center', justifyContent: 'center', gap: 6 },
    coverEmptyText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
    coverEditBadge: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarWrap: {
      alignSelf: 'center',
      marginTop: -42,
      marginBottom: 18,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 4,
      borderColor: COLORS.bg,
      backgroundColor: COLORS.primarySoft,
    },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: COLORS.bg,
    },
    field: { marginBottom: 14, paddingHorizontal: 20 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
      marginBottom: 6,
      marginLeft: 4,
    },
    input: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...SHADOWS.card,
    },
    inputMultiline: { alignItems: 'flex-start', minHeight: 88 },
    prefix: { fontSize: 15, color: COLORS.muted, marginRight: 4, fontWeight: '700' },
    inputText: {
      flex: 1,
      fontSize: 15,
      color: COLORS.text,
      padding: 0,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
      marginHorizontal: 20,
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      ...SHADOWS.card,
    },
    toggleLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    toggleSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  });
