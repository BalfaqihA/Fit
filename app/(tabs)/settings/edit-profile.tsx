import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { useUserProfile } from '@/hooks/use-user-profile';

export default function EditProfile() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile, updateProfile } = useUserProfile();

  const [name, setName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(profile.avatarUri);

  useEffect(() => {
    setName(profile.displayName);
    setEmail(profile.email);
    setBio(profile.bio);
    setAvatarUri(profile.avatarUri);
  }, [profile.displayName, profile.email, profile.bio, profile.avatarUri]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'We need access to your photos so you can change your picture.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      updateProfile({ avatarUri: uri });
    }
  };

  const Field = ({
    label,
    value,
    onChange,
    multiline,
    keyboardType,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    multiline?: boolean;
    keyboardType?: 'default' | 'email-address';
  }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[styles.input, multiline && { height: 88, textAlignVertical: 'top' }]}
        placeholderTextColor={COLORS.muted}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={40} color={COLORS.primary} />
            )}
          </View>
          <View style={styles.changePhoto}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </View>
        </Pressable>
        <Pressable onPress={pickAvatar}>
          <Text style={styles.changePhotoLabel}>Change photo</Text>
        </Pressable>

        <Field label="Full name" value={name} onChange={setName} />
        <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" />
        <Field label="Bio" value={bio} onChange={setBio} multiline />

        <View style={{ height: 16 }} />
        <PrimaryButton
          label="Save Changes"
          onPress={() => {
            updateProfile({ displayName: name.trim(), email: email.trim(), bio: bio.trim() });
            Alert.alert('Saved', 'Your profile has been updated.');
          }}
        />
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
    scroll: { padding: 20, paddingBottom: 40 },
    avatarWrap: { alignSelf: 'center', marginTop: 4 },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: COLORS.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    changePhoto: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: COLORS.bg,
    },
    changePhotoLabel: {
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 20,
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    field: { marginBottom: 14 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
      marginBottom: 6,
      marginLeft: 4,
    },
    input: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 15,
      color: COLORS.text,
      ...SHADOWS.card,
    },
  });
