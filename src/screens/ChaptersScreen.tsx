// screens/ChaptersScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ImageBackground, Image, Dimensions,
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
}

const AMBER  = '#F5A623';
const BG     = '#0C0C0E';
const CARD   = '#141416';
const BORDER = '#1F1F24';
const W      = Dimensions.get('window').width;

const ChaptersScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mangaTitle } = route.params;
  const [chapters,    setChapters]   = useState<Chapter[]>([]);
  const [coverUrl,    setCoverUrl]   = useState<string | null>(null);
  const [loading,     setLoading]    = useState(true);
  const [progresses,  setProgresses] = useState<Record<string, DownloadProgress>>({});
  const activeDownloads = useRef<Set<string>>(new Set());

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
      setProgresses((prev) => ({ ...prev, [chapter.id]: p }));
      if (p.status === 'done' || p.status === 'error') {
        activeDownloads.current.delete(chapter.id);
        loadChapters();
      }
    });
  };

  const openChapter = (ch: Chapter) => {
    if (ch.downloaded && ch.pages?.length) {
      navigation.navigate('Manga', { mangaLink: ch.link, localPages: ch.pages });
    } else {
      navigation.navigate('Manga', { mangaLink: ch.link });
    }
  };

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={AMBER} />
    </View>
  );

  const downloadedCount = chapters.filter(c => c.downloaded).length;

  const renderChapter = ({ item, index }: { item: Chapter; index: number }) => {
    const progress = progresses[item.id];
    const isDownloading = progress?.status === 'downloading';
    const pct = isDownloading && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100) : 0;

    const label = item.chapterNumber != null
      ? `Bölüm ${item.chapterNumber}`
      : `Bölüm ${index + 1}`;

    return (
      <TouchableOpacity
        style={[s.chRow, item.downloaded && s.chRowDone]}
        onPress={() => openChapter(item)}
        activeOpacity={0.75}
      >
        {/* left accent bar */}
        <View style={[s.accent, item.downloaded && s.accentDone]} />

        <View style={s.chInfo}>
          <Text style={[s.chLabel, item.downloaded && s.chLabelDone]}>{label}</Text>
          <Text style={s.chDate}>{item.date?.slice(0, 10)}</Text>
          {isDownloading && (
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${pct}%` }]} />
            </View>
          )}
        </View>

        {/* download button */}
        <TouchableOpacity
          style={[s.dlBtn, item.downloaded ? s.dlBtnDone : isDownloading ? s.dlBtnActive : null]}
          onPress={() => {
            if (item.downloaded) {
              Alert.alert('Tekrar indir?', '', [
                { text: 'İptal', style: 'cancel' },
                { text: 'İndir', onPress: () => handleDownload(item) },
              ]);
            } else handleDownload(item);
          }}
          disabled={isDownloading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isDownloading
            ? <ActivityIndicator size="small" color={AMBER} />
            : <Text style={[s.dlIcon, { color: item.downloaded ? '#2ecc71' : '#444' }]}>
                {item.downloaded ? '✓' : '↓'}
              </Text>
          }
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <FlatList
        data={chapters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* HERO */}
            <View style={s.hero}>
              {coverUrl ? (
                <ImageBackground
                  source={{ uri: coverUrl }}
                  style={s.heroBg}
                  blurRadius={18}
                >
                  <View style={s.heroOverlay} />
                  <Image source={{ uri: coverUrl }} style={s.heroCover} />
                </ImageBackground>
              ) : (
                <View style={[s.heroBg, { backgroundColor: CARD, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 52 }}>📖</Text>
                </View>
              )}
            </View>

            {/* TITLE BLOCK */}
            <View style={s.titleBlock}>
              <Text style={s.mangaTitle}>{mangaTitle}</Text>
              <View style={s.statsRow}>
                <View style={s.statPill}>
                  <Text style={s.statText}>{chapters.length} bölüm</Text>
                </View>
                {downloadedCount > 0 && (
                  <View style={[s.statPill, s.statPillAmber]}>
                    <Text style={[s.statText, { color: AMBER }]}>
                      {downloadedCount} indirildi
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={s.listHeader}>BÖLÜMLER</Text>
          </>
        )}
        renderItem={renderChapter}
      />
    </View>
  );
};

export default ChaptersScreen;

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  // Hero
  hero:        { height: 260, overflow: 'hidden' },
  heroBg:      { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,12,14,0.55)' },
  heroCover:   { width: 120, height: 172, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },

  // Title block
  titleBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
  mangaTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.3, marginBottom: 10 },
  statsRow:   { flexDirection: 'row', gap: 8 },
  statPill:      { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statPillAmber: { borderColor: AMBER + '44' },
  statText:      { fontSize: 11, fontWeight: '700', color: '#555' },

  listHeader: { fontSize: 10, fontWeight: '900', color: '#2A2A30', letterSpacing: 3, paddingHorizontal: 20, marginBottom: 4 },

  // Chapter row
  chRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  chRowDone: { backgroundColor: '#0F1410' },
  accent:     { width: 3, height: '100%', backgroundColor: 'transparent', marginRight: 16, marginLeft: 20, borderRadius: 2 },
  accentDone: { backgroundColor: '#2ecc71' },
  chInfo:   { flex: 1 },
  chLabel:  { fontSize: 14, fontWeight: '700', color: '#D0D0D8' },
  chLabelDone: { color: '#4A8060' },
  chDate:   { fontSize: 11, color: '#2A2A30', marginTop: 3 },
  progressBg:  { marginTop: 6, height: 2, backgroundColor: '#222', borderRadius: 1, overflow: 'hidden' },
  progressFill:{ height: 2, backgroundColor: AMBER, borderRadius: 1 },

  dlBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
  dlBtnDone:   { backgroundColor: '#0A1F12', borderColor: '#1A3A24' },
  dlBtnActive: { borderColor: AMBER + '66' },
  dlIcon:      { fontSize: 15, fontWeight: '800' },
});