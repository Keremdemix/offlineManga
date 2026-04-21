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
import { extractChapterNumber } from '../utils/chapterUtils';

interface Manga {
  title: string;
  chapters?: { id: string; link: string }[];
}

interface Props {
  visible: boolean;
  mode: 'manga' | 'chapter';
  onSave: () => void;
  onCancel: () => void;
  mangaTitle?: string; // 🔥 DIŞARIDAN GELEN MANGA
}

const BG = '#0A0A0C';
const SURFACE = '#111114';
const CARD = '#17171B';
const BORDER = '#1E1E24';
const AMBER = '#F5A623';
const BLUE = '#4A90E2';
const RED = '#e74c3c';
const TEXT = '#E8E8F0';
const MUTED = '#3A3A44';

const AddMangaModal: React.FC<Props> = ({
  visible,
  mode,
  onSave,
  onCancel,
  mangaTitle,
}) => {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [search, setSearch] = useState('');
  const [selectedManga, setSelectedManga] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [cover, setCover] = useState('');
  const [chapterLink, setChapterLink] = useState('');
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem('localMangas').then(data => {
      if (data) setMangas(JSON.parse(data));
    });
  }, [visible]);

  const reset = () => {
    setSelectedManga('');
    setNewTitle('');
    setCover('');
    setChapterLink('');
    setSearch('');
    setShowList(false);
  };

  const handleClose = () => {
    reset();
    onCancel();
  };

  // ───────── MANGA EKLE ─────────
  const handleSaveManga = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      Alert.alert('Hata', 'Manga adı boş olamaz.');
      return;
    }

    const data = await AsyncStorage.getItem('localMangas');
    const stored: Manga[] = data ? JSON.parse(data) : [];

    const exists = stored.some(
      m => m.title.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      Alert.alert('Zaten var', `"${trimmed}" zaten mevcut.`);
      return;
    }

    stored.push({
      title: trimmed,
      cover: cover.trim() || undefined,
      chapters: [],
    } as any);

    await AsyncStorage.setItem('localMangas', JSON.stringify(stored));
    reset();
    onSave();
  };

  // ───────── CHAPTER EKLE ─────────
  const handleSaveChapter = async () => {
    const trimmedLink = chapterLink.trim();
    const targetManga = mangaTitle || selectedManga;

    if (!targetManga) {
      Alert.alert('Hata', 'Manga bulunamadı.');
      return;
    }

    if (!trimmedLink) {
      Alert.alert('Hata', 'Link boş olamaz.');
      return;
    }

    const data = await AsyncStorage.getItem('localMangas');
    let stored: any[] = data ? JSON.parse(data) : [];

    const mangaIdx = stored.findIndex((m: any) => m.title === targetManga);
    if (mangaIdx === -1) {
      Alert.alert('Hata', 'Manga bulunamadı.');
      return;
    }

    const chapters: any[] = stored[mangaIdx].chapters || [];

    // duplicate link
    const duplicate = chapters.find(
      (c: any) => c.link?.toLowerCase() === trimmedLink.toLowerCase(),
    );
    if (duplicate) {
      Alert.alert('Zaten var', 'Bu bölüm zaten ekli.');
      return;
    }

    const chapterNum = extractChapterNumber(trimmedLink);

    const newChapter = {
      id: Date.now().toString(),
      link: trimmedLink,
      chapterNumber: chapterNum ?? null,
      date: new Date().toISOString(),
      pages: [],
      downloaded: false,
      read: false,
    };

    stored[mangaIdx].chapters = [
      newChapter,
      ...(stored[mangaIdx].chapters || []),
    ];

    await AsyncStorage.setItem('localMangas', JSON.stringify(stored));

    reset();
    onSave();
  };

  const filtered = mangas
    .map(m => m.title)
    .filter(t => t.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={st.overlay}>
        <View style={st.modal}>
          <Text style={st.title}>
            {mode === 'manga' ? '📚 Manga Ekle' : '📄 Bölüm Ekle'}
          </Text>

          {/* ─── MANGA MODE ─── */}
          {mode === 'manga' && (
            <>
              <TextInput
                placeholder="Manga adı"
                placeholderTextColor={MUTED}
                style={st.input}
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TextInput
                placeholder="Kapak URL"
                placeholderTextColor={MUTED}
                style={st.input}
                value={cover}
                onChangeText={setCover}
              />
              <TouchableOpacity style={st.btnBlue} onPress={handleSaveManga}>
                <Text style={st.btnText}>Kaydet</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ─── CHAPTER MODE ─── */}
          {mode === 'chapter' && (
            <>
              {/* 🔥 SADECE HOME SCREEN'DE GÖZÜKÜR */}
              {!mangaTitle && (
                <>
                  <TextInput
                    placeholder="Manga ara..."
                    placeholderTextColor={MUTED}
                    style={st.input}
                    value={search}
                    onChangeText={setSearch}
                  />

                  {filtered.map(item => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setSelectedManga(item)}
                    >
                      <Text style={{ color: TEXT, padding: 6 }}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* 🔥 CHAPTER SCREEN'DE SADECE BU VAR */}
              <TextInput
                placeholder="Bölüm linki"
                placeholderTextColor={MUTED}
                style={st.input}
                value={chapterLink}
                onChangeText={setChapterLink}
              />

              <TouchableOpacity style={st.btnAmber} onPress={handleSaveChapter}>
                <Text style={st.btnTextDark}>Ekle</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={handleClose}>
            <Text style={st.close}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default AddMangaModal;

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    backgroundColor: SURFACE,
    padding: 20,
    borderRadius: 16,
  },
  title: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    color: TEXT,
  },
  btnBlue: {
    backgroundColor: BLUE,
    padding: 12,
    marginTop: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnAmber: {
    backgroundColor: AMBER,
    padding: 12,
    marginTop: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800' },
  btnTextDark: { color: '#000', fontWeight: '800' },
  close: {
    color: RED,
    textAlign: 'center',
    marginTop: 14,
  },
});
