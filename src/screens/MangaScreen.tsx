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
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { downloadMangaChapter } from '../services/mangaService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

const { width: SW, height: SH } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 4;

const C = {
  bg:      '#0a0a0a',
  bgGray:  '#1a1a1a',
  bgSepia: '#2b2318',
  gold:    '#D4A843',
  ink:     '#E8E8F2',
  inkMid:  '#8888A0',
  line:    '#2E2E40',
};

type ReadMode = 'vertical' | 'page';
type BgMode   = 'black' | 'gray' | 'sepia';

const BG_COLORS: Record<BgMode, string> = {
  black: C.bg,
  gray:  C.bgGray,
  sepia: C.bgSepia,
};

// ── Tip: ChaptersScreen'den gelen allChapters dizisinin her elemanı ──────────
interface ChapterMeta {
  link: string;
  chapterNumber: number;
  pages?: string[];
}

function dist(
  t1: { pageX: number; pageY: number },
  t2: { pageX: number; pageY: number },
) {
  return Math.sqrt((t1.pageX - t2.pageX) ** 2 + (t1.pageY - t2.pageY) ** 2);
}

// ─── MangaPage ────────────────────────────────────────────────────────────────
const MangaPage: React.FC<{ imagePath: string }> = React.memo(({ imagePath }) => {
  const [aspectRatio, setAspectRatio] = useState(1.4);
  const uri = imagePath.startsWith('http') ? imagePath : `file://${imagePath}`;

  useEffect(() => {
    Image.getSize(uri, (w, h) => { if (w > 0 && h > 0) setAspectRatio(w / h); }, () => {});
  }, [uri]);

  return (
    <View style={{ width: SW, height: SW / aspectRatio }}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        fadeDuration={80}
      />
    </View>
  );
});


