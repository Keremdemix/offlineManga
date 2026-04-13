import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractChapterNumber } from '../utils/chapterUtils';

interface Manga {
  title: string;
}

interface Props {
  visible: boolean;
  mode: 'manga' | 'chapter';   // 🔥 DIŞARIDAN GELİYOR
  onSave: () => void;
  onCancel: () => void;
}

const AddMangaModal: React.FC<Props> = ({
  visible,
  mode,
  onSave,
  onCancel,
}) => {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [search, setSearch] = useState('');
  const [selectedManga, setSelectedManga] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [cover, setCover] = useState('');
  const [chapterLink, setChapterLink] = useState('');

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
  };

  const handleClose = () => {
    reset();
    onCancel();
  };

  // ---------------- SAVE MANGA ----------------
  const handleSaveManga = async () => {
    if (!newTitle.trim()) return;

    const data = await AsyncStorage.getItem('localMangas');
    let stored = data ? JSON.parse(data) : [];

    stored.push({
      title: newTitle.trim(),
      cover: cover.trim() || undefined,
      chapters: [],
    });

    await AsyncStorage.setItem('localMangas', JSON.stringify(stored));

    reset();
    onSave();
  };

  // ---------------- SAVE CHAPTER ----------------
  const handleSaveChapter = async () => {
    if (!selectedManga || !chapterLink.trim()) return;

    const data = await AsyncStorage.getItem('localMangas');
    let stored = data ? JSON.parse(data) : [];

    const chapterNum = extractChapterNumber(chapterLink);

    const newChapter = {
      id: Date.now().toString(),
      link: chapterLink.trim(),
      chapterNumber: chapterNum ?? null,
      label: chapterNum ? `Bölüm ${chapterNum}` : 'Bilinmeyen',
      date: new Date().toISOString(),
      pages: [],
      downloaded: false,
      downloading: true,
    };

    stored = stored.map((m: any) => {
      if (m.title !== selectedManga) return m;

      return {
        ...m,
        chapters: [...m.chapters, newChapter],
      };
    });

    await AsyncStorage.setItem('localMangas', JSON.stringify(stored));

    reset();
    onSave();
  };

  // ---------------- UI ----------------
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>

          {/* MANGA MODE */}
          {mode === 'manga' && (
            <>
              <Text style={styles.title}>Yeni Manga</Text>

              <TextInput
                placeholder="Manga Adı"
                placeholderTextColor="#666"
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <TextInput
                placeholder="Kapak URL"
                placeholderTextColor="#666"
                style={styles.input}
                value={cover}
                onChangeText={setCover}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveManga}>
                <Text style={styles.saveText}>Kaydet</Text>
              </TouchableOpacity>
            </>
          )}

          {/* CHAPTER MODE */}
          {mode === 'chapter' && (
            <>
              <Text style={styles.title}>Yeni Bölüm</Text>

              {/* 🔍 SEARCH INPUT */}
              <TextInput
                placeholder="Manga ara..."
                placeholderTextColor="#666"
                style={styles.input}
                value={search}
                onChangeText={setSearch}
              />

              {/* FILTERED LIST */}
              <View style={styles.dropdown}>
                <FlatList
                  data={mangas
                    .map((m) => m.title)
                    .filter((t) =>
                      t.toLowerCase().includes(search.toLowerCase())
                    )}
                  keyExtractor={(i) => i}
                  style={{ maxHeight: 140 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedManga(item);
                        setSearch(item); // seçileni inputa yaz
                      }}
                      style={[
                        styles.listItem,
                        selectedManga === item && styles.selected,
                      ]}
                    >
                      <Text style={{ color: '#fff' }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* SELECTED INFO */}
              {selectedManga !== '' && (
                <Text style={styles.selectedLabel}>
                  Seçilen: {selectedManga}
                </Text>
              )}

              <TextInput
                placeholder="Chapter Link"
                placeholderTextColor="#666"
                style={styles.input}
                value={chapterLink}
                onChangeText={setChapterLink}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveChapter}
              >
                <Text style={styles.saveText}>İndir</Text>
              </TouchableOpacity>
            </>
          )}

          {/* CLOSE */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
          >
            <Text style={styles.closeText}>Kapat</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

export default AddMangaModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    color: '#fff',
  },
  closeBtn: {
    backgroundColor: '#e74c3c',
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  closeText: {
    color: '#fff',
    fontWeight: '700',
  },
  btn: {
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  blue: { backgroundColor: '#4A90E2' },
  orange: { backgroundColor: '#ff8c42' },
  btnText: { color: '#fff', fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#4A90E2',
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  listItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  selected: {
    backgroundColor: '#9e9e9eff',
  },
  selectedLabel: {
    marginTop: 10,
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: '#0d1f2b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  dropdown: {
  backgroundColor: '#1a1a1a',
  borderRadius: 10,
  marginTop: 8,
  borderWidth: 1,
  borderColor: '#2a2a2a',
  overflow: 'hidden',
},
});