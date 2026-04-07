import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [link, setLink] = useState('');

  const handleDownload = () => {
    navigation.navigate('Manga', { mangaLink: link });
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Manga linkini gir"
        value={link}
        onChangeText={setLink}
        style={styles.input}
      />
      <Button title="İndir" onPress={handleDownload} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 20 },
});

export default HomeScreen;