// screens/ChaptersScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
const COVER_H = Math.round(H * 0.58);
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
const AddChapterModal: React.FC<AddChapterModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [links, setLinks] = useState<string[]>(['']);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const handleAdd = () => {
    const clean = links.map(l => l.trim()).filter(Boolean);
    if (!clean.length) {
      Alert.alert('Hata', 'En az 1 link gir.');
      return;
    }
    onAdd(
      clean,
      start ? Number(start) : undefined,
      end ? Number(end) : undefined,
    );
    setLinks(['']);
    setStart('');
    setEnd('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={md.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={md.sheet}>
          <View style={md.handle} />
          <Text style={md.title}>Bölüm Ekle</Text>

          {links.map((l, i) => (
            <View key={i} style={md.linkRow}>
              <TextInput
                style={[md.input, { flex: 1, marginTop: 0 }]}
                value={l}
                onChangeText={t => {
                  const a = [...links];
                  a[i] = t;
                  setLinks(a);
                }}
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
            <TouchableOpacity
              style={md.btnCancel}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={md.btnCancelTxt}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={md.btnAdd}
              onPress={handleAdd}
              activeOpacity={0.8}
            >
              <Text style={md.btnAddTxt}>Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
const md = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: T.bg1,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: T.lineHi,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.lineHi,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: T.ink, marginBottom: 12 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  input: {
    height: 50,
    fontSize: 15,
    color: T.ink,
    backgroundColor: T.bg3,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: T.lineHi,
  },
  removeBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: T.redDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.red + '30',
  },
  removeTxt: { color: T.red, fontWeight: '800', fontSize: 16 },
  addLink: { color: T.gold, fontSize: 14, fontWeight: '700', marginBottom: 16 },
  rangeLabel: { color: T.ink, fontSize: 13, marginBottom: 8 },
  rangeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: T.bg2,
    borderWidth: 1,
    borderColor: T.lineHi,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancelTxt: { fontSize: 15, fontWeight: '700', color: T.inkMid },
  btnAdd: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: T.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAddTxt: { fontSize: 15, fontWeight: '800', color: T.bg0 },
});

// ─── SelectionBar ─────────────────────────────────────────────────────────────
interface SelectionBarProps {
  count: number;
  onCancel: () => void;
  onDownloadSelected: () => void;
  onDeleteSelected: () => void;
  onMarkReadSelected: () => void;
}
const SelectionBar: React.FC<SelectionBarProps> = ({
  count,
  onCancel,
  onDownloadSelected,
  onDeleteSelected,
  onMarkReadSelected,
}) => (
  <View style={sb.bar}>
    <TouchableOpacity style={sb.cancelBtn} onPress={onCancel}>
      <Text style={sb.cancelTxt}>✕</Text>
    </TouchableOpacity>
    <Text style={sb.count}>{count} seçili</Text>
    <View style={sb.actions}>
      <TouchableOpacity style={sb.actionBtn} onPress={onMarkReadSelected}>
        <Text style={sb.actionTxt}>✦</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[sb.actionBtn, sb.actionDl]}
        onPress={onDownloadSelected}
      >
        <Text style={sb.actionTxt}>↓</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[sb.actionBtn, sb.actionDel]}
        onPress={onDeleteSelected}
      >
        <Text style={[sb.actionTxt, { color: T.red }]}>🗑</Text>
      </TouchableOpacity>
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
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: T.gold,
    borderBottomWidth: 1,
    borderBottomColor: T.lineHi,
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.bg3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelTxt: { color: T.inkMid, fontSize: 13, fontWeight: '800' },
  count: { flex: 1, fontSize: 15, fontWeight: '700', color: T.ink },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: T.bg3,
    borderWidth: 1,
    borderColor: T.lineHi,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDl: { backgroundColor: T.tealDim, borderColor: T.teal + '40' },
  actionDel: { backgroundColor: T.redDim, borderColor: T.red + '20' },
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
  item,
  index,
  total,
  progress,
  selectMode,
  selected,
  onOpen,
  onDownload,
  onDelete,
  onToggleRead,
  onLongPress,
  onSelectToggle,
}) => {
  const isDling = progress?.status === 'downloading';
  const pct =
    isDling && (progress?.total ?? 0) > 0
      ? Math.round(((progress.current ?? 0) / progress.total!) * 100)
      : 0;
  const num = item.chapterNumber != null ? item.chapterNumber : total - index;
  const accentColor = item.read
    ? T.violet
    : item.downloaded
    ? T.teal
    : T.inkMid;

  const handlePress = () => {
    if (selectMode) {
      onSelectToggle();
    } else {
      onOpen();
    }
  };

  return (
    <TouchableOpacity
      style={[r.row, item.read && r.rowRead, selected && r.rowSelected]}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={350}
      activeOpacity={0.65}
    >
      {/* Seçim checkbox'ı */}
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

      {/* Numara */}
      <View style={r.numSide}>
        <Text style={[r.bigNum, { color: accentColor }]}>
          {String(num).padStart(2, '0')}
        </Text>
        {index < total - 1 && (
          <View
            style={[r.connector, { backgroundColor: accentColor + '25' }]}
          />
        )}
      </View>

      {/* İçerik */}
      <View style={r.content}>
        <View style={r.topRow}>
          <Text
            style={[r.chTitle, item.read && r.chTitleRead]}
          >{`Bölüm ${num}`}</Text>
          {item.downloaded && !isDling && (
            <View
              style={[
                r.pill,
                { backgroundColor: T.tealDim, borderColor: T.teal + '30' },
              ]}
            >
              <Text style={[r.pillTxt, { color: T.teal }]}>İNDİRİLDİ</Text>
            </View>
          )}
          {item.read && (
            <View
              style={[
                r.pill,
                { backgroundColor: T.violetDim, borderColor: T.violet + '30' },
              ]}
            >
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

      {/* Aksiyonlar — select modda gizlenir */}
      {!selectMode && (
        <View style={r.actions}>
          <TouchableOpacity
            style={[r.ico, item.read && r.icoActive]}
            onPress={onToggleRead}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Text style={{ fontSize: 14, color: item.read ? T.ink : T.ink }}>
              {item.read ? '✦' : '✧'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              r.ico,
              item.downloaded && r.icoGreen,
              isDling && r.icoAmber,
            ]}
            onPress={() => {
              if (item.downloaded) {
                Alert.alert(
                  'Tekrar İndir?',
                  'Bu bölümü yeniden indirmek istiyor musun?',
                  [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'İndir', onPress: onDownload },
                  ],
                );
              } else {
                onDownload();
              }
            }}
            disabled={isDling}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            {isDling ? (
              <ActivityIndicator size="small" color={T.gold} />
            ) : (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: item.downloaded ? T.teal : T.inkMid,
                }}
              >
                {item.downloaded ? '✓' : '↓'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[r.ico, r.icoDel]}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '900',
                color: T.ink + 'CC',
              }}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};
const r = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 14,
    paddingVertical: 14,
    backgroundColor: T.bg0,
  },
  rowRead: { opacity: 0.78 },
  rowSelected: { backgroundColor: T.bg2 },

  checkWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 4,
    paddingTop: 2,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: T.inkMid,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkSelected: { backgroundColor: T.gold, borderColor: T.gold },
  checkMark: { fontSize: 11, fontWeight: '900', color: T.bg0 },

  numSide: { width: 68, alignItems: 'center', paddingTop: 2 },
  bigNum: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 26,
  },
  connector: { width: 1.5, flex: 1, marginTop: 6, minHeight: 20 },

  content: { flex: 1, paddingRight: 10 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  chTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: T.ink,
    letterSpacing: -0.2,
  },
  chTitleRead: { color: T.inkMid },
  date: { fontSize: 11, color: T.ink },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  progRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 8 },
  progTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: T.bg3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progBar: { height: 2.5, backgroundColor: T.gold, borderRadius: 2 },
  progNum: { fontSize: 10, fontWeight: '700', color: T.gold, minWidth: 30 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 2,
  },
  ico: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: T.bg1,
    borderWidth: 1,
    borderColor: T.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icoActive: { backgroundColor: T.violetDim, borderColor: T.violet + '40' },
  icoGreen: { backgroundColor: T.tealDim, borderColor: T.teal + '30' },
  icoAmber: { borderColor: T.gold + '50' },
  icoDel: { backgroundColor: T.redDim, borderColor: T.red + '20' },
});

