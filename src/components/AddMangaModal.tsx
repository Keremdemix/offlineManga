// components/AddMangaModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
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
  mangaTitle?: string;
}

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

  const [chapterLinks, setChapterLinks] = useState<string[]>(['']);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem('localMangas').then(data => {
      if (data) setMangas(JSON.parse(data));
    });
  }, [visible]);

  const reset = () => {
    setNewTitle('');
    setCover('');
    setChapterLinks(['']);
    setRangeStart('');
    setRangeEnd('');
    setSearch('');
    setSelectedManga('');
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
      Alert.alert('Zaten var', 'Bu manga zaten mevcut.');
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
    const targetManga = mangaTitle || selectedManga;

    if (!targetManga) {
      Alert.alert('Hata', 'Lütfen bir manga seç.');
      return;
    }

    const data = await AsyncStorage.getItem('localMangas');
    let stored: any[] = data ? JSON.parse(data) : [];

    const mangaIdx = stored.findIndex((m: any) => m.title === targetManga);
    if (mangaIdx === -1) return;

    let chapters = stored[mangaIdx].chapters || [];

    // 🔥 MULTI LINK
    for (let link of chapterLinks) {
      const trimmed = link.trim();
      if (!trimmed) continue;

      const exists = chapters.find((c: any) => c.link === trimmed);
      if (exists) continue;

      chapters.unshift({
        id: Date.now().toString() + Math.random(),
        link: trimmed,
        chapterNumber: extractChapterNumber(trimmed),
        date: new Date().toISOString(),
        pages: [],
        downloaded: false,
        read: false,
      });
    }

    // 🔥 RANGE
    if (rangeStart && rangeEnd && chapterLinks[0]) {
      const baseLink = chapterLinks[0];
      const start = Number(rangeStart);
      const end = Number(rangeEnd);

      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          const newLink = baseLink.replace(/\d+\/?$/, `${i}/`);

          const exists = chapters.find((c: any) => c.link === newLink);
          if (exists) continue;

          chapters.unshift({
            id: Date.now().toString() + i,
            link: newLink,
            chapterNumber: i,
            date: new Date().toISOString(),
            pages: [],
            downloaded: false,
            read: false,
          });
        }
      }
    }

    stored[mangaIdx].chapters = chapters;
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

          {/* ───────── MANGA MODE ───────── */}
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

          {/* ───────── CHAPTER MODE ───────── */}
          {mode === 'chapter' && (
            <ScrollView>
              {/* 🔥 MANGA SEÇİM */}
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
                      <Text
                        style={{
                          color: selectedManga === item ? AMBER : TEXT,
                          padding: 6,
                          fontWeight: selectedManga === item ? '800' : '400',
                        }}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* 🔥 MULTI LINK */}
              {chapterLinks.map((link, i) => (
                <TextInput
                  key={i}
                  placeholder={`Bölüm linki ${i + 1}`}
                  placeholderTextColor={MUTED}
                  style={st.input}
                  value={link}
                  onChangeText={text => {
                    const arr = [...chapterLinks];
                    arr[i] = text;
                    setChapterLinks(arr);
                  }}
                />
              ))}

              <TouchableOpacity
                onPress={() => setChapterLinks([...chapterLinks, ''])}
              >
                <Text style={st.addMore}>+ Yeni link ekle</Text>
              </TouchableOpacity>

              {/* 🔥 RANGE */}
              <Text style={st.rangeTitle}>Toplu ekleme</Text>

              <View style={st.row}>
                <TextInput
                  placeholder="Başlangıç"
                  placeholderTextColor={MUTED}
                  style={[st.input, { flex: 1 }]}
                  keyboardType="numeric"
                  value={rangeStart}
                  onChangeText={setRangeStart}
                />

                <TextInput
                  placeholder="Bitiş"
                  placeholderTextColor={MUTED}
                  style={[st.input, { flex: 1 }]}
                  keyboardType="numeric"
                  value={rangeEnd}
                  onChangeText={setRangeEnd}
                />
              </View>

              <TouchableOpacity style={st.btnAmber} onPress={handleSaveChapter}>
                <Text style={st.btnTextDark}>Ekle</Text>
              </TouchableOpacity>
            </ScrollView>
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
    maxHeight: '85%',
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

  addMore: {
    color: AMBER,
    marginTop: 8,
    fontWeight: '700',
  },

  rangeTitle: {
    color: TEXT,
    marginTop: 16,
    fontWeight: '700',
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  close: {
    color: RED,
    textAlign: 'center',
    marginTop: 14,
  },
});