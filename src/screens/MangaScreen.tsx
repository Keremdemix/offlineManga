// screens/MangaScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Text,
  Animated,
  PanResponder,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { downloadMangaChapter } from '../services/mangaService';

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function dist(
  t1: { pageX: number; pageY: number },
  t2: { pageX: number; pageY: number },
) {
  const dx = t1.pageX - t2.pageX;
  const dy = t1.pageY - t2.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Single page (dumb image, no gesture logic here) ─────────────────────────
const MangaPage: React.FC<{ imagePath: string }> = React.memo(
  ({ imagePath }) => {
    const [aspectRatio, setAspectRatio] = useState(1.4);
    const uri = imagePath.startsWith('http')
      ? imagePath
      : `file://${imagePath}`;

    useEffect(() => {
      Image.getSize(
        uri,
        (w, h) => {
          if (w > 0 && h > 0) setAspectRatio(w / h);
        },
        () => {},
      );
    }, [uri]);

    return (
      <Image
        source={{ uri }}
        style={{
          width: SCREEN_W,
          height: SCREEN_W / aspectRatio,
          backgroundColor: '#0a0a0a',
        }}
        resizeMode="contain"
        fadeDuration={100}
      />
    );
  },
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MangaScreen: React.FC<Props> = ({ route }) => {
  const { mangaLink, localPages } = route.params;
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Zoom state ──────────────────────────────────────────────────────────────
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Raw refs for math (Animated.Value.__getValue() avoided intentionally)
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);

  // Pinch tracking
  const lastDist = useRef<number | null>(null);
  const pinchOriginX = useRef(0);
  const pinchOriginY = useRef(0);

  // Pan tracking (while zoomed)
  const panStartX = useRef(0);
  const panStartY = useRef(0);
  const panBaseTx = useRef(0);
  const panBaseTy = useRef(0);

  // Whether FlatList should scroll (only when not zoomed)
  const [listScrollEnabled, setListScrollEnabled] = useState(true);

  const clamp = (tx: number, ty: number, sc: number) => {
    const maxX = Math.max(0, (SCREEN_W * sc - SCREEN_W) / 2);
    // For Y we allow generous panning since content is tall
    const maxY = Math.max(
      0,
      (SCREEN_H * sc - SCREEN_H) / 2 + SCREEN_H * (sc - 1),
    );
    return {
      x: Math.min(maxX, Math.max(-maxX, tx)),
      y: Math.min(maxY, Math.max(-maxY, ty)),
    };
  };

  const snapToNormal = () => {
    scaleRef.current = 1;
    txRef.current = 0;
    tyRef.current = 0;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 4,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }),
    ]).start(() => setListScrollEnabled(true));
  };

  const panResponder = useRef(
    PanResponder.create({
      // Capture only multi-touch OR panning while zoomed
      onStartShouldSetPanResponder: e => e.nativeEvent.touches.length === 2,
      onMoveShouldSetPanResponder: (e, g) => {
        if (e.nativeEvent.touches.length === 2) return true;
        // Capture horizontal pan while zoomed (vertical goes to FlatList)
        if (scaleRef.current > 1.05 && Math.abs(g.dx) > 4) return true;
        return false;
      },
      onPanResponderGrant: e => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2) {
          lastDist.current = null;
          // Record pinch origin (midpoint)
          pinchOriginX.current = (touches[0].pageX + touches[1].pageX) / 2;
          pinchOriginY.current = (touches[0].pageY + touches[1].pageY) / 2;
        }
        panBaseTx.current = txRef.current;
        panBaseTy.current = tyRef.current;
        panStartX.current = 0;
        panStartY.current = 0;
      },
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;

        if (touches.length === 2) {
          // ── PINCH ────────────────────────────────────────────────────────
          const d = dist(
            { pageX: touches[0].pageX, pageY: touches[0].pageY },
            { pageX: touches[1].pageX, pageY: touches[1].pageY },
          );

          if (lastDist.current !== null) {
            const factor = d / lastDist.current;
            const nextSc = Math.min(
              MAX_SCALE,
              Math.max(MIN_SCALE, scaleRef.current * factor),
            );
            scaleRef.current = nextSc;
            scale.setValue(nextSc);

            if (nextSc <= 1.01) {
              txRef.current = 0;
              tyRef.current = 0;
              translateX.setValue(0);
              translateY.setValue(0);
            }
            setListScrollEnabled(nextSc <= 1.01);
          }
          lastDist.current = d;
        } else if (scaleRef.current > 1.05) {
          // ── PAN while zoomed ─────────────────────────────────────────────
          const nx = panBaseTx.current + g.dx;
          const ny = panBaseTy.current + g.dy;
          const c = clamp(nx, ny, scaleRef.current);
          txRef.current = c.x;
          tyRef.current = c.y;
          translateX.setValue(c.x);
          translateY.setValue(c.y);
        }
      },
      onPanResponderRelease: () => {
        lastDist.current = null;
        if (scaleRef.current < 1.1) {
          snapToNormal();
        }
      },
      onPanResponderTerminate: () => {
        lastDist.current = null;
      },
    }),
  ).current;

  // ── Data loading ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (localPages && localPages.length > 0) {
      setPages(localPages);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const result = await downloadMangaChapter(mangaLink);
        if (result.error || result.pages.length === 0) {
          setError(result.error ?? 'Sayfa bulunamadı');
        } else {
          setPages(result.pages);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [mangaLink, localPages]);

  const renderItem = useCallback(
    ({ item }: { item: string }) => <MangaPage imagePath={item} />,
    [],
  );
  const keyExtractor = useCallback((_: string, i: number) => i.toString(), []);

  // ── Render states ─────────────────────────────────────────────────────────────
  if (loading)
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={s.loadingText}>Yükleniyor...</Text>
      </View>
    );

  if (error)
    return (
      <View style={s.centered}>
        <Text style={s.errorEmoji}>⚠️</Text>
        <Text style={s.errorText}>{error}</Text>
      </View>
    );

  return (
    // Outer view captures pinch gestures
    <View style={s.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          s.zoomLayer,
          { transform: [{ scale }, { translateX }, { translateY }] },
        ]}
        // Don't intercept touches here — parent panResponder handles it
        pointerEvents="box-none"
      >
        <FlatList
          data={pages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          scrollEnabled={listScrollEnabled}
          removeClippedSubviews
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          updateCellsBatchingPeriod={60}
          windowSize={7}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
          directionalLockEnabled
        />
      </Animated.View>
    </View>
  );
};

export default MangaScreen;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    overflow: 'hidden',
  },
  zoomLayer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    gap: 12,
  },
  loadingText: { color: '#555', fontSize: 14 },
  errorEmoji: { fontSize: 40 },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