// ─── ChaptersScreen ───────────────────────────────────────────────────────────
const ChaptersScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mangaTitle } = route.params;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progresses, setProgresses] = useState<
    Record<string, DownloadProgress>
  >({});
  const [addVisible, setAddVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const activeDownloads = useRef<Set<string>>(new Set());
  const scrollY = useRef(new Animated.Value(0)).current;

  const coverOp = scrollY.interpolate({
    inputRange: [0, STICK_AT],
    outputRange: [1, 0.18],
    extrapolate: 'clamp',
  });
  const coverTY = scrollY.interpolate({
    inputRange: [0, STICK_AT],
    outputRange: [0, -(STICK_AT * 0.26)],
    extrapolate: 'clamp',
  });
  const coverScale = scrollY.interpolate({
    inputRange: [-60, 0],
    outputRange: [1.06, 1],
    extrapolate: 'clamp',
  });
  const panelTY = scrollY.interpolate({
    inputRange: [0, STICK_AT],
    outputRange: [0, -PANEL_TRAVEL],
    extrapolate: 'clamp',
  });
  const fabScale = scrollY.interpolate({
    inputRange: [0, 80, 160],
    outputRange: [1, 0.75, 0],
    extrapolate: 'clamp',
  });
  const fabOp = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ── Select helpers ──────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const enterSelectMode = (id: string) => {
    setSelectMode(true);
    setSelected(new Set([id]));
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
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
          if (n != null) {
            ch.chapterNumber = n;
            dirty = true;
          }
        }
        return ch;
      });
      if (dirty) {
        list[idx].chapters = fixed;
        await AsyncStorage.setItem('localMangas', JSON.stringify(list));
      }
      setChapters(
        [...fixed].sort((a, b) => {
          const an = a.chapterNumber ?? -1,
            bn = b.chapterNumber ?? -1;
          if (an !== -1 && bn !== -1) return bn - an;
          return (b.date ?? '').localeCompare(a.date ?? '');
        }),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [mangaTitle]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const handleAddChapter = async (
    links: string[],
    start?: number,
    end?: number,
  ) => {
    try {
      const raw = await AsyncStorage.getItem('localMangas');
      if (!raw) return;
      const list = JSON.parse(raw);
      const idx = list.findIndex((m: any) => m.title === mangaTitle);
      if (idx === -1) return;
      let chs = list[idx].chapters || [];
      for (const link of links) {
        if (chs.find((c: any) => c.link === link)) continue;
        chs.unshift({
          id: `${Date.now()}${Math.random()}`,
          link,
          date: new Date().toISOString(),
          chapterNumber: extractChapterNumber(link) ?? undefined,
        });
      }
      if (start && end && links[0]) {
        for (let i = start; i <= end; i++) {
          const nl = links[0].replace(/\d+\/?$/, `${i}/`);
          if (chs.find((c: any) => c.link === nl)) continue;
          chs.unshift({
            id: `${Date.now()}${i}`,
            link: nl,
            date: new Date().toISOString(),
            chapterNumber: i,
          });
        }
      }
      list[idx].chapters = chs;
      await AsyncStorage.setItem('localMangas', JSON.stringify(list));
      loadChapters();
    } catch {
      Alert.alert('Hata', 'Eklenemedi');
    }
  };

  const markDownloaded = async (id: string) => {
    const raw = await AsyncStorage.getItem('localMangas');
    if (!raw) return;
    const list = JSON.parse(raw);
    const idx = list.findIndex((m: any) => m.title === mangaTitle);
    if (idx === -1) return;
    list[idx].chapters = list[idx].chapters.map((c: any) =>
      c.id === id ? { ...c, downloaded: true } : c,
    );
    await AsyncStorage.setItem('localMangas', JSON.stringify(list));
  };

  const handleDownload = async (ch: Chapter) => {
    if (activeDownloads.current.has(ch.id)) return;
    activeDownloads.current.add(ch.id);
    await downloadChapter(mangaTitle, ch.id, ch.link, async p => {
      setProgresses(prev => ({ ...prev, [ch.id]: p }));
      if (p.status === 'done') {
        activeDownloads.current.delete(ch.id);
        await markDownloaded(ch.id);
        loadChapters();
      }
      if (p.status === 'error') {
        activeDownloads.current.delete(ch.id);
      }
    });
  };

  const openChapter = (ch: Chapter) => {
    if (ch.downloaded && ch.pages?.length)
      navigation.navigate('Manga', {
        mangaLink: ch.link,
        localPages: ch.pages,
      });
    else navigation.navigate('Manga', { mangaLink: ch.link });
  };

  const handleDelete = (ch: Chapter) => {
    const name =
      ch.chapterNumber != null ? `Bölüm ${ch.chapterNumber}` : 'Bu bölüm';
    Alert.alert('Sil', `"${name}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const raw = await AsyncStorage.getItem('localMangas');
          if (!raw) return;
          const list = JSON.parse(raw);
          const idx = list.findIndex((m: any) => m.title === mangaTitle);
          if (idx === -1) return;
          list[idx].chapters = list[idx].chapters.filter(
            (c: any) => c.id !== ch.id,
          );
          await AsyncStorage.setItem('localMangas', JSON.stringify(list));
          loadChapters();
        },
      },
    ]);
  };

  const handleToggleRead = async (ch: Chapter) => {
    const raw = await AsyncStorage.getItem('localMangas');
    if (!raw) return;
    const list = JSON.parse(raw);
    const idx = list.findIndex((m: any) => m.title === mangaTitle);
    if (idx === -1) return;
    list[idx].chapters = list[idx].chapters.map((c: any) =>
      c.id === ch.id ? { ...c, read: !c.read } : c,
    );
    await AsyncStorage.setItem('localMangas', JSON.stringify(list));
    loadChapters();
  };

  const handleDownloadAll = async () => {
    const notDl = chapters.filter(c => !c.downloaded);
    if (!notDl.length) {
      Alert.alert('Bilgi', 'Tüm bölümler zaten indirilmiş.');
      return;
    }
    for (const ch of notDl) await handleDownload(ch);
  };

  // ── Toplu işlemler ──────────────────────────────────────────────────────────
  const handleDownloadSelected = async () => {
    for (const ch of selectedChapters) await handleDownload(ch);
    exitSelectMode();
  };

  const handleDeleteSelected = () => {
    Alert.alert('Sil', `${selected.size} bölüm silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const raw = await AsyncStorage.getItem('localMangas');
          if (!raw) return;
          const list = JSON.parse(raw);
          const idx = list.findIndex((m: any) => m.title === mangaTitle);
          if (idx === -1) return;
          list[idx].chapters = list[idx].chapters.filter(
            (c: any) => !selected.has(c.id),
          );
          await AsyncStorage.setItem('localMangas', JSON.stringify(list));
          exitSelectMode();
          loadChapters();
        },
      },
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

  const dlCount = chapters.filter(c => c.downloaded).length;
  const readCount = chapters.filter(c => c.read).length;
  const unread = chapters.length - readCount;

  return (
    <View style={s.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* ── Kapak ─────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          s.coverWrap,
          {
            opacity: coverOp,
            transform: [{ translateY: coverTY }, { scale: coverScale }],
          },
        ]}
        pointerEvents="none"
      >
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={s.coverImg}
            resizeMode="contain"
          />
        ) : (
          <View style={s.coverPlaceholder}>
            <Text style={{ fontSize: 80 }}>📚</Text>
          </View>
        )}
      </Animated.View>

      {/* ── Filler (boşluk kapama) ──────────────────────────────────────── */}
      <Animated.View
        style={[
          s.filler,
          {
            top: PANEL_TOP + PANEL_H + BAR_H,
            transform: [{ translateY: panelTY }],
          },
        ]}
        pointerEvents="none"
      />

      {/* ── Header Panel ──────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          s.panel,
          { top: PANEL_TOP, transform: [{ translateY: panelTY }] },
        ]}
        pointerEvents="box-none"
      >
        <View style={s.info}>
          <View style={s.infoTop}>
            <Text style={s.mangaTitle} numberOfLines={2}>
              {mangaTitle}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.statScroll}
          >
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: T.goldPale }]}>
                {chapters.length}
              </Text>
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
            <TouchableOpacity
              style={s.dlAllBtn}
              onPress={handleDownloadAll}
              activeOpacity={0.8}
            >
              <Text style={s.dlAllTxt}>HEPSİNİ İNDİR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ── Liste ─────────────────────────────────────────────────────────── */}
      <Animated.ScrollView
        style={s.scroll}
        contentContainerStyle={{
          paddingTop: COVER_H + PANEL_H + BAR_H,
          paddingBottom: 120,
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

      {/* ── FAB ───────────────────────────────────────────────────────────── */}
      {!selectMode && (
        <Animated.View
          style={[
            s.fabWrap,
            { opacity: fabOp, transform: [{ scale: fabScale }] },
          ]}
        >
          <TouchableOpacity
            style={s.fab}
            onPress={() => setAddVisible(true)}
            activeOpacity={0.85}
          >
            <View style={s.fabRing} />
            <Text style={s.fabPlus}>+</Text>
          </TouchableOpacity>
          <Text style={s.fabHint}>Bölüm Ekle</Text>
        </Animated.View>
      )}

      {/* ── Select Mode Bar ───────────────────────────────────────────────── */}
      {selectMode && (
        <SelectionBar
          count={selected.size}
          onCancel={exitSelectMode}
          onDownloadSelected={handleDownloadSelected}
          onDeleteSelected={handleDeleteSelected}
          onMarkReadSelected={handleMarkReadSelected}
        />
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <AddChapterModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddChapter}
      />
    </View>
  );
};

export default ChaptersScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg0 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bg0,
  },

  coverWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: COVER_H,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
  coverImg: { width: '80%', height: '100%' },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: T.bg1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  filler: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -H,
    backgroundColor: T.bg0,
    zIndex: 5,
  },

  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: T.bg0,
  },

  info: {
    height: PANEL_H,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    backgroundColor: 'rgba(7,7,10,0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  infoTop: { paddingTop: 10, marginBottom: 14 },
  mangaTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: T.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
  },

  statScroll: { paddingHorizontal: 8 },
  statItem: { alignItems: 'center', paddingHorizontal: 25 },
  statNum: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: T.inkMid,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: T.line,
    alignSelf: 'center',
  },

  strip: {
    height: BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: T.bg0,
    borderTopWidth: 1,
    borderTopColor: T.line,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  stripLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.gold },
  stripLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: T.ink,
    letterSpacing: 3.5,
  },
  countTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: T.bg2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.lineHi,
  },
  countTagTxt: { fontSize: 11, fontWeight: '800', color: T.inkMid },
  dlAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: T.tealDim,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.teal + '40',
  },
  dlAllTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: T.teal,
    letterSpacing: 0.5,
  },

  scroll: { flex: 1, zIndex: 10 },

  fabWrap: {
    position: 'absolute',
    right: 22,
    bottom: 40,
    alignItems: 'center',
    zIndex: 30,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: T.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: T.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 14,
  },
  fabRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: T.gold + '35',
  },
  fabPlus: {
    fontSize: 30,
    fontWeight: '300',
    color: T.bg0,
    lineHeight: 34,
    marginTop: -2,
  },
  fabHint: {
    marginTop: 7,
    fontSize: 10,
    fontWeight: '700',
    color: T.gold + 'BB',
    letterSpacing: 0.5,
  },
});
