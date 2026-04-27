import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { useCommunity } from '@/hooks/use-community';
import { useTheme } from '@/hooks/use-theme';

export default function ComposePost() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { createPost } = useCommunity();

  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'We need access to your photos so you can attach an image.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const canPost = caption.trim().length > 0 || !!imageUri;

  const handlePost = () => {
    if (!canPost) return;
    createPost({ caption, imageUri });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>New Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Share an update</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="What did you train today?"
            placeholderTextColor={COLORS.muted}
            multiline
            style={styles.textInput}
            textAlignVertical="top"
          />

          {imageUri ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
              <Pressable
                style={styles.removeBtn}
                onPress={() => setImageUri(undefined)}
                hitSlop={6}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addPhoto} onPress={pickImage}>
              <Ionicons name="image-outline" size={22} color={COLORS.primary} />
              <Text style={styles.addPhotoText}>Add a photo</Text>
            </Pressable>
          )}

          <View style={{ height: 24 }} />
          <PrimaryButton label="Post" onPress={handlePost} disabled={!canPost} />
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
    scroll: { padding: 20, paddingBottom: 40 },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.muted,
      marginBottom: 8,
      marginLeft: 4,
    },
    textInput: {
      backgroundColor: COLORS.card,
      borderRadius: RADIUS.md,
      padding: 14,
      minHeight: 120,
      fontSize: 15,
      color: COLORS.text,
      ...SHADOWS.card,
    },
    addPhoto: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    addPhotoText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
    imagePreviewWrap: { marginTop: 14 },
    imagePreview: {
      width: '100%',
      height: 240,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.border,
    },
    removeBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
