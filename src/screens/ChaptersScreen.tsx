// screens/ChaptersScreen.tsx
import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { downloadChapter, DownloadProgress } from '../actions/downloadActions';
import { extractChapterNumber } from '../utils/chapterUtils';
import { useMangaActions } from '../actions/useMangaActions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ✅ YENİ — bildirim kurulumu ve toplu bildirim
import { setupNotifications, notifyBatchDownloadDone } from '../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'Chapters'>;

interface Chapter {
  id: string;
  link: string;
  date: string;
  pages?: string[];
  downloaded?: boolean;
  chapterNumber?: number;
  read?: boolean;
}

const T = {
  bg0: '#07070A',
  bg1: '#0E0E14',
  bg2: '#15151E',
  bg3: '#1C1C28',
  line: '#232330',
  lineHi: '#2E2E40',
  gold: '#D4A843',
  goldDim: '#6B5322',
  goldPale: '#F5D98A',
  teal: '#2DD4BF',
  tealDim: '#134E4A',
  violet: '#8B5CF6',
  violetDim: '#2E1065',
  red: '#F87171',
  redDim: '#450A0A',
  ink: '#E8E8F2',
  inkMid: '#8888A0',
  inkDim: '#404055',
};

const { height: H } = Dimensions.get('window');
const SB_H = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight ?? 24;
const COVER_H = Math.round(H * 0.48);
const PANEL_H = 130;
const BAR_H = 46;
const STICK_AT = COVER_H - SB_H;
const PANEL_TOP = COVER_H;
const PANEL_TRAVEL = PANEL_TOP;

