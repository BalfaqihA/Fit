import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BackButton } from '@/components/back-button';
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useCommunity } from '@/hooks/use-community';
import { useTheme } from '@/hooks/use-theme';

export default function StoryCompose() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { createStory } = useCommunity();

  const [imageUri, setImageUri] = useState<string | undefined>();
  const [caption, setCaption] = useState('');

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'We need access to your photos to create a story.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [9, 16],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  useEffect(() => {
    pickImage();
  }, []);

  const handleShare = () => {
    if (!imageUri) {
      Alert.alert('Pick a photo', 'Choose a photo for your story first.');
      return;
    }
    createStory({ imageUri, caption: caption.trim() || undefined });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>New Story</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.body}>
          {imageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
              <Pressable style={styles.changeBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={16} color="#FFFFFF" />
                <Text style={styles.changeBtnText}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.placeholder} onPress={pickImage}>
              <Ionicons name="image-outline" size={32} color={COLORS.muted} />
              <Text style={styles.placeholderText}>Tap to pick a photo</Text>
            </Pressable>
          )}

          <View style={styles.captionRow}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption (optional)"
              placeholderTextColor={COLORS.muted}
              style={styles.captionInput}
              multiline
              maxLength={140}
            />
          </View>

          <Text style={styles.helperText}>
            Stories disappear after 24 hours.
          </Text>

          <View style={{ height: 16 }} />
          <PrimaryButton label="Share Story" onPress={handleShare} disabled={!imageUri} />
        </View>
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
    body: { flex: 1, padding: 20 },
    previewWrap: {
      width: '100%',
      aspectRatio: 9 / 16,
      maxHeight: 460,
      alignSelf: 'center',
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      backgroundColor: COLORS.border,
    },
    preview: { width: '100%', height: '100%' },
    changeBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    changeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    placeholder: {
      width: '100%',
      aspectRatio: 9 / 16,
      maxHeight: 460,
      alignSelf: 'center',
      borderRadius: RADIUS.lg,
      backgroundColor: COLORS.card,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    placeholderText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
    captionRow: { marginTop: 14 },
    captionInput: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 60,
      fontSize: 14,
      color: COLORS.text,
      ...SHADOWS.card,
    },
    helperText: {
      fontSize: 12,
      color: COLORS.muted,
      marginTop: 8,
      marginLeft: 4,
    },
  });
