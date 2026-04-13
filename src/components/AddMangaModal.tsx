// components/AddMangaModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadChapter } from '../actions/downloadActions';
import { extractChapterNumber} from '../utils/chapterUtils';

interface Manga {
  title: string;
  cover?: string;
  chapters: { 
  id: string; 
  link: string; 
  label: string;
  chapterNumber?: number;
  date: string; 
  pages: string[]; 
  downloading: boolean; 
  downloaded: boolean 
}[];
}

interface Props {
  visible: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const AddMangaModal: React.FC<Props> = ({ visible, onSave, onCancel }) => {
  const [mangas, setMangas]               = useState<Manga[]>([]);
  const [selectedManga, setSelectedManga] = useState('');
  const [newTitle, setNewTitle]           = useState('');
  const [cover, setCover]                 = useState('');
  const [chapterLink, setChapterLink]     = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem('localMangas').then((data) => {
      if (data) setMangas(JSON.parse(data));
    });
  }, [visible]);

  const reset = () => {
    setSelectedManga('');
    setNewTitle('');
    setCover('');
    setChapterLink('');
    setIsCreatingNew(false);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

const handleSave = async () => {
  const resolvedTitle = isCreatingNew
    ? newTitle.trim()
    : selectedManga.trim();

  if (!resolvedTitle || !chapterLink.trim()) return;

  const data = await AsyncStorage.getItem('localMangas');
  let storedMangas: Manga[] = data ? JSON.parse(data) : [];

  // 🔥 chapter numarasını çıkar
  const chapterNum = extractChapterNumber(chapterLink.trim());

  const newChapter = {
    id: Date.now().toString(),
    link: chapterLink.trim(),
    label: `Bölüm ${chapterNum || 'Yeni'}`,
    chapterNumber: chapterNum || undefined,
    date: new Date().toISOString(),
    pages: [],
    downloading: true,
    downloaded: false,
  };

  const existing = storedMangas.find((m) => m.title === resolvedTitle);

  if (existing) {
    // 🔥 duplicate kontrol (fixli)
    const exists = existing.chapters.some((c) => {
      if (newChapter.chapterNumber && c.chapterNumber) {
        return c.chapterNumber === newChapter.chapterNumber;
      }
      return c.link === newChapter.link;
    });

    if (exists) {
      Alert.alert('Bu bölüm zaten eklenmiş');
      return;
    }

    // 🔥 ekle
    existing.chapters.push(newChapter);

    // 🔥 sırala (küçük → büyük)
    existing.chapters.sort((a, b) => {
      if (a.chapterNumber && b.chapterNumber) {
        return a.chapterNumber - b.chapterNumber;
      }
      return a.date.localeCompare(b.date);
    });

  } else {
    // 🔥 yeni manga

    storedMangas.push({
      title: resolvedTitle,
      cover: cover.trim() || undefined,
      chapters: [newChapter],
    });
  }

  await AsyncStorage.setItem('localMangas', JSON.stringify(storedMangas));

  reset();
  onSave();

  // 🔥 background download
  downloadChapter(resolvedTitle, newChapter.id, newChapter.link);
};

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.heading}>Manga Ekle</Text>

          <FlatList
            data={[...mangas.map((m) => m.title), '➕ Yeni Manga Oluştur']}
            keyExtractor={(item) => item}
            style={styles.list}
            renderItem={({ item }) => {
              const isNew      = item === '➕ Yeni Manga Oluştur';
              const isSelected = !isNew && selectedManga === item;
              return (
                <TouchableOpacity
                  style={[styles.item, isSelected && styles.itemSelected]}
                  onPress={() => {
                    if (isNew) {
                      setIsCreatingNew(true);
                      setSelectedManga('');
                    } else {
                      setIsCreatingNew(false);
                      setSelectedManga(item);
                    }
                  }}
                >
                  <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {isCreatingNew && (
            <>
              <TextInput
                placeholder="Manga Adı"
                placeholderTextColor="#aaa"
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TextInput
                placeholder="Kapak URL (opsiyonel)"
                placeholderTextColor="#aaa"
                style={styles.input}
                value={cover}
                onChangeText={setCover}
              />
            </>
          )}

          {!isCreatingNew && selectedManga !== '' && (
            <Text style={styles.selectedLabel}>Seçilen: {selectedManga}</Text>
          )}

          <TextInput
            placeholder="Chapter Link"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={chapterLink}
            onChangeText={setChapterLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <View style={styles.buttons}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddMangaModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  list: {
    maxHeight: 160,
    marginBottom: 4,
  },
  item: {
    padding: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 6,
  },
  itemSelected: {
    backgroundColor: '#e8f0fb',
  },
  itemText: {
    color: '#333',
    fontSize: 14,
  },
  itemTextSelected: {
    color: '#4A90E2',
    fontWeight: '700',
  },
  selectedLabel: {
    marginTop: 8,
    fontWeight: 'bold',
    color: '#4A90E2',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    fontSize: 14,
    color: '#222',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
  },
  saveText: {
    color: '#4A90E2',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
