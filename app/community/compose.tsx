import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { PrimaryButton } from '@/components/primary-button';
import { type Palette, RADIUS, SHADOWS } from '@/constants/design';
import { useSubmit } from '@/hooks/use-submit';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { MAX_CAPTION_LEN, createPost } from '@/lib/community';
import {
  MAX_POST_IMAGE_BYTES,
  MAX_POST_VIDEO_BYTES,
  buildPostImagePath,
  buildPostVideoPath,
  deleteImage,
  uploadImage,
  uploadVideo,
} from '@/lib/upload';

const DRAFT_KEY = '@fit/compose-draft';

type ComposeDraft = {
  caption: string;
  imageUri?: string;
  videoUri?: string;
};

export default function ComposePost() {
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { profile } = useUserProfile();

  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [videoUri, setVideoUri] = useState<string | undefined>();
  const { run: runPost, pending: submitting } = useSubmit();
  const [error, setError] = useState<string | null>(null);
  const draftLoaded = useRef(false);

  const videoPlayer = useVideoPlayer(videoUri ?? '', (p) => {
    p.loop = true;
    p.muted = false;
  });

  // Restore any prior draft on mount, then persist on every change so a
  // back-tap or app-kill mid-compose doesn't erase the user's work.
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ComposeDraft;
            if (typeof parsed.caption === 'string') setCaption(parsed.caption);
            if (typeof parsed.imageUri === 'string') setImageUri(parsed.imageUri);
            if (typeof parsed.videoUri === 'string') setVideoUri(parsed.videoUri);
          } catch {
            // Bad JSON in storage — drop it.
            AsyncStorage.removeItem(DRAFT_KEY);
          }
        }
      })
      .finally(() => {
        draftLoaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (!draftLoaded.current) return;
    if (!caption && !imageUri && !videoUri) {
      AsyncStorage.removeItem(DRAFT_KEY);
      return;
    }
    AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ caption, imageUri, videoUri } satisfies ComposeDraft),
    );
  }, [caption, imageUri, videoUri]);

  const trimmedLen = caption.trim().length;
  const overLimit = trimmedLen > MAX_CAPTION_LEN;
  const canPost =
    !submitting && !overLimit && (trimmedLen > 0 || !!imageUri || !!videoUri);

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
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_POST_IMAGE_BYTES) {
        Alert.alert('Image too large', 'Please pick an image under 5 MB.');
        return;
      }
      setImageUri(asset.uri);
      setVideoUri(undefined);
    }
  };

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'We need access to your photos so you can attach a video.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_POST_VIDEO_BYTES) {
        Alert.alert('Video too large', 'Please pick a video under 50 MB.');
        return;
      }
      setVideoUri(asset.uri);
      setImageUri(undefined);
    }
  };

  const handlePost = () =>
    runPost(async () => {
      if (!canPost) return;
      setError(null);
      let uploadedPath: string | null = null;
      try {
        let imageUrl: string | null = null;
        let imagePath: string | null = null;
        let videoUrl: string | null = null;
        let videoPath: string | null = null;
        let mediaType: 'image' | 'video' | null = null;
        if (videoUri) {
          const path = buildPostVideoPath(profile.id);
          const result = await uploadVideo(videoUri, path, {
            maxBytes: MAX_POST_VIDEO_BYTES,
          });
          videoUrl = result.url;
          videoPath = result.path;
          uploadedPath = result.path;
          mediaType = 'video';
        } else if (imageUri) {
          const path = buildPostImagePath(profile.id);
          const result = await uploadImage(imageUri, path, {
            maxBytes: MAX_POST_IMAGE_BYTES,
          });
          imageUrl = result.url;
          imagePath = result.path;
          uploadedPath = result.path;
          mediaType = 'image';
        }
        await createPost({
          caption,
          imageUrl,
          imagePath,
          videoUrl,
          videoPath,
          mediaType,
          authorName: profile.displayName,
          authorAvatarUrl: profile.avatarUri ?? null,
        });
        // Successful post — clear the saved draft so it doesn't reappear next time.
        await AsyncStorage.removeItem(DRAFT_KEY);
        router.back();
      } catch (e) {
        // If the media landed in Storage but the post write failed, drop the
        // orphan so it doesn't cost storage forever and isn't readable by
        // other authed users.
        if (uploadedPath) {
          try {
            await deleteImage(uploadedPath);
          } catch {
            // Best-effort cleanup; surface the original error.
          }
        }
        const msg = e instanceof Error ? e.message : 'Could not post.';
        setError(msg);
      }
    });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>New Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            maxLength={MAX_CAPTION_LEN + 50}
            editable={!submitting}
          />
          <Text
            style={[
              styles.counter,
              { color: overLimit ? COLORS.accent : COLORS.muted },
            ]}
          >
            {trimmedLen} / {MAX_CAPTION_LEN}
          </Text>

          {videoUri ? (
            <View style={styles.imagePreviewWrap}>
              <VideoView
                player={videoPlayer}
                style={styles.imagePreview}
                nativeControls
                contentFit="cover"
              />
              <Pressable
                style={styles.removeBtn}
                onPress={() => setVideoUri(undefined)}
                hitSlop={6}
                disabled={submitting}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : imageUri ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
              <Pressable
                style={styles.removeBtn}
                onPress={() => setImageUri(undefined)}
                hitSlop={6}
                disabled={submitting}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.addMediaRow}>
              <Pressable
                style={styles.addPhoto}
                onPress={pickImage}
                disabled={submitting}
              >
                <Ionicons name="image-outline" size={22} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>Photo</Text>
              </Pressable>
              <Pressable
                style={styles.addPhoto}
                onPress={pickVideo}
                disabled={submitting}
              >
                <Ionicons name="videocam-outline" size={22} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>Video</Text>
              </Pressable>
            </View>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={{ height: 24 }} />
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.submittingText}>Posting...</Text>
            </View>
          ) : (
            <PrimaryButton label="Post" onPress={handlePost} disabled={!canPost} />
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
    counter: {
      alignSelf: 'flex-end',
      marginTop: 6,
      fontSize: 11,
      fontWeight: '700',
    },
    addMediaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    addPhoto: {
      flex: 1,
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
    error: {
      marginTop: 14,
      fontSize: 13,
      color: COLORS.accent,
      fontWeight: '600',
    },
    submittingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
    },
    submittingText: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },
  });
