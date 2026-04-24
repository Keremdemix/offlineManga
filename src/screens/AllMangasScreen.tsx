// screens/AllMangasScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { deleteManga, getMangas, updateManga } from '../services/mangaStorageService';

type Props = NativeStackScreenProps<RootStackParamList, 'AllMangas'>;

interface Manga {
  title: string;
  cover?: string;
  totalChapters?: number;
  downloadedChapters?: number;
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const AMBER  = '#F5A623';
const BG     = '#0C0C0E';
const CARD   = '#141416';
const BORDER = '#1F1F24';

const { width: W } = Dimensions.get('window');
const COLS   = 3;
const GAP    = 10;
const PAD    = 16;
const CARD_W = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;

// ─── Dropdown pozisyon tipi ───────────────────────────────────────────────────
interface DropdownPos {
  manga: Manga;
  x: number;
  y: number;
}

// ─── AllMangasScreen ──────────────────────────────────────────────────────────
const AllMangasScreen: React.FC<Props> = ({ navigation }) => {
  // ✅ route.params yerine doğrudan storage'dan okuyoruz
  // Böylece edit/delete sonrası ekran otomatik güncellenir
  const [mangas,      setMangas]      = useState<Manga[]>([]);
  const [query,       setQuery]       = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [dropdown,    setDropdown]    = useState<DropdownPos | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editingManga, setEditingManga] = useState<string | null>(null);
  const [editTitle,   setEditTitle]   = useState('');
  const [editCover,   setEditCover]   = useState('');

  // Her kart ⋮ butonunun View ref'i
  const menuRefs = useRef<Map<string, View | null>>(new Map());

  // ── Storage'dan yükle ────────────────────────────────────────────────────────
  const loadMangas = useCallback(async () => {
    try {
      const data = await getMangas();
      setMangas(data as Manga[]);
    } catch (e) {
      console.error('loadMangas error:', e);
    }
  }, []);

  // İlk açılışta yükle
  useEffect(() => { loadMangas(); }, [loadMangas]);

  // Başka ekrandan dönünce de yükle (örn. ChaptersScreen'den geri gelince)
  useFocusEffect(useCallback(() => { loadMangas(); }, [loadMangas]));

  const filtered = query.trim()
    ? mangas.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
    : mangas;

  // ── Dropdown ─────────────────────────────────────────────────────────────────
  const openMenu = (manga: Manga) => {
    const ref = menuRefs.current.get(manga.title);
    if (!ref) return;

    setTimeout(() => {
      ref.measureInWindow((x, y, w, h) => {
        setDropdown({
          manga,
          x: x + w / 2, 
          y: y + h/2,
        });
      });
    }, 0);
  };