// ─── AddChapterModal ──────────────────────────────────────────────────────────
interface AddChapterModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (links: string[], start?: number, end?: number) => void;
}
const AddChapterModal: React.FC<AddChapterModalProps> = ({ visible, onClose, onAdd }) => {
  const [links, setLinks] = useState<string[]>(['']);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const handleAdd = () => {
    const clean = links.map(l => l.trim()).filter(Boolean);
    if (!clean.length) { Alert.alert('Hata', 'En az 1 link gir.'); return; }
    onAdd(clean, start ? Number(start) : undefined, end ? Number(end) : undefined);
    setLinks(['']); setStart(''); setEnd('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={md.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={md.sheet}>
          <View style={md.handle} />
          <Text style={md.title}>Bölüm Ekle</Text>
          {links.map((l, i) => (
            <View key={i} style={md.linkRow}>
              <TextInput
                style={[md.input, { flex: 1, marginTop: 0 }]}
                value={l}
                onChangeText={t => { const a = [...links]; a[i] = t; setLinks(a); }}
                placeholder={`Link ${i + 1}`}
                placeholderTextColor={T.inkMid}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {i > 0 && (
                <TouchableOpacity
                  style={md.removeBtn}
                  onPress={() => setLinks(links.filter((_, idx) => idx !== i))}
                >
                  <Text style={md.removeTxt}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={() => setLinks([...links, ''])}>
            <Text style={md.addLink}>+ link ekle</Text>
          </TouchableOpacity>
          <Text style={md.rangeLabel}>Toplu ekleme (opsiyonel)</Text>
          <View style={md.rangeRow}>
            <TextInput
              style={[md.input, { flex: 1, marginTop: 0 }]}
              placeholder="Başlangıç"
              keyboardType="numeric"
              value={start}
              onChangeText={setStart}
              placeholderTextColor={T.inkMid}
            />
            <TextInput
              style={[md.input, { flex: 1, marginTop: 0 }]}
              placeholder="Bitiş"
              keyboardType="numeric"
              value={end}
              onChangeText={setEnd}
              placeholderTextColor={T.inkMid}
            />
          </View>
          <View style={md.btnRow}>
            <TouchableOpacity style={md.btnCancel} onPress={onClose} activeOpacity={0.7}>
              <Text style={md.btnCancelTxt}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={md.btnAdd} onPress={handleAdd} activeOpacity={0.8}>
              <Text style={md.btnAddTxt}>Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const md = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: T.bg1,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderTopWidth: 1, borderColor: T.lineHi,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.lineHi, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: T.ink, marginBottom: 12 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  input: { height: 50, fontSize: 15, color: T.ink, backgroundColor: T.bg3, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: T.lineHi },
  removeBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: T.redDim, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: T.red + '30' },
  removeTxt: { color: T.red, fontWeight: '800', fontSize: 16 },
  addLink: { color: T.gold, fontSize: 14, fontWeight: '700', marginBottom: 16 },
  rangeLabel: { color: T.ink, fontSize: 13, marginBottom: 8 },
  rangeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel: { flex: 1, height: 50, borderRadius: 14, backgroundColor: T.bg2, borderWidth: 1, borderColor: T.lineHi, justifyContent: 'center', alignItems: 'center' },
  btnCancelTxt: { fontSize: 15, fontWeight: '700', color: T.inkMid },
  btnAdd: { flex: 2, height: 50, borderRadius: 14, backgroundColor: T.gold, justifyContent: 'center', alignItems: 'center' },
  btnAddTxt: { fontSize: 15, fontWeight: '800', color: T.bg0 },
});

// ─── SelectionBar ─────────────────────────────────────────────────────────────
interface SelectionBarProps {
  count: number;
  total: number;
  allSelected: boolean;
  bottomInset: number;
  onCancel: () => void;
  onSelectAll: () => void;
  onDownloadSelected: () => void;
  onDeleteSelected: () => void;
  onMarkReadSelected: () => void;
}
const SelectionBar: React.FC<SelectionBarProps> = ({
  count,
  total,
  allSelected,
  bottomInset,
  onCancel,
  onSelectAll,
  onDownloadSelected,
  onDeleteSelected,
  onMarkReadSelected,
}) => (
  <View style={[sb.bar, { paddingBottom: bottomInset > 0 ? bottomInset : 8 }]}>
    <View style={sb.inner}>
      <TouchableOpacity style={sb.cancelBtn} onPress={onCancel}>
        <Text style={sb.cancelTxt}>✕</Text>
      </TouchableOpacity>
      <Text style={sb.count}>{count}/{total} seçili</Text>
      <View style={sb.actions}>
        <TouchableOpacity
          style={[sb.actionBtn, allSelected && sb.actionAllActive]}
          onPress={onSelectAll}
        >
          <Text style={[sb.actionTxt, { fontSize: 13, fontWeight: '900' }]}>
            {allSelected ? '☑' : '☐'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={sb.actionBtn} onPress={onMarkReadSelected}>
          <Text style={sb.actionTxt}>✦</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[sb.actionBtn, sb.actionDl]} onPress={onDownloadSelected}>
          <Text style={sb.actionTxt}>↓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[sb.actionBtn, sb.actionDel]} onPress={onDeleteSelected}>
          <Text style={[sb.actionTxt, { color: T.red }]}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const sb = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: T.gold,
    borderTopWidth: 1,
    borderTopColor: T.lineHi,
  },
  inner: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  cancelBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: T.bg3,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelTxt: { color: T.inkMid, fontSize: 13, fontWeight: '800' },
  count: { flex: 1, fontSize: 15, fontWeight: '700', color: T.ink },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: T.bg3,
    borderWidth: 1, borderColor: T.lineHi,
    justifyContent: 'center', alignItems: 'center',
  },
  actionDl:        { backgroundColor: T.tealDim, borderColor: T.teal + '40' },
  actionDel:       { backgroundColor: T.redDim, borderColor: T.red + '20' },
  actionAllActive: { backgroundColor: T.bg0, borderColor: T.gold },
  actionTxt: { fontSize: 16, color: T.ink },
});

// ─── ChapterRow ───────────────────────────────────────────────────────────────
interface RowProps {
  item: Chapter;
  index: number;
  total: number;
  progress: DownloadProgress | undefined;
  selectMode: boolean;
  selected: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onToggleRead: () => void;
  onLongPress: () => void;
  onSelectToggle: () => void;
}
const ChapterRow: React.FC<RowProps> = ({
  item, index, total, progress,
  selectMode, selected,
  onOpen, onDownload, onDelete, onToggleRead, onLongPress, onSelectToggle,
}) => {
  const isDling = progress?.status === 'downloading';
  const pct = isDling && (progress?.total ?? 0) > 0
    ? Math.round(((progress.current ?? 0) / progress.total!) * 100)
    : 0;
  const num = item.chapterNumber != null ? item.chapterNumber : total - index;
  const accentColor = item.read ? T.violet : item.downloaded ? T.teal : T.inkMid;

  return (
    <TouchableOpacity
      style={[r.row, item.read && r.rowRead, selected && r.rowSelected]}
      onPress={() => selectMode ? onSelectToggle() : onOpen()}
      onLongPress={onLongPress}
      delayLongPress={350}
      activeOpacity={0.65}
    >
      {selectMode && (
        <TouchableOpacity
          style={r.checkWrap}
          onPress={onSelectToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[r.check, selected && r.checkSelected]}>
            {selected && <Text style={r.checkMark}>✓</Text>}
          </View>
        </TouchableOpacity>
      )}

      <View style={r.numSide}>
        <Text style={[r.bigNum, { color: accentColor }]}>
          {String(num).padStart(2, '0')}
        </Text>
        {index < total - 1 && (
          <View style={[r.connector, { backgroundColor: accentColor + '25' }]} />
        )}
      </View>

      <View style={r.content}>
        <View style={r.topRow}>
          <Text style={[r.chTitle, item.read && r.chTitleRead]}>{`Bölüm ${num}`}</Text>
          {item.downloaded && !isDling && (
            <View style={[r.pill, { backgroundColor: T.tealDim, borderColor: T.teal + '30' }]}>
              <Text style={[r.pillTxt, { color: T.teal }]}>İNDİRİLDİ</Text>
            </View>
          )}
          {item.read && (
            <View style={[r.pill, { backgroundColor: T.violetDim, borderColor: T.violet + '30' }]}>
              <Text style={[r.pillTxt, { color: T.violet }]}>OKUNDU</Text>
            </View>
          )}
        </View>
        {!!item.date && <Text style={r.date}>{item.date.slice(0, 10)}</Text>}
        {isDling && (
          <View style={r.progRow}>
            <View style={r.progTrack}>
              <View style={[r.progBar, { width: `${pct}%` as any }]} />
            </View>
            <Text style={r.progNum}>{pct}%</Text>
          </View>
        )}
      </View>

      {!selectMode && (
        <View style={r.actions}>
          <TouchableOpacity
            style={[r.ico, item.read && r.icoActive]}
            onPress={onToggleRead}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Text style={{ fontSize: 14, color: T.ink }}>
              {item.read ? '✦' : '✧'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[r.ico, item.downloaded && r.icoGreen, isDling && r.icoAmber]}
            onPress={() => {
              if (item.downloaded) {
                Alert.alert('Tekrar İndir?', 'Bu bölümü yeniden indirmek istiyor musun?', [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'İndir', onPress: onDownload },
                ]);
              } else { onDownload(); }
            }}
            disabled={isDling}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            {isDling ? (
              <ActivityIndicator size="small" color={T.gold} />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '800', color: item.downloaded ? T.teal : T.inkMid }}>
                {item.downloaded ? '✓' : '↓'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[r.ico, r.icoDel]}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '900', color: T.ink + 'CC' }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const r = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingRight: 14, paddingVertical: 14, backgroundColor: T.bg0 },
  rowRead: { opacity: 0.78 },
  rowSelected: { backgroundColor: T.bg2 },
  checkWrap: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16, paddingRight: 4, paddingTop: 2 },
  check: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: T.inkMid, justifyContent: 'center', alignItems: 'center' },
  checkSelected: { backgroundColor: T.gold, borderColor: T.gold },
  checkMark: { fontSize: 11, fontWeight: '900', color: T.bg0 },
  numSide: { width: 68, alignItems: 'center', paddingTop: 2 },
  bigNum: { fontSize: 22, fontWeight: '900', letterSpacing: -1, lineHeight: 26 },
  connector: { width: 1.5, flex: 1, marginTop: 6, minHeight: 20 },
  content: { flex: 1, paddingRight: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 },
  chTitle: { fontSize: 15, fontWeight: '700', color: T.ink, letterSpacing: -0.2 },
  chTitleRead: { color: T.inkMid },
  date: { fontSize: 11, color: T.ink },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  pillTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  progRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 8 },
  progTrack: { flex: 1, height: 2.5, backgroundColor: T.bg3, borderRadius: 2, overflow: 'hidden' },
  progBar: { height: 2.5, backgroundColor: T.gold, borderRadius: 2 },
  progNum: { fontSize: 10, fontWeight: '700', color: T.gold, minWidth: 30 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 2 },
  ico: { width: 30, height: 30, borderRadius: 8, backgroundColor: T.bg1, borderWidth: 1, borderColor: T.line, justifyContent: 'center', alignItems: 'center' },
  icoActive: { backgroundColor: T.violetDim, borderColor: T.violet + '40' },
  icoGreen: { backgroundColor: T.tealDim, borderColor: T.teal + '30' },
  icoAmber: { borderColor: T.gold + '50' },
  icoDel: { backgroundColor: T.redDim, borderColor: T.red + '20' },
});

