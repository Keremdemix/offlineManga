import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AllMangas'>;

interface Manga {
  title: string;
  cover?: string;
  lastOpened?: string;
}

const numColumns = 2;
const windowWidth = Dimensions.get('window').width;
const cardWidth = (windowWidth - 45) / numColumns; // margin ve padding ile uyumlu

const AllMangasScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mangas } = route.params as { mangas: Manga[] };

  const handleOpenManga = (manga: Manga) => {
    navigation.navigate('Manga', { mangaLink: manga.title });
  };

  const renderMangaCard = ({ item }: { item: Manga }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleOpenManga(item)}>
      <Image source={{ uri: item.cover }} style={styles.coverImage} />
      <Text style={styles.title}>{item.title}</Text>
      {item.lastOpened && <Text style={styles.lastOpened}>Son Açılış: {item.lastOpened}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tüm Mangalar</Text>
      <FlatList
        data={mangas}
        keyExtractor={(item) => item.title}
        renderItem={renderMangaCard}
        numColumns={numColumns}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 15 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  row: { justifyContent: 'space-between', marginBottom: 15 },
  card: {
    width: cardWidth,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center'
  },
  coverImage: { width: '100%', height: cardWidth * 1.5, borderRadius: 8, marginBottom: 10 },
  title: { fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  lastOpened: { fontSize: 12, color: '#888', marginTop: 5, textAlign: 'center' }
});

export default AllMangasScreen;