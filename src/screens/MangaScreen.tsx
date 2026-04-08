import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { downloadMangaChapter } from '../services/mangaService';

type Props = NativeStackScreenProps<RootStackParamList, 'Manga'>;

const windowWidth = Dimensions.get('window').width;

const MangaScreen: React.FC<Props> = ({ route }) => {
  const { mangaLink } = route.params;
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const localPaths = await downloadMangaChapter(mangaLink);
        setPages(localPaths);
      } catch (error) {
        console.error("Manga yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [mangaLink]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#000" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={pages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => <MangaPage imagePath={item} />}
        // Performans ayarları
        removeClippedSubviews={true}
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

  useEffect(() => {
    // Görüntünün orijinal boyutlarını alıp oranını hesaplıyoruz
    Image.getSize(
      `file://${imagePath}`,
      (width, height) => {
        if (width > 0 && height > 0) {
          setAspectRatio(width / height);
        }
      },
      (error) => console.error("Boyut alınamadı:", error)
    );
  }, [imagePath]);

  return (
    <Image
      source={{ uri: `file://${imagePath}` }}
      style={{
        width: windowWidth,
        // Genişlik sabit olduğu için yüksekliği orana göre belirliyoruz
        height: windowWidth / aspectRatio, 
        backgroundColor: '#f0f0f0' // Yüklenirken gri alan görünür
      }}
      resizeMode="cover" // Kenar boşluğu kalmaması için
    />
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  }
});

export default MangaScreen;