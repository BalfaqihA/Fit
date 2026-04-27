import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useCommunity } from '@/hooks/use-community';
import { timeRemaining } from '@/lib/format';

const STORY_DURATION_MS = 5000;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StoryViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getStoriesGrouped } = useCommunity();

  const groups = getStoriesGrouped();
  const group = useMemo(() => groups.find((g) => g.user.id === id), [groups, id]);

  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!group || group.stories.length === 0) return;
    progress.setValue(0);
    animationRef.current?.stop();
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
  }, [index, group?.stories.length]);

  if (!group || group.stories.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Story unavailable</Text>
          <Pressable onPress={() => router.back()} style={styles.closeFallback}>
            <Text style={styles.closeFallbackText}>Close</Text>
          </Pressable>
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
      <Image source={{ uri: story.imageUri }} style={styles.image} contentFit="cover" />

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
                <Animated.View style={[styles.progressFill, { width: fillWidth as never }]} />
              </View>
            );
          })}
        </View>

        <View style={styles.headerRow}>
          {group.user.avatarUri && (
            <Image source={{ uri: group.user.avatarUri }} style={styles.headerAvatar} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{group.user.displayName}</Text>
            <Text style={styles.headerMeta}>{timeRemaining(story.expiresAt)}</Text>
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
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  caption: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
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
