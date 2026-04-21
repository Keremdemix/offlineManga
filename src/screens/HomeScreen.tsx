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

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface Manga {
  title: string;
  lastOpened?: string;
  cover?: string;
  totalChapters?: number;
  downloadedChapters?: number;
}

const AMBER = '#F5A623';
const BG = '#0C0C0E';
const CARD = '#141416';
const BORDER = '#1F1F24';

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [uploadedMangas, setUploadedMangas] = useState<Manga[]>([]);
  const [recentMangas, setRecentMangas] = useState<Manga[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'manga' | 'chapter'>('manga');

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
          totalChapters: m.chapters?.length || 0,
          downloadedChapters:
            m.chapters?.filter((c: any) => c.downloaded).length || 0,
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

  useEffect(() => {
    loadMangas();
  }, [loadMangas]);

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
                      imageStyle={{ borderRadius: 12 }}
                    >
                      {/* dark overlay at bottom */}
                      <View style={s.recentOverlay} />
                      <Text style={s.recentTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </ImageBackground>
                  ) : (
                    <View style={[s.recentImg, s.recentPlaceholder]}>
                      <Text style={{ fontSize: 28 }}>📖</Text>
                      <Text style={s.recentTitleDark} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                  )}
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
            const dlPct = item.totalChapters
              ? Math.round(
                  ((item.downloadedChapters ?? 0) / item.totalChapters) * 100,
                )
              : 0;
            return (
              <TouchableOpacity
                key={item.title}
                style={s.mangaCard}
                onPress={() => handleOpenManga(item)}
                activeOpacity={0.8}
              >
                {item.cover ? (
                  <Image source={{ uri: item.cover }} style={s.cardCover} />
                ) : (
                  <View style={[s.cardCover, s.cardCoverPh]}>
                    <Text style={{ fontSize: 24 }}>📖</Text>
                  </View>
                )}
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={s.cardMeta}>{item.totalChapters} bölüm</Text>
                  {!!item.totalChapters && (
                    <View style={s.progressWrap}>
                      <View style={s.progressBg}>
                        <View
                          style={[s.progressFill, { width: `${dlPct}%` }]}
                        />
                      </View>
                      <Text style={s.progressLbl}>
                        {item.downloadedChapters}/{item.totalChapters}
                      </Text>
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
  root: { flex: 1, backgroundColor: BG },
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
  appSub: {
    fontSize: 11,
    color: '#9e9e9eff',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AMBER,
    marginTop: 10,
  },

  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnIcon: { fontSize: 16, fontWeight: '900' },
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

  // Recent
  recentCard: { marginRight: 12, width: 115 },
  recentImg: {
    width: 115,
    height: 168,
    borderRadius: 12,
    justifyContent: 'flex-end',
  },
  recentOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  recentPlaceholder: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  recentTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingBottom: 9,
    lineHeight: 15,
  },
  recentTitleDark: {
    color: '#666',
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 6,
    lineHeight: 15,
  },
  badge: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: AMBER,
    borderRadius: 8,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: BG, fontSize: 10, fontWeight: '900' },

  // Manga card
  mangaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardCover: { width: 68, height: 96 },
  cardCoverPh: {
    backgroundColor: '#1A1A1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EDEDF0',
    lineHeight: 19,
    marginBottom: 3,
  },
  cardMeta: { fontSize: 11, color: '#9e9e9eff', marginBottom: 10 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: {
    flex: 1,
    height: 2,
    backgroundColor: '#222',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: { height: 2, backgroundColor: AMBER, borderRadius: 1 },
  progressLbl: { fontSize: 10, color: '#9e9e9eff', fontWeight: '700' },
  chevron: { fontSize: 20, color: '#222', paddingRight: 14 },

  empty: { alignItems: 'center', paddingTop: 64, paddingBottom: 40 },
  emptyEmoji: { fontSize: 42, marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#9e9e9eff' },
  emptyHint: { fontSize: 13, color: '#252528', marginTop: 5 },
});
