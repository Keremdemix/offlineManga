// screens/HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  StatusBar,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import AddMangaModal from '../components/AddMangaModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface Manga {
  title: string;
  lastOpened?: string;
  cover?: string;
  totalChapters?: number;
  downloadedChapters?: number;
  readChapters?: number;
}

const AMBER  = '#F5A623';
const VIOLET = '#8B5CF6';
const BG     = '#0C0C0E';
const CARD   = '#141416';
const BORDER = '#1F1F24';

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [uploadedMangas, setUploadedMangas] = useState<Manga[]>([]);
  const [recentMangas,   setRecentMangas]   = useState<Manga[]>([]);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [modalMode,      setModalMode]      = useState<'manga' | 'chapter'>('manga');

  const loadMangas = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('localMangas');
      if (data) {
        const parsed = JSON.parse(data);
        const mapped: Manga[] = parsed.map((m: any) => ({
          title: m.title,
          cover: m.cover || null,
          lastOpened:
            m.lastOpened ||
            m.chapters?.[m.chapters.length - 1]?.date?.slice(0, 10),
          totalChapters:      m.chapters?.length || 0,
          downloadedChapters: m.chapters?.filter((c: any) => c.downloaded).length || 0,
          readChapters:       m.chapters?.filter((c: any) => c.read).length || 0,
        }));
        setUploadedMangas(mapped);
        const sorted = [...mapped].sort((a, b) =>
          (b.lastOpened || '').localeCompare(a.lastOpened || ''),
        );
        setRecentMangas(sorted.slice(0, 8));
      } else {
        setUploadedMangas([]);
        setRecentMangas([]);
      }
    } catch (e) {
      console.log('LOAD ERROR:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMangas();
    }, [loadMangas]),
  );

  const handleSaveManga = () => {
    setModalVisible(false);
    loadMangas();
  };
  const handleOpenManga = (m: Manga) =>
    navigation.navigate('Chapters', { mangaTitle: m.title });
  const handleViewAll = () =>
    navigation.navigate('AllMangas', { mangas: uploadedMangas });
  const topMangas = uploadedMangas.slice(0, 4);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* HEADER */}
        <View style={s.header}>
          <View>
            <Text style={s.appName}>MANGABOX</Text>
            <Text style={s.appSub}>
              {uploadedMangas.length} manga koleksiyonda
            </Text>
          </View>
          <View style={s.dot} />
        </View>

        {/* BUTTONS */}
        <View style={s.btnRow}>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: AMBER }]}
            onPress={() => {
              setModalMode('manga');
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.btnIcon, { color: BG }]}>＋</Text>
            <Text style={[s.btnLabel, { color: BG }]}>Manga Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.btn,
              { backgroundColor: '#ccc', borderWidth: 1, borderColor: BORDER },
            ]}
            onPress={() => {
              setModalMode('chapter');
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.btnIcon, { color: '#000' }]}>↓</Text>
            <Text style={[s.btnLabel, { color: '#000' }]}>Bölüm Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* SON KULLANILANLAR */}
        {recentMangas.length > 0 && (
          <>
            <Text style={s.sectionLbl}>SON KULLANILANLAR</Text>
            <FlatList
              horizontal
              data={recentMangas}
              keyExtractor={item => item.title}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 4 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.recentCard}
                  onPress={() => handleOpenManga(item)}
                  activeOpacity={0.25}
                >
                  {item.cover ? (
                    <ImageBackground
                      source={{ uri: item.cover }}
                      style={s.recentImg}
                      imageStyle={{ borderRadius: 14 }}
                    >
                      <View style={s.recentOverlay} />
                      <Text style={s.recentTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </ImageBackground>
                  ) : (
                    <View style={[s.recentImg, s.recentPlaceholder]}>
                      <Text style={{ fontSize: 32 }}>📖</Text>
                      <Text style={s.recentTitleDark} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                  )}

                  {/* İndirilen bölüm sayısı badge */}
                  {(item.downloadedChapters ?? 0) > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{item.downloadedChapters}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {/* KOLEKSİYON */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLbl}>KOLEKSİYON</Text>
          <TouchableOpacity onPress={handleViewAll}>
            <Text style={s.viewAll}>Tümü →</Text>
          </TouchableOpacity>
        </View>

        {topMangas.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📭</Text>
            <Text style={s.emptyTitle}>Koleksiyon boş</Text>
            <Text style={s.emptyHint}>Yukarıdan manga ekleyerek başla</Text>
          </View>
        ) : (
          topMangas.map(item => {
            const total    = item.totalChapters    ?? 0;
            const dlCount  = item.downloadedChapters ?? 0;
            const readCount = item.readChapters    ?? 0;
            const unread   = total - readCount;
            const dlPct    = total ? Math.round((dlCount / total) * 100) : 0;
            const readPct  = total ? Math.round((readCount / total) * 100) : 0;


            return (
              <TouchableOpacity
                key={item.title}
                style={s.mangaCard}
                onPress={() => handleOpenManga(item)}
                activeOpacity={0.8}
              >
                {/* Kapak */}
                <View style={s.cardCoverWrap}>
                  {item.cover ? (
                    <Image source={{ uri: item.cover }} style={s.cardCover} />
                  ) : (
                    <View style={[s.cardCover, s.cardCoverPh]}>
                      <Text style={{ fontSize: 28 }}>📖</Text>
                    </View>
                  )}
                </View>

                {/* İçerik */}
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={s.cardMeta}>{total} bölüm</Text>

                  {/*Loaded Progress bar */}
                  {!!total && (
                    <View style={s.progressWrap}>
                      <View style={s.progressBg}>
                        <View style={[s.progressFillLoad, { width: `${dlPct}%` }]} />
                      </View>
                      <Text style={s.progressLbl}>
                        {dlCount}/{total}
                      </Text>
                    </View>
                  )}
                  {/*Readed Progress bar */}
                  {!!total && (
                    <View style={s.progressWrap}>
                      <View style={s.progressBg}>
                        <View style={[s.progressFillRead, { width: `${readPct}%` }]} />
                      </View>
                      <Text style={s.progressLbl}>
                        {readCount}/{total}
                      </Text>
                    </View>
                  )}

                  {/* Okundu / Okunmadı satırı — MOR */}
                  {!!total && (
                    <View style={s.progressMetaRow}>

                      {/* DOWNLOAD */}
                      <View style={s.downloadPill}>
                        <Text style={s.downloadPillTxt}>
                          {dlCount}/{total} yüklenen
                        </Text>
                      </View>

                      {/* READ */}
                      <View style={s.readPill}>
                        <Text style={s.readPillTxt}>
                          {readCount}/{total} okundu
                        </Text>
                      </View>

                    </View>
                  )}  
                  
                </View>

                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <AddMangaModal
        visible={modalVisible}
        mode={modalMode}
        onSave={handleSaveManga}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
};

export default HomeScreen;

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 18 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 5,
    paddingTop: 28,
  },
  appSub: { fontSize: 11, color: '#9e9e9eff', marginTop: 3, letterSpacing: 0.5 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AMBER,
    marginTop: 10,
  },

  btnRow:   { flexDirection: 'row', gap: 12, marginBottom: 30 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnIcon:  { fontSize: 16, fontWeight: '900' },
  btnLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  sectionLbl: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9e9e9eff',
    letterSpacing: 3,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 14,
  },
  viewAll: { fontSize: 13, fontWeight: '700', color: AMBER },

  // ── Recent ──────────────────────────────────────────────────────────────────
  recentCard: { marginRight: 14, width: 132 },
  recentImg: {
    width: 132,
    height: 196,           // büyütüldü
    borderRadius: 14,
    justifyContent: 'flex-end',
  },
  recentOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  recentPlaceholder: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#1F1F24',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  recentTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingBottom: 10,
    lineHeight: 16,
  },
  recentTitleDark: {
    color: '#666',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 6,
    lineHeight: 16,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: AMBER,
    borderRadius: 8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: BG, fontSize: 10, fontWeight: '900' },

  // ── Koleksiyon kartı ────────────────────────────────────────────────────────
  mangaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F1F24',
    marginBottom: 12,
    overflow: 'hidden',
  },

  cardCoverWrap: { position: 'relative',padding: 4 },
  cardCover:     { width: 100, height: 140, borderRadius: 18, borderWidth: 1 },   
  cardCoverPh: {
    backgroundColor: '#1A1A1E',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sol üst badge stack
  cardBadgeStack: {
    position: 'absolute',
    top: 6,
    left: 6,
    gap: 4,
  },
  cardBadge: {
    borderRadius: 7,
    minWidth: 28,
    paddingHorizontal: 5,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeAmber:  { backgroundColor: AMBER },
  cardBadgeViolet: { backgroundColor: VIOLET },
  cardBadgeTxt: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  cardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 14 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EDEDF0',
    lineHeight: 20,
    marginBottom: 3,
  },
  cardMeta: { fontSize: 11, color: '#9e9e9eff', marginBottom: 10 },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  progressBg: {
    flex: 1,
    height: 2,
    backgroundColor: '#222',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFillLoad: { height: 2, backgroundColor: AMBER, borderRadius: 1 },
  progressFillRead: { height: 2, backgroundColor: VIOLET, borderRadius: 1 },
  progressLbl:  { fontSize: 10, color: '#9e9e9eff', fontWeight: '700' },

  // Okundu pill — mor
  readPill: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
    borderRadius: 7,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  readPillTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: VIOLET,
    letterSpacing: 0.2,
  },

  // Okundu pill — mor
  downloadPill: {
    backgroundColor: 'rgba(245,166,35,0.15)',
    borderWidth: 1,
    flexShrink: 0,
    borderColor: 'rgba(245,166,35,0.35)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  downloadPillTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: AMBER,
    letterSpacing: 0.2,
  },

  progressMetaRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 2,
},

  chevron: { fontSize: 22, color: '#222', paddingRight: 14 },

  empty:      { alignItems: 'center', paddingTop: 64, paddingBottom: 40 },
  emptyEmoji: { fontSize: 42, marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#9e9e9eff' },
  emptyHint:  { fontSize: 13, color: '#252528', marginTop: 5 },
});