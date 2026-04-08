import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface Manga {
  title: string;
  lastOpened?: string;
  cover?: string;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [uploadedMangas, setUploadedMangas] = useState<Manga[]>([]);
  const [recentMangas, setRecentMangas] = useState<Manga[]>([]);

  useEffect(() => {
    const exampleMangas: Manga[] = [
      { title: 'One Piece', lastOpened: '2026-04-08', cover: 'https://via.placeholder.com/100x150' },
      { title: 'Naruto', lastOpened: '2026-04-07', cover: 'https://via.placeholder.com/100x150' },
      { title: 'Bleach', lastOpened: '2026-04-06', cover: 'https://via.placeholder.com/100x150' },
      { title: 'Dragon Ball', lastOpened: '2026-04-05', cover: 'https://via.placeholder.com/100x150' },
      { title: 'Attack on Titan', lastOpened: '2026-04-04', cover: 'https://via.placeholder.com/100x150' }
    ];
    setUploadedMangas(exampleMangas);
    setRecentMangas(exampleMangas.slice(0, 3));
  }, []);

  const handleAddNew = () => {
    navigation.navigate('Home'/* 'AddManga' */);
  };

  const handleOpenManga = (manga: Manga) => {
    navigation.navigate('Manga', { mangaLink: manga.title });
  };

  const handleViewAll = () => {
    navigation.navigate(/* 'AllMangas', { mangas: uploadedMangas } */'Home');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Yeni Manga Ekle */}
      <TouchableOpacity style={styles.addCard} onPress={handleAddNew}>
        <Text style={styles.addText}>+ Yeni Manga Ekle</Text>
      </TouchableOpacity>

      {/* Son Kullanılanlar Slider */}
      <Text style={styles.sectionTitle}>Son Kullanılanlar</Text>
      <FlatList
        horizontal
        data={recentMangas}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.recentCard} onPress={() => handleOpenManga(item)}>
            <Image source={{ uri: item.cover }} style={styles.coverImage} />
            <Text style={styles.mangaTitle}>{item.title}</Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
      />

      {/* Yüklenen Mangalar Başlığı + Tümünü Görüntüle */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Yüklenen Mangalar</Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text style={styles.viewAllText}>Tümünü Görüntüle</Text>
        </TouchableOpacity>
      </View>

      {/* Yüklenen Mangalar Listesi */}
      <FlatList
        data={uploadedMangas.slice(0, 3)} // sadece ilk 3 göster, tümünü görmek için buton
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.mangaCard} onPress={() => handleOpenManga(item)}>
            <Image source={{ uri: item.cover }} style={styles.coverImage} />
            <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
              <Text style={styles.mangaTitle}>{item.title}</Text>
              {item.lastOpened && <Text style={styles.lastOpened}>Son Açılış: {item.lastOpened}</Text>}
            </View>
          </TouchableOpacity>
        )}
        scrollEnabled={false} // ScrollView içinde
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 15 },
  addCard: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  addText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  viewAllText: { color: '#4A90E2', fontSize: 14, fontWeight: 'bold' },
  recentCard: { marginRight: 15, width: 100, alignItems: 'center' },
  coverImage: { width: 100, height: 150, borderRadius: 8 },
  mangaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f2f2f2',
    padding: 10,
    borderRadius: 10
  },
  mangaTitle: { fontSize: 16, fontWeight: 'bold' },
  lastOpened: { fontSize: 12, color: '#666', marginTop: 5 }
});

export default HomeScreen;