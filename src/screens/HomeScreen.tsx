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
          (b.lastOpened || '').localeCompare(a.lastOpened || '')
        );
        setRecentMangas(sorted.slice(0, 5));
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

  const handleOpenManga = (manga: Manga) => {
    navigation.navigate('Chapters', { mangaTitle: manga.title });
  };

  const handleViewAll = () => {
    navigation.navigate('AllMangas', { mangas: uploadedMangas });
  };

  const topMangas = uploadedMangas.slice(0, 3);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* HEADER */}
      <View style={styles.topBar}>
        <Text style={styles.appName}>📚 MangaBox</Text>
        <Text style={styles.appSub}>{uploadedMangas.length} manga</Text>
      </View>

      {/* ACTION BUTTONS */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#4A90E2' }]}
          onPress={() => {
            setModalMode('manga');
            setModalVisible(true);
          }}
        >
          <Text style={styles.actionText}>➕ Manga Ekle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#ff8c42' }]}
          onPress={() => {
            setModalMode('chapter');
            setModalVisible(true);
          }}
        >
          <Text style={styles.actionText}>📥 Bölüm Ekle</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>

        {/* SON KULLANILANLAR */}
        {recentMangas.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Son Kullanılanlar</Text>

            <FlatList
              horizontal
              data={recentMangas}
              keyExtractor={(item) => item.title}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recentCard}
                  onPress={() => handleOpenManga(item)}
                >
                  {item.cover ? (
                    <Image source={{ uri: item.cover }} style={styles.recentCover} />
                  ) : (
                    <View style={styles.recentCoverPlaceholder}>
                      <Text style={styles.placeholderEmoji}>📖</Text>
                    </View>
                  )}

                  <Text style={styles.recentTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {/* BAŞLIK + VIEW ALL */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yüklenen Mangalar</Text>

          <TouchableOpacity onPress={handleViewAll}>
            <Text style={styles.viewAllText}>Tümünü Gör →</Text>
          </TouchableOpacity>
        </View>

        {/* SADECE 3 MANGA */}
        {topMangas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗂️</Text>
            <Text style={styles.emptyText}>Henüz manga eklenmedi</Text>
          </View>
        ) : (
          topMangas.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.mangaCard}
              onPress={() => handleOpenManga(item)}
            >
              {item.cover ? (
                <Image source={{ uri: item.cover }} style={styles.cardCover} />
              ) : (
                <View style={styles.cardCoverPlaceholder}>
                  <Text style={{ fontSize: 28 }}>📖</Text>
                </View>
              )}

              <View style={styles.cardText}>
                <Text style={styles.mangaTitle}>{item.title}</Text>

                <Text style={styles.metaText}>
                  {item.totalChapters} bölüm
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <AddMangaModal
        visible={modalVisible}
        mode={modalMode}   // 🔥 BURASI ÖNEMLİ
        onSave={handleSaveManga}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
};

export default HomeScreen;
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },

  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },

  appSub: {
    fontSize: 13,
    color: '#666',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#d0d0d0',
    marginBottom: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },

  viewAllText: {
    color: '#4A90E2',
    fontSize: 13,
    fontWeight: '800',
  },

  content: {
    flex: 1,
  },

  // ================= BUTTONS =================
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },

  actionBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },

  actionText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },

  // ================= RECENT =================
  recentCard: {
    marginRight: 14,
    width: 120,
  },

  recentCover: {
    width: 120,
    height: 170,
    borderRadius: 14,
    marginBottom: 6,
  },

  recentCoverPlaceholder: {
    width: 120,
    height: 170,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  placeholderEmoji: {
    fontSize: 34,
  },

  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#bbb',
    lineHeight: 16,
  },

  downloadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  downloadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  // ================= MANGA CARD =================
  mangaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
  },

  cardCover: {
    width: 85,
    height: 115,
    borderRadius: 12,
  },

  cardCoverPlaceholder: {
    width: 85,
    height: 115,
    borderRadius: 12,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardText: {
    flex: 1,
    marginLeft: 14,
  },

  mangaTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 6,
  },

  metaText: {
    color: '#888',
    fontSize: 12,
  },

  lastOpened: {
    fontSize: 11,
    color: '#555',
    marginTop: 5,
  },

  chevron: {
    fontSize: 22,
    color: '#555',
    marginLeft: 8,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  pillGreen: {
    backgroundColor: '#0d2b1a',
  },

  pillBlue: {
    backgroundColor: '#0d1f2b',
  },

  pillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4A90E2',
  },

  // ================= EMPTY =================
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },

  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '700',
  },

  emptyHint: {
    fontSize: 13,
    color: '#333',
    marginTop: 6,
  },
});