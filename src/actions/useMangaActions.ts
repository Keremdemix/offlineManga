import { useState } from 'react';
import { Alert } from 'react-native';
import { deleteManga, updateManga } from '../services/mangaStorageService';

export const useMangaActions = (reload: () => void) => {
  const [editVisible, setEditVisible] = useState(false);
  const [editingManga, setEditingManga] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCover, setEditCover] = useState('');
  const [oldTitle, setOldTitle] = useState('');
  const [oldCover, setOldCover] = useState('');

  // ── EDIT ─────────────────────────────────────
  const openEdit = (manga: { title: string; cover?: string }) => {
  setEditingManga(manga.title);

  setOldTitle(manga.title);   // 🔥 eski
  setOldCover(manga.cover ?? '');

  setEditTitle(manga.title);  // input
  setEditCover(manga.cover ?? '');

  setEditVisible(true);
};

  const saveEdit = async () => {
    if (!editingManga || !editTitle.trim()) return;

    Alert.alert(
      'Değişiklikleri Kaydet',
      `"${editingManga}" güncellensin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async () => {
            try {
              await updateManga(editingManga, {
                title: editTitle.trim(),
                cover: editCover.trim() || undefined,
              });

              reload();
            } catch (e) {
              console.error(e);
            } finally {
              setEditVisible(false);
              setEditingManga(null);
              setEditTitle('');
              setEditCover('');
            }
          },
        },
      ],
    );
  };

  // ── DELETE ───────────────────────────────────
  const handleDelete = (title: string) => {
    Alert.alert(
      'Manga Sil',
      `"${title}" silinsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteManga(title);
              reload();
            } catch (e) {
              console.error(e);
            }
          },
        },
      ],
    );
  };

  return {
    // state
    editVisible,
    setEditVisible,
    editTitle,
    setEditTitle,
    editCover,
    setEditCover,
    oldTitle,
    oldCover,

    // actions
    openEdit,
    saveEdit,
    handleDeleteWholeManga: handleDelete,
  };
};