// ─── MangaScreen ─────────────────────────────────────────────────────────────
const MangaScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mangaLink, localPages, mangaTitle, chapterId, allChapterIds, allChapters: allChaptersMeta } =
    route.params as any;

  const insets = useSafeAreaInsets();

  // ── allChapters: yeni format (obje dizisi) veya eski format (string dizisi) ──
  // ChaptersScreen artık allChapters (ChapterMeta[]) gönderiyor.
  // Eski kod allChapterIds (string[]) gönderiyordu — ikisini de destekliyoruz.
  const allChapters: ChapterMeta[] = React.useMemo(() => {
    if (allChaptersMeta?.length) {
      // Bölüm numarasına göre artan sırada (küçük → büyük)
      return [...allChaptersMeta].sort(
        (a: ChapterMeta, b: ChapterMeta) => a.chapterNumber - b.chapterNumber,
      );
    }
    // Eski compat: sadece link dizisi varsa
    const ids: string[] = allChapterIds ?? [];
    return ids.map((link: string) => ({ link, chapterNumber: 0, pages: undefined }));
  }, [allChaptersMeta, allChapterIds]);

  // Aktif bölümün allChapters içindeki index'i
  const currentChIdx = React.useMemo(
    () => allChapters.findIndex(c => c.link === (chapterId ?? mangaLink)),
    [allChapters, chapterId, mangaLink],
  );

  const [pages,             setPages]             = useState<string[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [uiVisible,         setUiVisible]         = useState(true);
  const [settingsOpen,      setSettingsOpen]      = useState(false);
  const [chaptersOpen,      setChaptersOpen]      = useState(false);
  const [readMode,          setReadMode]          = useState<ReadMode>('vertical');
  const [bgMode,            setBgMode]            = useState<BgMode>('black');
  const [currentPage,       setCurrentPage]       = useState(0);
  const [pageModePage,      setPageModePage]      = useState(0);
  const [listScrollEnabled, setListScrollEnabled] = useState(true);

  const bgColor = BG_COLORS[bgMode];

  const flatRef      = useRef<FlatList>(null);
  const scrollThumbY = useRef(new Animated.Value(0)).current;
  const thumbTrackH  = useRef(0);
  const uiAnim       = useRef(new Animated.Value(1)).current;

  // Zoom
  const scale      = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleRef   = useRef(1);
  const txRef      = useRef(0);
  const tyRef      = useRef(0);
  const lastDist   = useRef<number | null>(null);
  const panBaseTx  = useRef(0);
  const panBaseTy  = useRef(0);

  // Double tap
  const lastTapTime = useRef(0);
  const lastTapX    = useRef(0);
  const lastTapY    = useRef(0);

  // ── UI toggle ──────────────────────────────────────────────────────────────
  const toggleUi = useCallback(() => {
    setUiVisible(prev => {
      const next = !prev;
      Animated.timing(uiAnim, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: true }).start();
      return next;
    });
  }, [uiAnim]);

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  const clamp = (tx: number, ty: number, sc: number) => {
    const maxX = Math.max(0, (SW * sc - SW) / 2);
    const maxY = Math.max(0, (SH * sc - SH) / 2 + SH * (sc - 1));
    return { x: Math.min(maxX, Math.max(-maxX, tx)), y: Math.min(maxY, Math.max(-maxY, ty)) };
  };

  const snapToNormal = useCallback(() => {
    scaleRef.current = 1; txRef.current = 0; tyRef.current = 0;
    Animated.parallel([
      Animated.spring(scale,      { toValue: 1, useNativeDriver: true, bounciness: 4 }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
    ]).start(() => setListScrollEnabled(true));
  }, [scale, translateX, translateY]);

  const doubleTapZoom = (tapX: number, tapY: number) => {
    if (scaleRef.current > 1.5) {
      snapToNormal();
    } else {
      const ts = 2.5;
      const c  = clamp(-(tapX - SW / 2) * (ts - 1), -(tapY - SH / 2) * (ts - 1), ts);
      scaleRef.current = ts; txRef.current = c.x; tyRef.current = c.y;
      Animated.parallel([
        Animated.spring(scale,      { toValue: ts,  useNativeDriver: true, bounciness: 3 }),
        Animated.spring(translateX, { toValue: c.x, useNativeDriver: true, bounciness: 3 }),
        Animated.spring(translateY, { toValue: c.y, useNativeDriver: true, bounciness: 3 }),
      ]).start();
      setListScrollEnabled(false);
    }
  };

  // ── PanResponder ───────────────────────────────────────────────────────────
  const panResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => {
      const t = e.nativeEvent.touches.length;
      if (t === 2) return true;
      if (scaleRef.current > 1.05 && Math.abs(g.dx) > 6) return true;
      return false;
    },

    onPanResponderGrant: (e) => {
      panBaseTx.current = txRef.current;
      panBaseTy.current = tyRef.current;
      if (e.nativeEvent.touches.length === 2) {
        lastDist.current = null;
      }
    },

    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches;

      if (touches.length === 2) {
        const d = dist(
          { pageX: touches[0].pageX, pageY: touches[0].pageY },
          { pageX: touches[1].pageX, pageY: touches[1].pageY },
        );
        if (lastDist.current !== null) {
          const nextSc = Math.min(
            MAX_SCALE,
            Math.max(MIN_SCALE, scaleRef.current * (d / lastDist.current))
          );
          scaleRef.current = nextSc;
          scale.setValue(nextSc);
          setListScrollEnabled(nextSc <= 1.01);
        }
        lastDist.current = d;
        return;
      }

      if (scaleRef.current > 1.05) {
        const c = clamp(
          panBaseTx.current + g.dx,
          panBaseTy.current + g.dy,
          scaleRef.current
        );
        txRef.current = c.x;
        tyRef.current = c.y;
        translateX.setValue(c.x);
        translateY.setValue(c.y);
      }
    },

    onPanResponderRelease: (e, g) => {
      lastDist.current = null;

      // Page mode swipe — sadece zoom yokken
      if (readMode === 'page' && scaleRef.current <= 1.05) {
        if (g.dx < -30) {
          // Sola kaydır → sonraki sayfa (ileri bölüm)
          setPageModePage(prev => {
            const next = Math.min(pages.length - 1, prev + 1);
            setCurrentPage(next);
            return next;
          });
        } else if (g.dx > 30) {
          // Sağa kaydır → önceki sayfa (geri bölüm)
          setPageModePage(prev => {
            const next = Math.max(0, prev - 1);
            setCurrentPage(next);
            return next;
          });
        }
      }

      if (scaleRef.current < 1.1) {
        snapToNormal();
      }
    },

    onPanResponderTerminate: () => {
      lastDist.current = null;
    },
  })
).current;

  // ── Double tap ─────────────────────────────────────────────────────────────
  const handleTouchEnd = (e: any) => {
    const { pageX, pageY } = e.nativeEvent;
    const now = Date.now();
    if (
      now - lastTapTime.current < 280 &&
      Math.abs(pageX - lastTapX.current) < 60 &&
      Math.abs(pageY - lastTapY.current) < 60
    ) {
      doubleTapZoom(pageX, pageY);
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
      lastTapX.current    = pageX;
      lastTapY.current    = pageY;
    }
  };

  // ── Save / restore ─────────────────────────────────────────────────────────
  const posKey = `manga_pos_${mangaLink}`;
  const savePosition = useCallback(async (idx: number) => {
    try { await AsyncStorage.setItem(posKey, String(idx)); } catch {}
  }, [posKey]);

  const restorePosition = useCallback(async (count: number) => {
    try {
      const saved = await AsyncStorage.getItem(posKey);
      if (saved) {
        const idx = Math.min(Number(saved), count - 1);
        setTimeout(() => {
          if (readMode === 'vertical') {
            flatRef.current?.scrollToOffset({ offset: idx * SH, animated: false });
          } else {
            flatRef.current?.scrollToIndex({ index: idx, animated: false });
          }
          setCurrentPage(idx);
          setPageModePage(idx);
        }, 350);
      }
    } catch {}
  }, [posKey]);

  // ── Data ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (localPages?.length) {
      setPages(localPages); setLoading(false); restorePosition(localPages.length); return;
    }
    (async () => {
      try {
        const result = await downloadMangaChapter(mangaLink);
        if (result.error || result.pages.length === 0) {
          setError(result.error ?? 'Sayfa bulunamadı');
        } else {
          setPages(result.pages); restorePosition(result.pages.length);
        }
      } catch (e) { setError(String(e)); }
      finally     { setLoading(false); }
    })();
  }, [mangaLink, localPages]);

  // ── Scroll thumb ───────────────────────────────────────────────────────────
  const updateThumb = (offset: number, contentH: number, viewH: number) => {
    if (contentH <= viewH || thumbTrackH.current <= 0) return;
    const maxScroll = contentH - viewH;
    const ratio = Math.min(1, Math.max(0, offset / maxScroll));
    scrollThumbY.setValue(ratio * thumbTrackH.current);
  };

  const handleScroll = (e: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const pageHeight = layoutMeasurement.height;
    const idx = Math.max(
      0,
      Math.min(pages.length - 1, Math.round(contentOffset.y / pageHeight))
    );
    if (idx !== currentPage) {
      setCurrentPage(idx);
      savePosition(idx);
    }
    updateThumb(contentOffset.y, contentSize.height, layoutMeasurement.height);
  };

  // ── Chapter nav ────────────────────────────────────────────────────────────
  // allChapters artan sırada (küçük bölüm → büyük bölüm)
  // "Önceki" = daha küçük bölüm numarası (index - 1)
  // "Sonraki" = daha büyük bölüm numarası (index + 1)
  const hasPrev = currentChIdx > 0;
  const hasNext = currentChIdx >= 0 && currentChIdx < allChapters.length - 1;

  const goChapter = (dir: 'prev' | 'next') => {
    if (currentChIdx === -1 || !allChapters.length) return;
    const targetIdx = dir === 'next' ? currentChIdx + 1 : currentChIdx - 1;
    if (targetIdx < 0 || targetIdx >= allChapters.length) return;

    const target = allChapters[targetIdx];

    navigation.replace('Manga', {
      mangaLink:     target.link,
      mangaTitle,
      chapterId:     target.link,
      // İndirilmiş sayfalar varsa direkt geç, yoksa undefined → online yüklenecek
      localPages:    target.pages?.length ? target.pages : undefined,
      allChapters:   allChapters,       // obje dizisini taşı
      allChapterIds: undefined,         // eski format artık kullanılmıyor
    } as any);
  };

  // ── PAGE NAV ───────────────────────────────────────────────────────────────
