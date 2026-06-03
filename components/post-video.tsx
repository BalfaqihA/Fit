import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type PostVideoProps = {
  uri: string;
  shouldPlay?: boolean;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'contain' | 'cover' | 'fill';
};

// A post video auto-loops at most this many times, then stops and asks the
// viewer to tap to watch again (so the feed isn't an endless wall of motion).
const MAX_LOOPS = 2;

export function PostVideo({
  uri,
  shouldPlay = false,
  style,
  contentFit = 'cover',
}: PostVideoProps) {
  // We manage looping manually so we can cap it at MAX_LOOPS.
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
    if (shouldPlay) p.play();
  });
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(shouldPlay);
  const [ended, setEnded] = useState(false);
  const [, setLoops] = useState(0);

  // Count completed plays; replay until the cap, then stop and show the prompt.
  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      setLoops((c) => {
        const next = c + 1;
        if (next >= MAX_LOOPS) {
          try {
            player.pause();
          } catch {
            // ignore
          }
          setEnded(true);
          setIsPlaying(false);
        } else {
          try {
            player.currentTime = 0;
            player.play();
          } catch {
            // ignore
          }
        }
        return next;
      });
    });
    return () => sub.remove();
  }, [player]);

  // Follow the feed's visibility, but never override the "ended" state.
  useEffect(() => {
    if (ended) return;
    if (shouldPlay) {
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  }, [shouldPlay, player, ended]);

  const toggleMute = () => {
    const next = !muted;
    player.muted = next;
    setMuted(next);
  };

  const togglePlay = () => {
    if (ended) {
      // Restart the whole loop cycle.
      setEnded(false);
      setLoops(0);
      try {
        player.currentTime = 0;
        player.play();
      } catch {
        // ignore
      }
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit={contentFit}
      />

      {ended && (
        <Pressable style={styles.endedOverlay} onPress={togglePlay}>
          <Ionicons name="refresh" size={26} color="#FFFFFF" />
          <Text style={styles.endedText}>Tap to watch again</Text>
        </Pressable>
      )}

      <Pressable style={styles.playBtn} onPress={togglePlay} hitSlop={8}>
        <Ionicons
          name={ended ? 'refresh' : isPlaying ? 'pause' : 'play'}
          size={16}
          color="#FFFFFF"
        />
      </Pressable>

      <Pressable style={styles.muteBtn} onPress={toggleMute} hitSlop={8}>
        <Ionicons
          name={muted ? 'volume-mute' : 'volume-high'}
          size={16}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  playBtn: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  endedText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
