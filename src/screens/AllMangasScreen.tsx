// screens/AllMangasScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, Dimensions, TextInput, StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AllMangas'>;

interface Manga {
  title: string;
  cover?: string;
  lastOpened?: string;
  totalChapters?: number;
  downloadedChapters?: number;
}

const AMBER  = '#F5A623';
const BG     = '#0C0C0E';
const CARD   = '#141416';
const BORDER = '#1F1F24';
const W      = Dimensions.get('window').width;
const COLS   = 3;
const GAP    = 10;
const PAD    = 16;
const CARD_W = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;

const AllMangasScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mangas } = route.params as { mangas: Manga[] };
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? mangas.filter((m) =>
        m.title.toLowerCase().includes(query.toLowerCase())
      )
    : mangas;

  const handleOpen = (m: Manga) =>
    navigation.navigate('Chapters', { mangaTitle: m.title });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* SEARCH */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Manga ara..."
          placeholderTextColor="#9e9e9eff"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* STATS */}
      <View style={s.statsRow}>
        <Text style={s.statsText}>
          {filtered.length} / {mangas.length} manga
        </Text>
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🔎</Text>
          <Text style={s.emptyText}>Sonuç bulunamadı</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.title}
          numColumns={COLS}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const dlPct = item.totalChapters
              ? Math.round(((item.downloadedChapters ?? 0) / item.totalChapters) * 100)
              : 0;

            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => handleOpen(item)}
                activeOpacity={0.8}
              >
                {/* Cover */}
                {item.cover ? (
                  <Image source={{ uri: item.cover }} style={s.cover} />
                ) : (
                  <View style={[s.cover, s.coverPh]}>
                    <Text style={{ fontSize: 26 }}>📖</Text>
                  </View>
                )}

                {/* Download progress overlay at bottom of cover */}
                {item.totalChapters ? (
                  <View style={s.progressOverlay}>
                    <View style={[s.progressFill, { width: `${dlPct}%` }]} />
                  </View>
                ) : null}

                {/* Title */}
                <View style={s.cardInfo}>
                  <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                  {item.totalChapters ? (
                    <Text style={s.cardMeta}>{item.totalChapters} bölüm</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

export default AllMangasScreen;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginHorizontal: PAD,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#e0e0e0' },

  statsRow: { paddingHorizontal: PAD, marginBottom: 14 },
  statsText: { fontSize: 11, fontWeight: '700', color: '#2A2A30', letterSpacing: 1 },

  // Grid
  grid: { paddingHorizontal: PAD, paddingBottom: 40 },

  card: {
    width: CARD_W,
    marginRight: GAP,
    marginBottom: 18,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    // remove margin from every 3rd item
  },

  cover:   { width: '100%', height: CARD_W * 1.45 },
  coverPh: { backgroundColor: '#1A1A1E', justifyContent: 'center', alignItems: 'center' },

  progressOverlay: {
    height: 2,
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  progressFill: { height: 2, backgroundColor: AMBER },

  cardInfo:  { padding: 7 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#C8C8D0', lineHeight: 15 },
  cardMeta:  { fontSize: 10, color: '#9e9e9eff', marginTop: 3 },

  // Empty
  empty:      { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyEmoji: { fontSize: 42, marginBottom: 12 },
  emptyText:  { fontSize: 15, fontWeight: '700', color: '#9e9e9eff' },
});