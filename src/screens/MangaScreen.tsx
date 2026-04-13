// screens/MangaScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Text,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { downloadMangaChapter } from '../services/mangaService';

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

const windowWidth = Dimensions.get('window').width;

const MangaScreen: React.FC<Props> = ({ route }) => {
  const { mangaLink, localPages } = route.params;

  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Bölüm zaten indirilmişse direkt göster — network isteği yok
    if (localPages && localPages.length > 0) {
      setPages(localPages);
      setLoading(false);
      return;
    }

    // İndirilmemişse online çek
    (async () => {
      try {
        const result = await downloadMangaChapter(mangaLink);

        if (result.error || result.pages.length === 0) {
          setError(result.error ?? 'Sayfa bulunamadı');
        } else {
          setPages(result.pages); // ← result.pages — DownloadResult tipine uygun
        }
      } catch (e) {
        setError(String(e));
        console.error('Manga yüklenirken hata:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [mangaLink, localPages]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => <MangaPage imagePath={item} />}
        removeClippedSubviews
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const MangaPage: React.FC<{ imagePath: string }> = ({ imagePath }) => {
  const [aspectRatio, setAspectRatio] = useState(1);

  // Local dosya mı yoksa uzak URL mi?
  const uri = imagePath.startsWith('http')
    ? imagePath
    : `file://${imagePath}`;

  useEffect(() => {
    Image.getSize(
      uri,
      (width, height) => {
        if (width > 0 && height > 0) setAspectRatio(width / height);
      },
      (e) => console.error('Boyut alınamadı:', e)
    );
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={{
        width: windowWidth,
        height: windowWidth / aspectRatio,
        backgroundColor: '#111',
      }}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    gap: 12,
  },
  loadingText: {
    color: '#555',
    fontSize: 14,
  },
  errorEmoji: {
    fontSize: 40,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default MangaScreen;