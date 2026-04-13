// screens/HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
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

  const loadMangas = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('localMangas');
      if (data) {
        const parsed = JSON.parse(data);

        const mapped: Manga[] = parsed.map((m: any) => ({
          title: m.title,
          cover: m.cover || null,
          lastOpened: m.lastOpened || m.chapters?.[m.chapters.length - 1]?.date?.slice(0, 10),
          totalChapters: m.chapters?.length || 0,
          downloadedChapters: m.chapters?.filter((c: any) => c.downloaded).length || 0,
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Başlık */}
        <View style={styles.topBar}>
          <Text style={styles.appName}>📚 MangaBox</Text>
          <Text style={styles.appSub}>{uploadedMangas.length} manga</Text>
        </View>

        {/* Ekle butonu */}
        <TouchableOpacity style={styles.addCard} onPress={() => setModalVisible(true)}>
          <Text style={styles.addIcon}>＋</Text>
          <Text style={styles.addText}>Yeni Manga Ekle</Text>
        </TouchableOpacity>

        {/* Son kullanılanlar */}
        {recentMangas.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Son Kullanılanlar</Text>
            <FlatList
              horizontal
              data={recentMangas}
              keyExtractor={(item) => item.title}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recentCard}
                  onPress={() => handleOpenManga(item)}
                  activeOpacity={0.75}
                >
                  {item.cover ? (
                    <Image source={{ uri: item.cover }} style={styles.recentCover} />
                  ) : (
                    <View style={styles.recentCoverPlaceholder}>
                      <Text style={styles.placeholderEmoji}>📖</Text>
                    </View>
                  )}
                  {/* İndirme rozeti */}
                  {(item.downloadedChapters ?? 0) > 0 && (
                    <View style={styles.downloadBadge}>
                      <Text style={styles.downloadBadgeText}>
                        {item.downloadedChapters}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.recentTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </>
        )}

        {/* Tüm mangalar başlık */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Yüklenen Mangalar</Text>
          {uploadedMangas.length > 5 && (
            <TouchableOpacity onPress={handleViewAll}>
              <Text style={styles.viewAllText}>Tümünü Gör →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Liste */}
        {uploadedMangas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗂️</Text>
            <Text style={styles.emptyText}>Henüz manga eklenmedi</Text>
            <Text style={styles.emptyHint}>
              Yukarıdaki butona tıklayarak ekle
            </Text>
          </View>
        ) : (
          <FlatList
            data={uploadedMangas.slice(0, 5)}
            keyExtractor={(item) => item.title}
            renderItem={({ item }) => {
              const allDownloaded =
                (item.totalChapters ?? 0) > 0 &&
                item.downloadedChapters === item.totalChapters;
              const partialDownload =
                (item.downloadedChapters ?? 0) > 0 && !allDownloaded;

              return (
                <TouchableOpacity
                  style={styles.mangaCard}
                  onPress={() => handleOpenManga(item)}
                  activeOpacity={0.8}
                >
                  {/* Kapak */}
                  {item.cover ? (
                    <Image source={{ uri: item.cover }} style={styles.cardCover} />
                  ) : (
                    <View style={[styles.cardCover, styles.cardCoverPlaceholder]}>
                      <Text style={{ fontSize: 28 }}>📖</Text>
                    </View>
                  )}

                  {/* Metin */}
                  <View style={styles.cardText}>
                    <Text style={styles.mangaTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {/* Bölüm / indirme durumu */}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>
                        {item.totalChapters} bölüm
                      </Text>
                      {allDownloaded && (
                        <View style={[styles.statusPill, styles.pillGreen]}>
                          <Text style={styles.pillText}>✓ Tamamı indirildi</Text>
                        </View>
                      )}
                      {partialDownload && (
                        <View style={[styles.statusPill, styles.pillBlue]}>
                          <Text style={styles.pillText}>
                            {item.downloadedChapters}/{item.totalChapters} indirildi
                          </Text>
                        </View>
                      )}
                    </View>

                    {item.lastOpened && (
                      <Text style={styles.lastOpened}>
                        {item.lastOpened}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            }}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      <AddMangaModal
        visible={modalVisible}
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
    color: '#555',
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
    gap: 8,
  },
  addIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  addText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ccc',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  viewAllText: {
    color: '#4A90E2',
    fontSize: 13,
    fontWeight: '700',
  },
  // Recent
  recentCard: {
    marginRight: 12,
    width: 100,
    position: 'relative',
  },
  recentCover: {
    width: 100,
    height: 148,
    borderRadius: 10,
    marginBottom: 6,
  },
  recentCoverPlaceholder: {
    width: 100,
    height: 148,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  downloadBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
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
  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#bbb',
    lineHeight: 16,
  },
  // Manga card
  mangaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    padding: 12,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  cardCover: {
    width: 56,
    height: 80,
    borderRadius: 8,
  },
  cardCoverPlaceholder: {
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    marginLeft: 12,
  },
  mangaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e8e8e8',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    color: '#555',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    fontWeight: '700',
    color: '#4A90E2',
  },
  lastOpened: {
    fontSize: 11,
    color: '#444',
    marginTop: 5,
  },
  chevron: {
    fontSize: 22,
    color: '#333',
    marginLeft: 8,
  },
  // Empty
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
    color: '#555',
    fontWeight: '700',
  },
  emptyHint: {
    fontSize: 13,
    color: '#333',
    marginTop: 6,
  },
});