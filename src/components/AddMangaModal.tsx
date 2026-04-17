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
}

// ─── Palette ──────────────────────────────────────────────────────────────
const BG      = '#0A0A0C';
const SURFACE = '#111114';
const CARD    = '#17171B';
const BORDER  = '#1E1E24';
const AMBER   = '#F5A623';
const BLUE    = '#4A90E2';
const RED     = '#e74c3c';
const TEXT    = '#E8E8F0';
const MUTED   = '#3A3A44';
// ─────────────────────────────────────────────────────────────────────────

const AddMangaModal: React.FC<Props> = ({ visible, mode, onSave, onCancel }) => {
  const [mangas,        setMangas]        = useState<Manga[]>([]);
  const [search,        setSearch]        = useState('');
  const [selectedManga, setSelectedManga] = useState('');
  const [newTitle,      setNewTitle]      = useState('');
  const [cover,         setCover]         = useState('');
  const [chapterLink,   setChapterLink]   = useState('');
  const [showList,      setShowList]      = useState(false);

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

  const handleClose = () => { reset(); onCancel(); };

  // ── Save Manga ──────────────────────────────────────────────────────────
  const handleSaveManga = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      Alert.alert('Hata', 'Manga adı boş olamaz.');
      return;
    }

    const data    = await AsyncStorage.getItem('localMangas');
    const stored: Manga[] = data ? JSON.parse(data) : [];

    // Duplicate manga title check
    const exists = stored.some(
      m => m.title.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      Alert.alert('Zaten var', `"${trimmed}" adında bir manga zaten mevcut.`);
      return;
    }

    stored.push({ title: trimmed, cover: cover.trim() || undefined, chapters: [] } as any);
    await AsyncStorage.setItem('localMangas', JSON.stringify(stored));
    reset();
    onSave();
  };

  // ── Save Chapter ────────────────────────────────────────────────────────
  const handleSaveChapter = async () => {
    const trimmedLink = chapterLink.trim();

    if (!selectedManga) {
      Alert.alert('Hata', 'Lütfen bir manga seçin.');
      return;
    }
    if (!trimmedLink) {
      Alert.alert('Hata', 'Chapter linki boş olamaz.');
      return;
    }

    const data    = await AsyncStorage.getItem('localMangas');
    let stored: any[] = data ? JSON.parse(data) : [];

    const mangaIdx = stored.findIndex((m: any) => m.title === selectedManga);
    if (mangaIdx === -1) {
      Alert.alert('Hata', 'Seçilen manga bulunamadı.');
      return;
    }

    const chapters: any[] = stored[mangaIdx].chapters || [];

    // ── Duplicate chapter check (by link) ──────────────────────────────
    const duplicate = chapters.find(
      (c: any) =>
        c.link?.trim().toLowerCase() === trimmedLink.toLowerCase()
    );
    if (duplicate) {
      const num = duplicate.chapterNumber;
      Alert.alert(
        'Zaten eklendi',
        num != null
          ? `Bu link zaten Bölüm ${num} olarak eklenmiş.`
          : 'Bu bölüm linki zaten mevcut.'
      );
      return;
    }

    const chapterNum = extractChapterNumber(trimmedLink);

    // ── Chapter number duplicate check ─────────────────────────────────
    if (chapterNum != null) {
      const numExists = chapters.find((c: any) => c.chapterNumber === chapterNum);
      if (numExists) {
        Alert.alert(
          'Zaten var',
          `Bölüm ${chapterNum} zaten eklenmiş. Yine de eklemek istiyor musun?`,
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Ekle', onPress: () => doSaveChapter(stored, mangaIdx, trimmedLink, chapterNum) },
          ]
        );
        return;
      }
    }

    await doSaveChapter(stored, mangaIdx, trimmedLink, chapterNum);
  };

  const doSaveChapter = async (
    stored: any[],
    mangaIdx: number,
    link: string,
    chapterNum: number | null
  ) => {
    const newChapter = {
      id:            Date.now().toString(),
      link,
      chapterNumber: chapterNum ?? null,
      label:         chapterNum ? `Bölüm ${chapterNum}` : 'Bilinmeyen',
      date:          new Date().toISOString(),
      pages:         [],
      downloaded:    false,
      downloading:   false,
      read:          false,
    };

    stored[mangaIdx].chapters = [...(stored[mangaIdx].chapters || []), newChapter];
    await AsyncStorage.setItem('localMangas', JSON.stringify(stored));
    reset();
    onSave();
  };

  // ── Filtered manga list ─────────────────────────────────────────────────
  const filtered = mangas
    .map(m => m.title)
    .filter(t => t.toLowerCase().includes(search.toLowerCase()));

  // ── UI ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={st.overlay}>
        <View style={st.modal}>

          {/* Header */}
          <View style={st.header}>
            <Text style={st.title}>
              {mode === 'manga' ? '📚 Yeni Manga' : '📄 Yeni Bölüm'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={st.headerClose}>
              <Text style={st.headerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── MANGA MODE ── */}
          {mode === 'manga' && (
            <>
              <TextInput
                placeholder="Manga adı *"
                placeholderTextColor={MUTED}
                style={st.input}
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TextInput
                placeholder="Kapak URL (opsiyonel)"
                placeholderTextColor={MUTED}
                style={st.input}
                value={cover}
                onChangeText={setCover}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                style={[st.actionBtn, { backgroundColor: BLUE }]}
                onPress={handleSaveManga}
              >
                <Text style={st.actionBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── CHAPTER MODE ── */}
          {mode === 'chapter' && (
            <>
              {/* Manga search */}
              <TextInput
                placeholder="Manga ara..."
                placeholderTextColor={MUTED}
                style={st.input}
                value={search}
                onChangeText={v => { setSearch(v); setShowList(true); if (!v) setSelectedManga(''); }}
                onFocus={() => setShowList(true)}
              />

              {/* Dropdown list */}
              {showList && filtered.length > 0 && (
                <View style={st.dropdown}>
                  <FlatList
                    data={filtered}
                    keyExtractor={i => i}
                    style={{ maxHeight: 130 }}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[st.listItem, selectedManga === item && st.listItemSelected]}
                        onPress={() => {
                          setSelectedManga(item);
                          setSearch(item);
                          setShowList(false);
                        }}
                      >
                        <Text style={[st.listItemText, selectedManga === item && { color: AMBER }]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Selected manga chip */}
              {selectedManga !== '' && (
                <View style={st.selectedChip}>
                  <Text style={st.selectedChipDot}>●</Text>
                  <Text style={st.selectedChipText}>{selectedManga}</Text>
                </View>
              )}

              <TextInput
                placeholder="Chapter link *"
                placeholderTextColor={MUTED}
                style={st.input}
                value={chapterLink}
                onChangeText={setChapterLink}
                autoCapitalize="none"
                keyboardType="url"
              />

              <TouchableOpacity
                style={[st.actionBtn, { backgroundColor: AMBER }]}
                onPress={handleSaveChapter}
              >
                <Text style={[st.actionBtnText, { color: '#000' }]}>İndir</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Close */}
          <TouchableOpacity style={st.closeBtn} onPress={handleClose}>
            <Text style={st.closeBtnText}>Kapat</Text>
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
    width: '92%',
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerClose: {
    width: 30, height: 30,
    borderRadius: 8,
    backgroundColor: CARD,
    borderWidth: 1, borderColor: BORDER,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCloseText: { color: MUTED, fontSize: 13, fontWeight: '700' },

  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    color: TEXT,
    fontSize: 13,
  },

  dropdown: {
    backgroundColor: CARD,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  listItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  listItemSelected: { backgroundColor: '#1A1A22' },
  listItemText:     { color: TEXT, fontSize: 13 },

  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#0D1A2A',
    borderWidth: 1,
    borderColor: BLUE + '44',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  selectedChipDot:  { color: BLUE, fontSize: 8 },
  selectedChipText: { color: BLUE, fontSize: 12, fontWeight: '700' },

  actionBtn: {
    marginTop: 14,
    padding: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  closeBtn: {
    backgroundColor: '#1A0E0E',
    borderWidth: 1,
    borderColor: RED + '44',
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: RED, fontWeight: '700', fontSize: 13 },
});