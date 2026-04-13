// screens/ChaptersScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  downloadChapter,
  DownloadProgress,
} from '../actions/downloadActions';
import { extractChapterNumber } from '../utils/chapterUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'Chapters'>;

interface Chapter {
  id: string;
  link: string;
  label?: string;
  chapterNumber?: number;
  date: string;
  pages?: string[];
  downloaded?: boolean;
  downloading?: boolean;
}

const ChaptersScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mangaTitle } = route.params;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [progresses, setProgresses] = useState<
    Record<string, DownloadProgress>
  >({});

  const activeDownloads = useRef<Set<string>>(new Set());

  // =========================
  // LOAD + FIX CHAPTERS
  // =========================
  const loadChapters = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('localMangas');
      if (!data) return;

      const parsed = JSON.parse(data);

      const mangaIndex = parsed.findIndex(
        (m: any) => m.title === mangaTitle
      );

      if (mangaIndex === -1) return;

      const manga = parsed[mangaIndex];
      let updated = false;

      const fixedChapters: Chapter[] = (manga.chapters || []).map(
        (c: any) => {
          const chapter: Chapter = { ...c };

          // 🔥 SAFE chapterNumber fix
          if (
            chapter.chapterNumber == null ||
            isNaN(Number(chapter.chapterNumber))
          ) {
            const num = extractChapterNumber(chapter.link);
            if (num != null && !isNaN(num)) {
              chapter.chapterNumber = num;
              updated = true;
            }
          }

          return chapter;
        }
      );

      // 🔥 save back only if needed
      if (updated) {
        parsed[mangaIndex].chapters = fixedChapters;
        await AsyncStorage.setItem(
          'localMangas',
          JSON.stringify(parsed)
        );
      }

      // 🔥 stable sort (NEW → OLD)
      const sorted = [...fixedChapters].sort((a, b) => {
        const aNum = a.chapterNumber ?? -1;
        const bNum = b.chapterNumber ?? -1;

        if (aNum !== -1 && bNum !== -1) {
          return bNum - aNum;
        }

        const aDate = a.date ?? '';
        const bDate = b.date ?? '';

        return bDate.localeCompare(aDate);
      });

      setChapters([...sorted]);
    } catch (e) {
      console.error('Chapter load error:', e);
    } finally {
      setLoading(false);
    }
  }, [mangaTitle]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  // =========================
  // DOWNLOAD
  // =========================
  const handleDownload = async (chapter: Chapter) => {
    if (activeDownloads.current.has(chapter.id)) return;

    activeDownloads.current.add(chapter.id);

    await downloadChapter(
      mangaTitle,
      chapter.id,
      chapter.link,
      (p) => {
        setProgresses((prev) => ({
          ...prev,
          [chapter.id]: p,
        }));

        if (p.status === 'done' || p.status === 'error') {
          activeDownloads.current.delete(chapter.id);
          loadChapters();
        }
      }
    );
  };

  // =========================
  // OPEN CHAPTER
  // =========================
  const openChapter = (chapter: Chapter) => {
    if (chapter.downloaded && chapter.pages?.length) {
      navigation.navigate('Manga', {
        mangaLink: chapter.link,
        localPages: chapter.pages,
      });
    } else {
      navigation.navigate('Manga', {
        mangaLink: chapter.link,
      });
    }
  };

  // =========================
  // STATUS UI
  // =========================
  const getStatusIcon = (
    chapter: Chapter,
    progress?: DownloadProgress
  ) => {
    if (progress?.status === 'downloading') {
      const pct =
        progress.total > 0
          ? Math.round((progress.current / progress.total) * 100)
          : 0;

      return { icon: '↓', color: '#4A90E2', label: `${pct}%` };
    }

    if (progress?.status === 'error') {
      return { icon: '✕', color: '#e74c3c', label: 'Hata' };
    }

    if (chapter.downloaded) {
      return { icon: '✓', color: '#2ecc71', label: 'İndirildi' };
    }

    return { icon: '↓', color: '#aaa', label: 'İndir' };
  };

  // =========================
  // UI STATES
  // =========================
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>{mangaTitle}</Text>
        <Text style={styles.subtitle}>
          {chapters.length} bölüm ·{' '}
          {chapters.filter((c) => c.downloaded).length} indirildi
        </Text>
      </View>

      {/* LIST */}
      <FlatList
        data={chapters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => {
          const progress = progresses[item.id];
          const isDownloading =
            progress?.status === 'downloading';
          const status = getStatusIcon(item, progress);

          return (
            <View style={styles.chapterRow}>
              {/* INFO */}
              <TouchableOpacity
                style={styles.chapterInfo}
                onPress={() => openChapter(item)}
              >
                <Text style={styles.chapterText}>
                {item.chapterNumber != null
                    ? `Bölüm ${item.chapterNumber}`
                    : `Bilinmeyen (raw: ${JSON.stringify(item.chapterNumber)})`}
                </Text>

                <Text style={styles.date}>
                  {item.date?.slice(0, 10)}
                </Text>

                {isDownloading && progress?.total > 0 && (
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${
                            (progress.current / progress.total) *
                            100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>

              {/* BUTTON */}
              <TouchableOpacity
                style={[
                  styles.downloadBtn,
                  item.downloaded && styles.downloadedBtn,
                  isDownloading && styles.downloadingBtn,
                ]}
                onPress={() => {
                  if (item.downloaded) {
                    Alert.alert('Tekrar indir?', '', [
                      { text: 'İptal', style: 'cancel' },
                      {
                        text: 'İndir',
                        onPress: () => handleDownload(item),
                      },
                    ]);
                  } else {
                    handleDownload(item);
                  }
                }}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator
                    size="small"
                    color="#4A90E2"
                  />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.downloadIcon,
                        { color: status.color },
                      ]}
                    >
                      {status.icon}
                    </Text>
                    <Text
                      style={[
                        styles.downloadLabel,
                        { color: status.color },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
};

export default ChaptersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  chapterInfo: {
    flex: 1,
    marginRight: 12,
  },
  chapterText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e8e8e8',
  },
  date: {
    fontSize: 11,
    color: '#555',
    marginTop: 3,
  },
  progressBarBg: {
    marginTop: 6,
    height: 3,
    backgroundColor: '#222',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
  downloadBtn: {
    width: 60,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  downloadedBtn: {
    backgroundColor: '#0d2b1a',
  },
  downloadingBtn: {
    backgroundColor: '#0d1f2b',
  },
  downloadIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  downloadLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});