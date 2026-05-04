// actions/downloadActions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadMangaChapter } from '../services/mangaService';
import { Manga } from '../types/manga';
// ✅ YENİ — bildirim servisi
import { notifyDownloadDone } from '../services/notificationService';

export type DownloadStatus = 'idle' | 'downloading' | 'done' | 'error';

export interface DownloadProgress {
  chapterId: string;
  status: DownloadStatus;
  current: number;
  total: number;
  error?: string;
}

// Tek bir bölümü indir ve AsyncStorage'ı güncelle
export const downloadChapter = async (
  mangaTitle: string,
  chapterId: string,
  link: string,
  onProgress?: (p: DownloadProgress) => void,
  // ✅ YENİ — bildirimde görünecek bölüm numarası (opsiyonel)
  chapterNumber?: number | string,
): Promise<boolean> => {
  try {
    onProgress?.({
      chapterId,
      status: 'downloading',
      current: 0,
      total: 0,
    });

    const result = await downloadMangaChapter(link, (current, total) => {
      onProgress?.({
        chapterId,
        status: 'downloading',
        current,
        total,
      });
    });

    if (!result || result.error || !result.pages?.length) {
      onProgress?.({
        chapterId,
        status: 'error',
        current: 0,
        total: 0,
        error: result?.error || 'No pages found',
      });
      return false;
    }

    const data = await AsyncStorage.getItem('localMangas');
    let mangas: Manga[] = data ? JSON.parse(data) : [];

    mangas = mangas.map((m: Manga) => ({
      ...m,
      chapters: m.chapters.map(c =>
        c.id === chapterId
          ? {
              ...c,
              pages: result.pages,
              downloading: false,
              downloaded: true,
            }
          : c,
      ),
    }));

    await AsyncStorage.setItem('localMangas', JSON.stringify(mangas));

    onProgress?.({
      chapterId,
      status: 'done',
      current: result.pages.length,
      total: result.pages.length,
    });

    // ✅ YENİ — indirme başarıyla bitti, bildirim gönder
    await notifyDownloadDone(mangaTitle, chapterNumber ?? chapterId);

    return true;
  } catch (e) {
    console.error('DOWNLOAD ERROR:', e);

    onProgress?.({
      chapterId,
      status: 'error',
      current: 0,
      total: 0,
      error: String(e),
    });

    return false;
  }
};