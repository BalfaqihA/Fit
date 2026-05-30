import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStories, useStoryViews } from '@/hooks/use-stories';
import { useUserProfile } from '@/hooks/use-user-profile';
import { relativeTime, timeRemaining } from '@/lib/format';
import { recordStoryView } from '@/lib/stories';

const STORY_DURATION_MS = 5000;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StoryViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useUserProfile();
  const { groups, loading } = useStories();

  const group = useMemo(
    () => groups.find((g) => g.authorId === id),
    [groups, id]
  );

  const [index, setIndex] = useState(0);
  const [viewersOpen, setViewersOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const currentStory = group?.stories[index];
  const isAuthor = !!group && group.authorId === profile.id;
  const isVideo =
    currentStory?.mediaType === 'video' && !!currentStory.videoUrl;

  // Author's "Seen by" list for the visible story (realtime).
  const viewers = useStoryViews(isAuthor ? currentStory?.id : undefined);

  const videoPlayer = useVideoPlayer(
    isVideo ? (currentStory?.videoUrl ?? '') : '',
    (p) => {
      p.loop = false;
      p.muted = false;
    }
  );

  // Record that the signed-in viewer saw this story (skips the author).
  useEffect(() => {
    if (!currentStory || !group) return;
    if (group.authorId === profile.id) return;
    recordStoryView(currentStory.id, group.authorId, {
      name: profile.displayName || 'Someone',
      avatarUrl: profile.avatarUri ?? null,
    });
  }, [currentStory, group, profile.id, profile.displayName, profile.avatarUri]);

  useEffect(() => {
    if (!group || group.stories.length === 0) return;
    progress.setValue(0);
    animationRef.current?.stop();
    if (isVideo) {
      videoPlayer.play();
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animationRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, group?.stories.length, isVideo]);

  useEffect(() => {
    if (!isVideo) return;
    const interval = setInterval(() => {
      const duration = videoPlayer.duration;
      if (!duration || duration <= 0) return;
      const pct = Math.min(1, Math.max(0, videoPlayer.currentTime / duration));
      progress.setValue(pct);
      if (pct >= 0.999) {
        clearInterval(interval);
        goNext();
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo, index]);

  useEffect(() => {
    return () => {
      try {
        videoPlayer.pause();
      } catch {
        // player may already be released
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!group || group.stories.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <View style={styles.empty}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.emptyText}>Story unavailable</Text>
              <Pressable
                onPress={() => router.back()}
                style={styles.closeFallback}
              >
                <Text style={styles.closeFallbackText}>Close</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const story = group.stories[index];

  function goNext() {
    if (!group) return;
    if (index < group.stories.length - 1) {
      setIndex((i) => i + 1);
    } else {
      router.back();
    }
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
    else progress.setValue(0);
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      {isVideo ? (
        <VideoView
          player={videoPlayer}
          style={styles.image}
          nativeControls={false}
          contentFit="cover"
        />
      ) : (
        story.imageUrl && (
          <Image
            source={{ uri: story.imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        )
      )}

      <View style={styles.overlayTop}>
        <View style={styles.progressRow}>
          {group.stories.map((s, i) => {
            const isPast = i < index;
            const isActive = i === index;
            const fillWidth = isPast
              ? '100%'
              : isActive
              ? progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              : '0%';
            return (
              <View key={s.id} style={styles.progressTrack}>
                <Animated.View
                  style={[styles.progressFill, { width: fillWidth as never }]}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.headerRow}>
          {group.authorAvatarUrl && (
            <Image
              source={{ uri: group.authorAvatarUrl }}
              style={styles.headerAvatar}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{group.authorName}</Text>
            <Text style={styles.headerMeta}>
              {timeRemaining(story.expiresAtMs)}
            </Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.tapRow} pointerEvents="box-none">
        <Pressable style={styles.tapZone} onPress={goPrev} />
        <Pressable style={styles.tapZone} onPress={goNext} />
      </View>

      {!!story.caption && (
        <View style={styles.captionWrap}>
          <Text style={styles.caption}>{story.caption}</Text>
        </View>
      )}

      {/* Instagram-style: only the author sees who viewed their story. */}
      {isAuthor && (
        <Pressable
          style={styles.seenByBar}
          onPress={() => setViewersOpen(true)}
        >
          <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
          <Text style={styles.seenByText}>
            Seen by {viewers.length}
          </Text>
        </Pressable>
      )}

      <Modal
        visible={viewersOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setViewersOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setViewersOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Viewers · {viewers.length}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {viewers.length === 0 ? (
                <Text style={styles.sheetEmpty}>No views yet.</Text>
              ) : (
                viewers.map((v) => (
                  <Pressable
                    key={v.viewerId}
                    style={styles.viewerRow}
                    onPress={() => {
                      setViewersOpen(false);
                      router.push(
                        `/community/profile/${v.viewerId}` as never
                      );
                    }}
                  >
                    {v.viewerAvatarUrl ? (
                      <Image
                        source={{ uri: v.viewerAvatarUrl }}
                        style={styles.viewerAvatar}
                      />
                    ) : (
                      <View
                        style={[styles.viewerAvatar, styles.viewerAvatarFallback]}
                      >
                        <Ionicons name="person" size={16} color="#888" />
                      </View>
                    )}
                    <Text style={styles.viewerName}>{v.viewerName}</Text>
                    <Text style={styles.viewerTime}>
                      {relativeTime(v.viewedAtMs)}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  image: { ...StyleSheet.absoluteFillObject },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingBottom: 12,
  },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  headerMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  tapRow: {
    position: 'absolute',
    top: 100,
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  tapZone: { flex: 1, height: '100%' },
  captionWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 90,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  caption: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  seenByBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  seenByText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
  },
  sheetEmpty: { color: '#888', fontSize: 14, paddingVertical: 16 },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  viewerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEE' },
  viewerAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  viewerName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111' },
  viewerTime: { fontSize: 12, color: '#999' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  closeFallback: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeFallbackText: { color: '#FFFFFF', fontWeight: '700' },
});

void SCREEN_WIDTH;