const scrollToPage = useCallback((index: number) => {
  const next = Math.max(0, Math.min(pages.length - 1, index));

  setPageModePage(next);
  setCurrentPage(next);
  savePosition(next);

  flatRef.current?.scrollToOffset({
    offset: next * SW,
    animated: true,
  });
}, [pages.length]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: string }) => <MangaPage imagePath={item} />,
    [],
  );
  const keyExtractor = useCallback((_: string, i: number) => i.toString(), []);

  if (loading)
    return (
      <View style={[s.centered, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={C.gold} />
        <Text style={s.loadingText}>Yükleniyor...</Text>
      </View>
    );

  if (error)
    return (
      <View style={[s.centered, { backgroundColor: bgColor }]}>
        <Text style={{ fontSize: 40 }}>⚠️</Text>
        <Text style={s.errorText}>{error}</Text>
      </View>
    );

  const isPage = readMode === 'page';

  return (
    <View style={[s.container, { backgroundColor: bgColor }]}>
      <StatusBar hidden={!uiVisible} />

      {/* ── Gesture katmanı ────────────────────────────────────────────────── */}
      <View
        style={StyleSheet.absoluteFill}
        {...panResponder.panHandlers}
        onTouchEnd={handleTouchEnd}
      >
        <Animated.View
          style={[s.zoomLayer, { transform: [{ scale }, { translateX }, { translateY }] }]}
          pointerEvents="box-none"
        >
          {isPage ? (
            <FlatList
              ref={flatRef}
              data={pages}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={{ width: SW, height: SH }}>
                  <Image
                    source={{ uri: item.startsWith('http') ? item : `file://${item}` }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </View>
              )}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
                setPageModePage(idx);
                setCurrentPage(idx);
              }}
            />
          ) : (
            <FlatList
              ref={flatRef}
              data={pages}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              scrollEnabled={listScrollEnabled}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onLayout={e => { thumbTrackH.current = e.nativeEvent.layout.height - THUMB_H; }}
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
          )}
        </Animated.View>
      </View>

      {/* ── Scroll thumb ───────────────────────────────────────────────────── */}
      {readMode === 'vertical' && pages.length > 0 && (
        <Animated.View
          style={[s.thumb, { transform: [{ translateY: scrollThumbY }] }]}
          pointerEvents="none"
        />
      )}

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[s.topBar, { opacity: uiAnim, paddingTop: insets.top + 4 }]}
        pointerEvents={uiVisible ? 'box-none' : 'none'}
      >
        <TouchableOpacity style={s.topBtn} onPress={() => navigation.goBack()}>
          <Text style={s.topBtnTxt}>‹</Text>
        </TouchableOpacity>

        <Text style={s.topTitle} numberOfLines={1}>{mangaTitle ?? 'Manga'}</Text>

        <View style={s.topRight}>
          <TouchableOpacity style={s.topBtn} onPress={toggleUi}>
            <Text style={s.topBtnTxt}>👁</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.topBtn} onPress={() => setSettingsOpen(true)}>
            <Text style={s.topBtnTxt}>⚙</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── UI kapalıyken floating toggle ──────────────────────────────────── */}
      {!uiVisible && (
        <TouchableOpacity
          style={[s.floatingToggle, { top: insets.top + 8 }]}
          onPress={toggleUi}
          activeOpacity={0.75}
        >
          <Text style={s.floatingToggleTxt}>☰</Text>
        </TouchableOpacity>
      )}

      <View style={s.pageRow}>
          {isPage && (
            <TouchableOpacity
              style={[s.pageNavBtn, pageModePage === 0 && s.navBtnDisabled]}
              onPress={() => scrollToPage(pageModePage - 1)}
              disabled={pageModePage === 0}
            >
              <Text style={s.pageNavTxt}>‹</Text>
            </TouchableOpacity>
          )}

          <Text style={s.pageInfo}>
            {currentPage + 1} / {pages.length}
          </Text>

          {isPage && (
            <TouchableOpacity
              style={[s.pageNavBtn, pageModePage === pages.length - 1 && s.navBtnDisabled]}
              onPress={() => scrollToPage(pageModePage + 1)}
              disabled={pageModePage === pages.length - 1}
            >
              <Text style={s.pageNavTxt}>›</Text>
            </TouchableOpacity>
          )}
        </View>

      {/* ── BOTTOM BAR ─────────────────────────────────────────────────────── */}
      <Animated.View
        style={[s.bottomBar, { opacity: uiAnim, paddingBottom: insets.bottom + 4 }]}
        pointerEvents={uiVisible ? 'box-none' : 'none'}
      >
        

        <View style={s.bottomRow}>
          {/* Önceki bölüm = daha küçük numara */}
          <TouchableOpacity
            style={[s.navBtn, !hasPrev && s.navBtnDisabled]}
            onPress={() => goChapter('prev')}
            disabled={!hasPrev}
          >
            <Text style={s.navBtnTxt}>‹ Önceki</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.chapBtn} onPress={() => setChaptersOpen(true)}>
            <Text style={s.chapBtnTxt}>☰ Bölümler</Text>
          </TouchableOpacity>

          {/* Sonraki bölüm = daha büyük numara */}
          <TouchableOpacity
            style={[s.navBtn, !hasNext && s.navBtnDisabled]}
            onPress={() => goChapter('next')}
            disabled={!hasNext}
          >
            <Text style={s.navBtnTxt}>Sonraki ›</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>


      {/* ── SETTINGS MODAL ─────────────────────────────────────────────────── */}
      <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setSettingsOpen(false)}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
                <View style={s.sheetHandle} />
                <Text style={s.sheetTitle}>Okuma Ayarları</Text>

                <Text style={s.settingLabel}>OKUMA MODU</Text>
                <View style={s.optRow}>
                  {(['vertical', 'page'] as ReadMode[]).map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[s.optBtn, readMode === m && s.optBtnActive]}
                      onPress={() => { setReadMode(m); setSettingsOpen(false); }}
                    >
                      <Text style={[s.optBtnTxt, readMode === m && s.optBtnTxtActive]}>
                        {m === 'vertical' ? '📜 Dikey' : '📖 Sayfa'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.settingLabel}>ARKA PLAN</Text>
                <View style={s.optRow}>
                  {(['black', 'gray', 'sepia'] as BgMode[]).map(b => (
                    <TouchableOpacity
                      key={b}
                      style={[s.optBtn, { backgroundColor: BG_COLORS[b], borderWidth: 2 }, bgMode === b && s.optBtnActive]}
                      onPress={() => setBgMode(b)}
                    >
                      <Text style={[s.optBtnTxt, { color: '#fff' }]}>
                        {b === 'black' ? '⬛ Siyah' : b === 'gray' ? '▪ Gri' : '📜 Sepya'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.settingLabel}>KISAYOLLAR</Text>
                <View style={s.hintBox}>
                  <Text style={s.hintTxt}>👆 Çift dokun → Zoom in/out</Text>
                  <Text style={s.hintTxt}>🤏 İki parmak → Yakınlaştır/Uzaklaştır</Text>
                  <Text style={s.hintTxt}>☰ Sağ üst → UI göster / gizle</Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── CHAPTERS MODAL ─────────────────────────────────────────────────── */}
      <Modal visible={chaptersOpen} transparent animationType="slide" onRequestClose={() => setChaptersOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setChaptersOpen(false)}>
          <View style={s.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[s.sheet, s.sheetTall, { paddingBottom: insets.bottom + 16 }]}>
                <View style={s.sheetHandle} />
                <Text style={s.sheetTitle}>Bölümler</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Büyük → küçük sırada göster (en yeni üstte) */}
                  {[...allChapters].reverse().map((ch) => {
                    const isCurrent = ch.link === (chapterId ?? mangaLink);
                    return (
                      <TouchableOpacity
                        key={ch.link}
                        style={[s.chapRow, isCurrent && s.chapRowActive]}
                        onPress={() => {
                          setChaptersOpen(false);
                          if (!isCurrent) {
                            navigation.replace('Manga', {
                              mangaLink:   ch.link,
                              mangaTitle,
                              chapterId:   ch.link,
                              localPages:  ch.pages?.length ? ch.pages : undefined,
                              allChapters: allChapters,
                            } as any);
                          }
                        }}
                      >
                        <Text style={[s.chapRowTxt, isCurrent && s.chapRowTxtActive]}>
                          {ch.chapterNumber > 0 ? `Bölüm ${ch.chapterNumber}` : ch.link}
                        </Text>
                        {isCurrent && <Text style={s.chapRowBadge}>Şu an</Text>}
                        {ch.pages?.length ? <Text style={s.chapRowBadge}>✓ İndirildi</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default MangaScreen;

// ─── Constants ────────────────────────────────────────────────────────────────
const THUMB_H   = 48;
const THUMB_W   = 4;
const TOP_BAR_H = 52;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, overflow: 'hidden' },
  zoomLayer:   { flex: 1 },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: C.inkMid, fontSize: 14 },
  errorText:   { color: '#e74c3c', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  thumb: {
    position: 'absolute', right: 3, top: TOP_BAR_H,
    width: THUMB_W, height: THUMB_H, borderRadius: THUMB_W / 2,
    backgroundColor: 'rgba(212,168,67,0.6)',
  },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 30,
  },
  topRight:  { flexDirection: 'row', gap: 6 },
  topBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center', alignItems: 'center',
  },
  topBtnTxt: { color: C.ink, fontSize: 20, fontWeight: '700' },
  topTitle:  { flex: 1, color: C.ink, fontSize: 14, fontWeight: '700', textAlign: 'center', marginHorizontal: 6 },

  floatingToggle: {
    position: 'absolute', right: 12, zIndex: 50,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  floatingToggleTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 17 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingTop: 10, paddingHorizontal: 14, zIndex: 30,
  },
  pageInfo: {
    color: C.inkMid, fontSize: 14, textAlign: 'center',
    marginBottom: 8, fontWeight: '700', letterSpacing: 1,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },

  navBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  navBtnDisabled: { opacity: 0.25 },
  navBtnTxt:      { color: C.ink, fontSize: 13, fontWeight: '700' },

  chapBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: C.gold + '22',
    borderWidth: 1, borderColor: C.gold + '55', alignItems: 'center',
  },
  chapBtnTxt: { color: C.gold, fontSize: 13, fontWeight: '800' },

  miniInfo: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  miniInfoTxt: {
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#13131C',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: C.line,
    paddingHorizontal: 20, paddingTop: 14,
    maxHeight: SH * 0.55,
  },
  sheetTall:   { maxHeight: SH * 0.75 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { color: C.ink, fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 20 },

  settingLabel: { color: C.inkMid, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10, marginTop: 4 },
  optRow: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  optBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: C.line, alignItems: 'center',
  },
  optBtnActive:    { borderColor: C.gold, backgroundColor: C.gold + '18' },
  optBtnTxt:       { color: C.inkMid, fontSize: 13, fontWeight: '700' },
  optBtnTxtActive: { color: C.gold },
  hintBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, gap: 6 },
  hintTxt: { color: C.inkMid, fontSize: 12 },

  chapRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  chapRowActive:    { backgroundColor: C.gold + '12', marginHorizontal: -20, paddingHorizontal: 20 },
  chapRowTxt:       { color: C.ink, fontSize: 14, fontWeight: '600' },
  chapRowTxtActive: { color: C.gold, fontWeight: '800' },
  chapRowBadge: {
    color: C.gold, fontSize: 10, fontWeight: '800',
    backgroundColor: C.gold + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    marginLeft: 6,
  },
  pageRow: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,

  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  marginBottom: 28,
  paddingBottom: 36,

  backgroundColor: 'rgba(0,0,0,0.75)', // opsiyonel ama önerilir
},

pageNavBtn: {
  marginBottom: 8,
  paddingBottom: 4,
  width: 32,
  height: 32,
  borderRadius: 8,
  backgroundColor: 'rgba(255,255,255,0.08)',
  justifyContent: 'center',
  alignItems: 'center',
},

pageNavTxt: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '800',
},
});