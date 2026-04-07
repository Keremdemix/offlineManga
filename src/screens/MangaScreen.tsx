import React from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import * as nativeStack from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = nativeStack.NativeStackScreenProps<RootStackParamList, 'Manga'>;

const MangaScreen: React.FC<Props> = ({ route }) => {
  const { mangaLink } = route.params;

  const pages = [
    'https://placekitten.com/200/300',
    'https://placekitten.com/300/300',
    'https://placekitten.com/400/300',
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.linkText}>Manga Link: {mangaLink}</Text>
      <FlatList
        data={pages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  linkText: { marginBottom: 10 },
  image: { width: '100%', height: 300, marginBottom: 10 },
});

export default MangaScreen;