// ─── ChaptersScreen ───────────────────────────────────────────────────────────
const ChaptersScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mangaTitle } = route.params;

  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const [chapters,    setChapters]    = useState<Chapter[]>([]);
  const [coverUrl,    setCoverUrl]    = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: mangaTitle,
      headerRight: () => (
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ marginRight: 16 }}>
          <Text style={{ fontSize: 22, color: '#fff' }}>⋯</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, mangaTitle]);

  const [loading,     setLoading]     = useState(true);
  const [progresses,  setProgresses]  = useState<Record<string, DownloadProgress>>({});
  const [addVisible,  setAddVisible]  = useState(false);
  const [selectMode,  setSelectMode]  = useState(false);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());

  const activeDownloads = useRef<Set<string>>(new Set());
  const scrollY = useRef(new Animated.Value(0)).current;

  // ✅ YENİ — uygulama ilk açıldığında bildirim kanalını kur ve izin iste
  useEffect(() => {
    setupNotifications();
  }, []);

  const coverOp = scrollY.interpolate({ inputRange: [0, STICK_AT], outputRange: [1, 0.18], extrapolate: 'clamp' });
  const coverTY = scrollY.interpolate({ inputRange: [0, STICK_AT], outputRange: [0, -(STICK_AT * 0.26)], extrapolate: 'clamp' });
  const coverScale = scrollY.interpolate({ inputRange: [-60, 0], outputRange: [1.06, 1], extrapolate: 'clamp' });
  const panelTY = scrollY.interpolate({ inputRange: [0, STICK_AT], outputRange: [0, -PANEL_TRAVEL], extrapolate: 'clamp' });

  // ── Select helpers ──────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const enterSelectMode = (id: string) => { setSelectMode(true); setSelected(new Set([id])); };
  const exitSelectMode  = () => { setSelectMode(false); setSelected(new Set()); };

  const handleSelectAll = () => {
    if (selected.size === chapters.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(chapters.map(c => c.id)));
    }
  };

  const selectedChapters = chapters.filter(c => selected.has(c.id));

  // ── Data ────────────────────────────────────────────────────────────────────
  const loadChapters = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('localMangas');
      if (!raw) return;
      const list = JSON.parse(raw);
      const idx = list.findIndex((m: any) => m.title === mangaTitle);
      if (idx === -1) return;
      const manga = list[idx];
      setCoverUrl(manga.cover || null);
      let dirty = false;
      const fixed: Chapter[] = (manga.chapters || []).map((c: any) => {
        const ch = { ...c } as Chapter;
        if (ch.chapterNumber == null || isNaN(Number(ch.chapterNumber))) {
          const n = extractChapterNumber(ch.link);
          if (n != null) { ch.chapterNumber = n; dirty = true; }
        }
        return ch;
      });
      if (dirty) { list[idx].chapters = fixed; await AsyncStorage.setItem('localMangas', JSON.stringify(list)); }
      setChapters(
        [...fixed].sort((a, b) => {
          const an = a.chapterNumber ?? -1, bn = b.chapterNumber ?? -1;
          if (an !== -1 && bn !== -1) return bn - an;
          return (b.date ?? '').localeCompare(a.date ?? '');
        }),
      );
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [mangaTitle]);

  const {
    editVisible, setEditVisible,
    editTitle, setEditTitle,
    editCover, setEditCover,
    openEdit, saveEdit,
    handleDeleteWholeManga,
    oldTitle, oldCover,
  } = useMangaActions(loadChapters);

  useEffect(() => { loadChapters(); }, [loadChapters]);

  const handleAddChapter = async (links: string[], start?: number, end?: number) => {
    try {
      const raw = await AsyncStorage.getItem('localMangas');
      if (!raw) return;
      const list = JSON.parse(raw);
      const idx = list.findIndex((m: any) => m.title === mangaTitle);
      if (idx === -1) return;
      let chs = list[idx].chapters || [];
      for (const link of links) {
        if (chs.find((c: any) => c.link === link)) continue;
        chs.unshift({ id: `${Date.now()}${Math.random()}`, link, date: new Date().toISOString(), chapterNumber: extractChapterNumber(link) ?? undefined });
      }
      if (start && end && links[0]) {
        for (let i = start; i <= end; i++) {
          const nl = links[0].replace(/\d+\/?$/, `${i}/`);
          if (chs.find((c: any) => c.link === nl)) continue;
          chs.unshift({ id: `${Date.now()}${i}`, link: nl, date: new Date().toISOString(), chapterNumber: i });
        }
      }
      list[idx].chapters = chs;
      await AsyncStorage.setItem('localMangas', JSON.stringify(list));
      loadChapters();
    } catch { Alert.alert('Hata', 'Eklenemedi'); }
  };

  const markDownloaded = async (id: string) => {
    const raw = await AsyncStorage.getItem('localMangas');
    if (!raw) return;
    const list = JSON.parse(raw);
    const idx = list.findIndex((m: any) => m.title === mangaTitle);
    if (idx === -1) return;
    list[idx].chapters = list[idx].chapters.map((c: any) => c.id === id ? { ...c, downloaded: true } : c);
    await AsyncStorage.setItem('localMangas', JSON.stringify(list));
  };

  const handleDownload = async (ch: Chapter) => {
    if (activeDownloads.current.has(ch.id)) return;
    activeDownloads.current.add(ch.id);
    // ✅ YENİ — chapterNumber iletildi, bildirimde "Bölüm 42" gibi görünür
    await downloadChapter(mangaTitle, ch.id, ch.link, async p => {
      setProgresses(prev => ({ ...prev, [ch.id]: p }));
      if (p.status === 'done') { activeDownloads.current.delete(ch.id); await markDownloaded(ch.id); loadChapters(); }
      if (p.status === 'error') { activeDownloads.current.delete(ch.id); }
    }, ch.chapterNumber);
  };

  const openChapter = (ch: Chapter) => {
    const sortedChapters = [...chapters].sort((a, b) => {
      const an = a.chapterNumber ?? 0;
      const bn = b.chapterNumber ?? 0;
      return an - bn;
    });

    const allChaptersMeta = sortedChapters.map(c => ({
      link:          c.link,
      chapterNumber: c.chapterNumber ?? 0,
      pages:         c.downloaded && c.pages?.length ? c.pages : undefined,
    }));

    const common = {
      mangaTitle,
      chapterId:   ch.link,
      allChapters: allChaptersMeta,
    };

    if (ch.downloaded && ch.pages?.length) {
      navigation.navigate('Manga', { ...common, mangaLink: ch.link, localPages: ch.pages } as any);
    } else {
      navigation.navigate('Manga', { ...common, mangaLink: ch.link } as any);
    }
  };

  const handleDelete = (ch: Chapter) => {
    const name = ch.chapterNumber != null ? `Bölüm ${ch.chapterNumber}` : 'Bu bölüm';
    Alert.alert('Sil', `"${name}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        const raw = await AsyncStorage.getItem('localMangas');
        if (!raw) return;
        const list = JSON.parse(raw);
        const idx = list.findIndex((m: any) => m.title === mangaTitle);
        if (idx === -1) return;
        list[idx].chapters = list[idx].chapters.filter((c: any) => c.id !== ch.id);
        await AsyncStorage.setItem('localMangas', JSON.stringify(list));
        loadChapters();
      }},
    ]);
  };

  const handleToggleRead = async (ch: Chapter) => {
    const raw = await AsyncStorage.getItem('localMangas');
    if (!raw) return;
    const list = JSON.parse(raw);
    const idx = list.findIndex((m: any) => m.title === mangaTitle);
    if (idx === -1) return;
    list[idx].chapters = list[idx].chapters.map((c: any) => c.id === ch.id ? { ...c, read: !c.read } : c);
    await AsyncStorage.setItem('localMangas', JSON.stringify(list));
    loadChapters();
  };

  const handleDownloadAll = async () => {
    const notDl = chapters.filter(c => !c.downloaded);
    if (!notDl.length) { Alert.alert('Bilgi', 'Tüm bölümler zaten indirilmiş.'); return; }
    for (const ch of notDl) await handleDownload(ch);
    // ✅ YENİ — tüm indirme bitti, toplu bildirim
    await notifyBatchDownloadDone(mangaTitle, notDl.length);
  };

  const handleDownloadSelected = async () => {
    for (const ch of selectedChapters) await handleDownload(ch);
    // ✅ YENİ — seçili bölümler indirildi, toplu bildirim
    if (selectedChapters.length > 1) {
      await notifyBatchDownloadDone(mangaTitle, selectedChapters.length);
    }
    exitSelectMode();
  };

  const handleDeleteSelected = () => {
    Alert.alert('Sil', `${selected.size} bölüm silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        const raw = await AsyncStorage.getItem('localMangas');
        if (!raw) return;
        const list = JSON.parse(raw);
        const idx = list.findIndex((m: any) => m.title === mangaTitle);
        if (idx === -1) return;
        list[idx].chapters = list[idx].chapters.filter((c: any) => !selected.has(c.id));
        await AsyncStorage.setItem('localMangas', JSON.stringify(list));
        exitSelectMode();
        loadChapters();
      }},
    ]);
  };

  const handleMarkReadSelected = async () => {
    const raw = await AsyncStorage.getItem('localMangas');
    if (!raw) return;
    const list = JSON.parse(raw);
    const idx = list.findIndex((m: any) => m.title === mangaTitle);
    if (idx === -1) return;
    const allRead = selectedChapters.every(c => c.read);
    list[idx].chapters = list[idx].chapters.map((c: any) =>
      selected.has(c.id) ? { ...c, read: !allRead } : c,
    );
    await AsyncStorage.setItem('localMangas', JSON.stringify(list));
    exitSelectMode();
    loadChapters();
  };

  if (loading)
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.gold} />
      </View>
    );

  const dlCount   = chapters.filter(c => c.downloaded).length;
  const readCount = chapters.filter(c => c.read).length;
  const unread    = chapters.length - readCount;

  const selBarTotalH = 52 + safeBottom;

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <Animated.View
        style={[s.coverWrap, { opacity: coverOp, transform: [{ translateY: coverTY }, { scale: coverScale }] }]}
        pointerEvents="none"
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={s.coverImg} resizeMode="contain" />
        ) : (
          <View style={s.coverPlaceholder}><Text style={{ fontSize: 80 }}>📚</Text></View>
        )}
      </Animated.View>

      <Animated.View
        style={[s.filler, { top: PANEL_TOP + PANEL_H + BAR_H, transform: [{ translateY: panelTY }] }]}
        pointerEvents="none"
      />

      <Animated.View
        style={[s.panel, { top: PANEL_TOP, transform: [{ translateY: panelTY }] }]}
        pointerEvents="box-none"
      >
        <View style={s.info}>
          <View style={s.infoTop}>
            <Text style={s.mangaTitle} numberOfLines={2}>{mangaTitle}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statScroll}>
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: T.goldPale }]}>{chapters.length}</Text>
              <Text style={s.statLbl}>bölüm</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: T.teal }]}>{dlCount}</Text>
              <Text style={s.statLbl}>indirildi</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: T.violet }]}>{readCount}</Text>
              <Text style={s.statLbl}>okundu</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: T.inkMid }]}>{unread}</Text>
              <Text style={s.statLbl}>bekliyor</Text>
            </View>
          </ScrollView>
        </View>
        <View style={s.strip}>
          <View style={s.stripLeft}>
            <View style={s.stripDot} />
            <Text style={s.stripLabel}>BÖLÜMLER</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.countTag}>
              <Text style={s.countTagTxt}>{chapters.length}</Text>
            </View>
            <TouchableOpacity style={s.dlAllBtn} onPress={handleDownloadAll} activeOpacity={0.8}>
              <Text style={s.dlAllTxt}>HEPSİNİ İNDİR</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.addTopWrap}>
          <TouchableOpacity style={s.addTopBtn} onPress={() => setAddVisible(true)} activeOpacity={0.8}>
            <Text style={s.addTopTxt}>+ Bölüm Ekle</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={s.scroll}
        contentContainerStyle={{
          paddingTop: COVER_H + PANEL_H + BAR_H + 60,
          paddingBottom: selectMode ? selBarTotalH + 20 : 120,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {chapters.map((item, index) => (
          <ChapterRow
            key={item.id}
            item={item}
            index={index}
            total={chapters.length}
            progress={progresses[item.id]}
            selectMode={selectMode}
            selected={selected.has(item.id)}
            onOpen={() => openChapter(item)}
            onDownload={() => handleDownload(item)}
            onDelete={() => handleDelete(item)}
            onToggleRead={() => handleToggleRead(item)}
            onLongPress={() => enterSelectMode(item.id)}
            onSelectToggle={() => toggleSelect(item.id)}
          />
        ))}
      </Animated.ScrollView>

      {selectMode && (
        <SelectionBar
          count={selected.size}
          total={chapters.length}
          allSelected={selected.size === chapters.length}
          bottomInset={safeBottom}
          onCancel={exitSelectMode}
          onSelectAll={handleSelectAll}
          onDownloadSelected={handleDownloadSelected}
          onDeleteSelected={handleDeleteSelected}
          onMarkReadSelected={handleMarkReadSelected}
        />
      )}

      <AddChapterModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddChapter}
      />

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={{ backgroundColor: '#1C1C28', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: Math.max(insets.bottom + 16, 24) }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 16 }} />
            <TouchableOpacity
              style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', alignItems: 'center' }}
              onPress={() => { setMenuVisible(false); openEdit({ title: mangaTitle, cover: coverUrl ?? '' } as any); }}
            >
              <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>✏️ Manga Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 14, alignItems: 'center' }}
              onPress={() => { setMenuVisible(false); handleDeleteWholeManga(mangaTitle); }}
            >
              <Text style={{ color: '#F87171', fontSize: 16, textAlign: 'center' }}>🗑  Sil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 10, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2A2A35', alignItems: 'center' }}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={{ color: '#aaa', fontSize: 15 }}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={editVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: '#1C1C28', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(insets.bottom + 20, 28) }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center' }}>Manga Düzenle</Text>
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>Mevcut İsim</Text>
              <Text style={{ color: '#fff', marginBottom: 10, textAlign: 'center', fontWeight: '600' }}>{oldTitle}</Text>
              <Text style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>Kapak Önizleme</Text>
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <Image
                  source={{ uri: editCover?.trim() || oldCover || 'https://via.placeholder.com/150' }}
                  style={{ width: 120, height: 160, borderRadius: 12, backgroundColor: '#222' }}
                  resizeMode="cover"
                />
              </View>
            </View>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Yeni isim"
              placeholderTextColor="#666"
              style={{ backgroundColor: '#2A2A35', color: '#fff', padding: 12, borderRadius: 12, marginBottom: 10 }}
            />
            <TextInput
              value={editCover}
              onChangeText={setEditCover}
              placeholder="Yeni kapak URL"
              placeholderTextColor="#666"
              style={{ backgroundColor: '#2A2A35', color: '#fff', padding: 12, borderRadius: 12 }}
            />
            <TouchableOpacity
              onPress={saveEdit}
              style={{ marginTop: 20, backgroundColor: '#D4A843', padding: 14, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#000', fontWeight: '800' }}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditVisible(false)}
              style={{ marginTop: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#aaa' }}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ChaptersScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg0 },

  coverWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: COVER_H, justifyContent: 'center', alignItems: 'center', zIndex: 1, overflow: 'hidden' },
  coverImg: { width: '80%', height: '100%' },
  coverPlaceholder: { flex: 1, backgroundColor: T.bg1, justifyContent: 'center', alignItems: 'center' },

  filler: { position: 'absolute', left: 0, right: 0, bottom: -H, backgroundColor: T.bg0, zIndex: 5 },

  panel: { position: 'absolute', left: 0, right: 0, zIndex: 20, backgroundColor: T.bg0 },

  info: { height: PANEL_H, paddingHorizontal: 20, justifyContent: 'flex-end', paddingBottom: 16, backgroundColor: 'rgba(7,7,10,0.88)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  infoTop: { paddingTop: 10, marginBottom: 14 },
  mangaTitle: { fontSize: 22, fontWeight: '900', color: T.ink, letterSpacing: -0.4, textAlign: 'center' },

  statScroll: { paddingHorizontal: 8 },
  statItem: { alignItems: 'center', paddingHorizontal: 25 },
  statNum: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statLbl: { fontSize: 10, fontWeight: '600', color: T.inkMid, marginTop: 2, letterSpacing: 0.3 },
  statDivider: { width: 1, height: 32, backgroundColor: T.line, alignSelf: 'center' },

  strip: { height: BAR_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: T.bg0, borderTopWidth: 1, borderTopColor: T.line, borderBottomWidth: 1, borderBottomColor: T.line },
  stripLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.gold },
  stripLabel: { fontSize: 10, fontWeight: '900', color: T.ink, letterSpacing: 3.5 },
  countTag: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: T.bg2, borderRadius: 8, borderWidth: 1, borderColor: T.lineHi },
  countTagTxt: { fontSize: 11, fontWeight: '800', color: T.inkMid },
  dlAllBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: T.tealDim, borderRadius: 8, borderWidth: 1, borderColor: T.teal + '40' },
  dlAllTxt: { fontSize: 10, fontWeight: '800', color: T.teal, letterSpacing: 0.5 },

  scroll: { flex: 1, zIndex: 10 },

  addTopWrap: { backgroundColor: T.bg0, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line },
  addTopBtn: { height: 48, borderRadius: 12, backgroundColor: T.gold, justifyContent: 'center', alignItems: 'center' },
  addTopTxt: { fontSize: 14, fontWeight: '800', color: T.bg0 },
});