  const closeMenu = () => {
    setDropdown(null);
    setMenuVisible(null);
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const handleEdit = (manga: Manga) => {
    closeMenu();
    setEditingManga(manga.title);
    setEditTitle(manga.title);
    setEditCover(manga.cover ?? '');
    setEditVisible(true);
  };

  const saveEdit = async () => {
    if (!editingManga || !editTitle.trim()) return;
    try {
      await updateManga(editingManga, {
        title: editTitle.trim(),
        cover: editCover.trim() || undefined,
      });
      // ✅ Storage güncellendi, state'i de güncelle
      await loadMangas();
    } catch (e) {
      console.error('updateManga error:', e);
    } finally {
      setEditVisible(false);
      setEditingManga(null);
      setEditTitle('');
      setEditCover('');
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (title: string) => {
    closeMenu();
    try {
      await deleteManga(title);
      // ✅ Storage güncellendi, state'i de güncelle
      await loadMangas();
    } catch (e) {
      console.error('deleteManga error:', e);
    }
  };

  // ── Render item ──────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Manga }) => {
    const dlPct = item.totalChapters
      ? Math.round(((item.downloadedChapters ?? 0) / item.totalChapters) * 100)
      : 0;

    return (
      <View style={s.cardWrap}>

        {/* CARD */}
        <TouchableOpacity
          style={s.card}
          onPress={() => {
            closeMenu();
            navigation.navigate('Chapters', { mangaTitle: item.title });
          }}
          activeOpacity={0.85}
        >
          {item.cover ? (
            <Image source={{ uri: item.cover }} style={s.cover} resizeMode="cover" />
          ) : (
            <View style={[s.cover, s.coverPh]}>
              <Text style={{ fontSize: 26 }}>📖</Text>
            </View>
          )}

          {/* PROGRESS */}
          {!!item.totalChapters && (
            <View style={s.progressOverlay}>
              <View style={[s.progressFill, { width: `${dlPct}%` as any }]} />
            </View>
          )}

          {/* INFO */}
          <View style={s.cardInfo}>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          </View>
        </TouchableOpacity>

        {/* ⋮ BUTTON — View wrapper ile measure için */}
        <View
          ref={ref => { menuRefs.current.set(item.title, ref); }}
          style={s.menuBtn}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => openMenu(item)}
            activeOpacity={0.75}
          >
            <Text style={s.menuDots}>⋮</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* SEARCH */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Manga ara..."
          placeholderTextColor="#9e9e9e"
          value={query}
          onChangeText={setQuery}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: '#555', paddingRight: 4 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* STATS */}
      <View style={s.statsRow}>
        <Text style={s.statsText}>{filtered.length} / {mangas.length} manga</Text>
      </View>

      {/* GRID */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.title}
        numColumns={COLS}
        onScrollBeginDrag={closeMenu}
        contentContainerStyle={s.grid}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
      />

      {/* ── DROPDOWN — Modal ile render edilir, FlatList overflow sorununu aşar */}
      {dropdown && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={[
            s.dropdown,
            {
              left: dropdown.x - 17, // (35 / 2)
              top: dropdown.y-90 , // Menü yüksekliği + biraz boşluk
            },
          ]}>
            {/* EDIT */}
            <TouchableOpacity
              style={s.dropdownItem}
              onPress={() => handleEdit(dropdown.manga)}
              activeOpacity={0.75}
            >
              <Text style={s.icon}>✏️</Text>
            </TouchableOpacity>

            {/* DELETE */}
            <TouchableOpacity
              style={s.dropdownItem}
              onPress={() => handleDelete(dropdown.manga.title)}
              activeOpacity={0.75}
            >
              <Text style={[s.icon, { color: '#ff6b6b' }]}>🗑</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────────── */}
      {editVisible && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setEditVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setEditVisible(false)}>
            <View style={s.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={s.modalBox}>
                  <Text style={s.modalTitle}>Manga Adı Düzenle</Text>

                  <TextInput
                    value={editTitle}
                    onChangeText={setEditTitle}
                    style={s.modalInput}
                    placeholder="Yeni isim"
                    placeholderTextColor="#888"
                  />

                  <TextInput
                    value={editCover}
                    onChangeText={setEditCover}
                    style={[s.modalInput, { marginTop: 10 }]}
                    placeholder="Kapak URL"
                    placeholderTextColor="#888"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <View style={s.modalActions}>
                    <TouchableOpacity onPress={() => setEditVisible(false)}>
                      <Text style={{ color: '#aaa' }}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveEdit}>
                      <Text style={{ color: AMBER, fontWeight: '700' }}>Kaydet</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};

export default AllMangasScreen;

// ─── Styles (orijinal tasarım) ────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    marginHorizontal: PAD, marginTop: 14, marginBottom: 10,
    paddingHorizontal: 12,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 12, color: '#e0e0e0' },

  statsRow:  { paddingHorizontal: PAD, marginBottom: 14 },
  statsText: { fontSize: 11, color: '#e0e0e0' },

  grid: { paddingHorizontal: PAD, paddingBottom: 40 },

  cardWrap: { width: CARD_W, marginRight: GAP, marginBottom: 18 },
  card: {
    borderRadius: 10, overflow: 'hidden',
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
  },
  cover:   { width: '100%', height: CARD_W * 1.45 },
  coverPh: { backgroundColor: '#1A1A1E', justifyContent: 'center', alignItems: 'center' },

  progressOverlay: { height: 2, backgroundColor: '#222' },
  progressFill:    { height: 2, backgroundColor: AMBER },

  cardInfo:  { padding: 7 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#C8C8D0' },

  menuBtn: {
    position: 'absolute', top: 5, right: 5,
    width: 35, height: 35, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  menuDots: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },

  // Dropdown (Modal içinde absolute)
  dropdown: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 8,
    width: 35,
    alignItems: 'center',
    elevation: 10,
  },
  dropdownItem: {
    width: 35, height: 35, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#2a2a2f',
    marginVertical: 1,
  },
  icon: { fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    width: '80%', backgroundColor: '#1a1a1d',
    padding: 16, borderRadius: 12,
  },
  modalTitle: { color: '#fff', fontSize: 16, marginBottom: 10, fontWeight: '700' },
  modalInput: { backgroundColor: '#2a2a2f', color: '#fff', padding: 10, borderRadius: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
});