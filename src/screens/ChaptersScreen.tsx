// screens/ChaptersScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ImageBackground,
  Dimensions, Animated, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { downloadChapter, DownloadProgress } from '../actions/downloadActions';
import { extractChapterNumber } from '../utils/chapterUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'Chapters'>;

interface Chapter {
  id: string;
  link: string;
  date: string;
  pages?: string[];
  downloaded?: boolean;
  downloading?: boolean;
  chapterNumber?: number;
  read?: boolean;
}

const AMBER   = '#F5A623';
const GREEN   = '#2ecc71';
const RED     = '#e74c3c';
const BLUE    = '#4A90E2';
const BG      = '#0A0A0C';
const CARD    = '#17171B';
const BORDER  = '#1E1E24';
const TEXT    = '#E8E8F0';
const MUTED   = '#3A3A44';

const { width: W, height: H } = Dimensions.get('window');
const HERO_H = Math.round(H * 0.65);

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const StatPill: React.FC<{ value: number; label: string; color?: string }> = ({
  value, label, color = TEXT,
}) => (
  <View style={sp.pill}>
    <Text style={[sp.num, { color }]}>{value}</Text>
    <Text style={sp.label}>{label}</Text>
  </View>
);

// ─── Chapter Row ─────────────────────────────────────────────────────────────
const ChapterRow: React.FC<{
  item: Chapter;
  index: number;
  progress: DownloadProgress | undefined;
  onOpen: (ch: Chapter) => void;
  onDownload: (ch: Chapter) => void;
  onDelete: (ch: Chapter) => void;
  onToggleRead: (ch: Chapter) => void;
}> = ({ item, index, progress, onOpen, onDownload, onDelete, onToggleRead }) => {
  const isDownloading = progress?.status === 'downloading';
  const pct = isDownloading && (progress?.total ?? 0) > 0
    ? Math.round(((progress?.current ?? 0) / (progress?.total ?? 1)) * 100)
    : 0;

  const label = item.chapterNumber != null
    ? `Bölüm ${item.chapterNumber}`
    : `Bölüm ${index + 1}`;

  return (
    <TouchableOpacity
      style={[s.chRow, item.read && s.chRowRead]}
      onPress={() => onOpen(item)}
      activeOpacity={0.75}
    >
      {/* Left accent bar */}
      <View style={[
        s.accent,
        item.read            && s.accentRead,
        item.downloaded && !item.read && s.accentDone,
      ]} />

      {/* Info */}
      <View style={s.chInfo}>
        <View style={s.chTopRow}>
          <Text style={[
            s.chLabel,
            item.downloaded && s.chLabelDone,
            item.read        && s.chLabelRead,
          ]}>{label}</Text>
          {item.read && (
            <View style={s.readBadge}>
              <Text style={s.readBadgeText}>OKUNDU</Text>
            </View>
          )}
        </View>
        <Text style={s.chDate}>{item.date?.slice(0, 10)}</Text>
        {isDownloading && (
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${pct}%` as any }]} />
            <Text style={s.progressPct}>{pct}%</Text>
          </View>
        )}
      </View>

      {/* ── Always-visible action buttons ── */}
      <View style={s.rowActions}>

        {/* Read/Unread toggle */}
        <TouchableOpacity
          style={[s.rowBtn, item.read ? s.rowBtnIsRead : s.rowBtnNotRead]}
          onPress={() => onToggleRead(item)}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: item.read ? BLUE : '#2A3A2A' }}>
            {item.read ? '○' : '✓'}
          </Text>
        </TouchableOpacity>

        {/* Download */}
        <TouchableOpacity
          style={[
            s.rowBtn,
            item.downloaded ? s.rowBtnDownloaded : null,
            isDownloading   ? s.rowBtnDling      : null,
          ]}
          onPress={() => {
            if (item.downloaded) {
              Alert.alert('Tekrar indir?', 'Bu bölümü yeniden indirmek istiyor musun?', [
                { text: 'İptal', style: 'cancel' },
                { text: 'İndir', onPress: () => onDownload(item) },
              ]);
            } else onDownload(item);
          }}
          disabled={isDownloading}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          {isDownloading
            ? <ActivityIndicator size="small" color={AMBER} />
            : <Text style={{ fontSize: 18, fontWeight: '900', color: item.downloaded ? GREEN : '#333' }}>
                {item.downloaded ? '↻' : '↓'}
              </Text>
          }
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          style={[s.rowBtn, s.rowBtnDelete]}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#4A1515' }}>✕</Text>
        </TouchableOpacity>

      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ChaptersScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mangaTitle } = route.params;
  const [chapters,   setChapters]   = useState<Chapter[]>([]);
  const [coverUrl,   setCoverUrl]   = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [progresses, setProgresses] = useState<Record<string, DownloadProgress>>({});
  const activeDownloads = useRef<Set<string>>(new Set());
  const scrollY = useRef(new Animated.Value(0)).current;

  // Hero parallax — moves up slower than scroll
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_H],
    outputRange: [0, -(HERO_H * 0.35)],
    extrapolate: 'clamp',
  });
  // Hero fades as content covers it
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_H * 0.45],
    outputRange: [1, 0.2],
    extrapolate: 'clamp',
  });

  const loadChapters = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('localMangas');
      if (!data) return;
      const parsed = JSON.parse(data);
      const idx = parsed.findIndex((m: any) => m.title === mangaTitle);
      if (idx === -1) return;

      const manga = parsed[idx];
      setCoverUrl(manga.cover || null);

      let updated = false;
      const fixed: Chapter[] = (manga.chapters || []).map((c: any) => {
        const ch: Chapter = { ...c };
        if (ch.chapterNumber == null || isNaN(Number(ch.chapterNumber))) {
          const n = extractChapterNumber(ch.link);
          if (n != null) { ch.chapterNumber = n; updated = true; }
        }
        return ch;
      });
      if (updated) {
        parsed[idx].chapters = fixed;
        await AsyncStorage.setItem('localMangas', JSON.stringify(parsed));
      }
      const sorted = [...fixed].sort((a, b) => {
        const an = a.chapterNumber ?? -1, bn = b.chapterNumber ?? -1;
        if (an !== -1 && bn !== -1) return bn - an;
        return (b.date ?? '').localeCompare(a.date ?? '');
      });
      setChapters(sorted);
    } catch (e) { console.error('Chapter load error:', e); }
    finally { setLoading(false); }
  }, [mangaTitle]);

  useEffect(() => { loadChapters(); }, [loadChapters]);

  const handleDownload = async (chapter: Chapter) => {
    if (activeDownloads.current.has(chapter.id)) return;
    activeDownloads.current.add(chapter.id);
    await downloadChapter(mangaTitle, chapter.id, chapter.link, (p) => {
      setProgresses(prev => ({ ...prev, [chapter.id]: p }));
      if (p.status === 'done' || p.status === 'error') {
        activeDownloads.current.delete(chapter.id);
        loadChapters();
      }
    });
  };

  const openChapter = (ch: Chapter) => {
    if (ch.downloaded && ch.pages?.length)
      navigation.navigate('Manga', { mangaLink: ch.link, localPages: ch.pages });
    else
      navigation.navigate('Manga', { mangaLink: ch.link });
  };

  const handleDelete = (chapter: Chapter) => {
    Alert.alert(
      'Bölümü Sil',
      `"${chapter.chapterNumber != null ? `Bölüm ${chapter.chapterNumber}` : 'Bu bölüm'}" silinsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive',
          onPress: async () => {
            const data = await AsyncStorage.getItem('localMangas');
            if (!data) return;
            const parsed = JSON.parse(data);
            const idx = parsed.findIndex((m: any) => m.title === mangaTitle);
            if (idx === -1) return;
            parsed[idx].chapters = parsed[idx].chapters.filter((c: any) => c.id !== chapter.id);
            await AsyncStorage.setItem('localMangas', JSON.stringify(parsed));
            loadChapters();
          },
        },
      ]
    );
  };

  const handleToggleRead = async (chapter: Chapter) => {
    const data = await AsyncStorage.getItem('localMangas');
    if (!data) return;
    const parsed = JSON.parse(data);
    const idx = parsed.findIndex((m: any) => m.title === mangaTitle);
    if (idx === -1) return;
    parsed[idx].chapters = parsed[idx].chapters.map((c: any) =>
      c.id === chapter.id ? { ...c, read: !c.read } : c
    );
    await AsyncStorage.setItem('localMangas', JSON.stringify(parsed));
    loadChapters();
  };

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={AMBER} />
    </View>
  );

  const downloadedCount = chapters.filter(c => c.downloaded).length;
  const readCount       = chapters.filter(c => c.read).length;
  const unreadCount     = chapters.length - readCount;

  return ( 
  <View style={s.root}> <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
    {/* ── HERO IMAGE (scroll ile kayar) ── */}
    <Animated.View
      style={[
        s.heroContainer,
        {
          transform: [{ translateY: heroTranslateY }],
          opacity: heroOpacity,
        },
      ]}
    >
      {coverUrl ? (
        <ImageBackground
          source={{ uri: coverUrl }}
          style={s.heroBg}
          resizeMode="contain"
        >
          <View style={s.heroScrim} />
        </ImageBackground>
      ) : (
        <View style={s.heroFallback}>
          <Text style={{ fontSize: 64 }}>📖</Text>
        </View>
      )}
    </Animated.View>

    {/* ── STICKY HEADER (title + stats) ── */}
    <Animated.View
      style={[
        s.stickyHeader,
        {
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [0, HERO_H - 120],
                outputRange: [HERO_H - 120, 0],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}
    >
      <View style={s.heroOverlay}>
        <Text style={s.heroTitle} numberOfLines={1}>
          {mangaTitle}
        </Text>

        <View style={s.statsRow}>
          <StatPill value={chapters.length} label="bölüm" />
          {downloadedCount > 0 && (
            <StatPill value={downloadedCount} label="indirildi" color={AMBER} />
          )}
          {readCount > 0 && (
            <StatPill value={readCount} label="okundu" color={BLUE} />
          )}
          {unreadCount > 0 && (
            <StatPill value={unreadCount} label="okunmadı" color={MUTED} />
          )}
        </View>
      </View>
    </Animated.View>

    {/* ── SCROLL CONTENT ── */}
    <Animated.ScrollView
      style={s.scroll}
      contentContainerStyle={{ paddingBottom: 60 }}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO kadar boşluk */}
      <View style={{ height: HERO_H }} />

      <View style={s.card}>
        <View style={s.dragHandle} />

        {/* Section header */}
        <View style={s.sectionRow}>
          <Text style={s.sectionLabel}>BÖLÜMLER</Text>
          <View style={s.countBadge}>
            <Text style={s.countText}>{chapters.length}</Text>
          </View>
        </View>

        {/* Chapters */}
        {chapters.map((item, index) => (
          <ChapterRow
            key={item.id}
            item={item}
            index={index}
            progress={progresses[item.id]}
            onOpen={openChapter}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onToggleRead={handleToggleRead}
          />
        ))}
      </View>
    </Animated.ScrollView>
    ```

      </View>
    );

};

export default ChaptersScreen;

// ─── Stat pill styles ─────────────────────────────────────────────────────────
const sp = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  num:   { fontSize: 13, fontWeight: '900' },
  label: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.38)' },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  // Hero
  heroContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: HERO_H,
    zIndex: 0,
  },
  heroBg: { width: '100%', height: '100%' },
  heroFallback: { backgroundColor: CARD, justifyContent: 'center', alignItems: 'center' },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    // Simulate gradient: transparent top → dark bottom
    backgroundColor: 'transparent',
    // Two-layer scrim approach
    borderBottomWidth: 0,
  },
  heroBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 24,
  },

  heroOverlay: {
    width: '100%',
    padding: 14,

    backgroundColor: 'rgba(10,10,12,0.75)', // 👈 şeffaf siyah
    borderRadius: 16,

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',

    // blur hissi için
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,

  },
  
  heroTitle: {
    fontSize: 26, fontWeight: '900', color: '#fff',
    letterSpacing: 0.2, marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  // Scroll
  scroll: { flex: 1, zIndex: 1 },

  // Content card
  card: {
    backgroundColor: BG,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    minHeight: H,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 24,
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: '#252530',
    borderRadius: 2, alignSelf: 'center',
    marginTop: 12, marginBottom: 2,
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: MUTED, letterSpacing: 3 },
  countBadge:   {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  countText:    { fontSize: 11, fontWeight: '800', color: MUTED },

  // Chapter row
  chRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingRight: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  chRowRead: { opacity: 0.60 },

  accent: {
    width: 3, alignSelf: 'stretch', backgroundColor: 'transparent',
    marginRight: 14, marginLeft: 18, borderRadius: 2,
  },
  accentDone: { backgroundColor: GREEN },
  accentRead: { backgroundColor: BLUE + '70' },

  chInfo:      { flex: 1 },
  chTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chLabel:     { fontSize: 14, fontWeight: '700', color: '#D0D0D8' },
  chLabelDone: { color: '#4A8060' },
  chLabelRead: { color: '#3A3A4A' },
  chDate:      { fontSize: 11, color: MUTED, marginTop: 3 },

  readBadge: {
    backgroundColor: BLUE + '18', borderWidth: 1, borderColor: BLUE + '40',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  readBadgeText: { fontSize: 9, fontWeight: '800', color: BLUE, letterSpacing: 0.8 },

  progressBg:   {
    marginTop: 7, height: 3, backgroundColor: '#1A1A20',
    borderRadius: 2, overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
  },
  progressFill: { height: 3, backgroundColor: AMBER, borderRadius: 2 },
  progressPct:  { fontSize: 9, color: AMBER, marginLeft: 6 },

  // Always-visible action buttons
  rowActions:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 6 },
  rowBtn:           {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  rowBtnIsRead:     { backgroundColor: '#0C1828', borderColor: BLUE + '50' },
  rowBtnNotRead:    { backgroundColor: '#0C180E', borderColor: GREEN + '28' },
  rowBtnDownloaded: { backgroundColor: '#0A1F12', borderColor: '#1C3A22' },
  rowBtnDling:      { borderColor: AMBER + '55' },
  rowBtnDelete:     { backgroundColor: '#160C0C', borderColor: RED + '20' },
  stickyHeader: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 5,
  paddingHorizontal: 0,
  paddingVertical: 0,

},

});