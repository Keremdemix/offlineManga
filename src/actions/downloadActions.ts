// actions/downloadActions.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadMangaChapter } from '../services/mangaService';

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
  onProgress?: (p: DownloadProgress) => void
): Promise<boolean> => {
  try {
    onProgress?.({ chapterId, status: 'downloading', current: 0, total: 0 });

    const result = await downloadMangaChapter(link, (current, total) => {
      onProgress?.({ chapterId, status: 'downloading', current, total });
    });

    if (result.error || result.pages.length === 0) {
      onProgress?.({
        chapterId,
        status: 'error',
        current: 0,
        total: 0,
        error: result.error,
      });
      return false;
    }

    // AsyncStorage güncelle
    const data = await AsyncStorage.getItem('localMangas');
    let mangas = JSON.parse(data || '[]');

    mangas = mangas.map((m: any) => {
      if (m.title !== mangaTitle) return m;
      return {
        ...m,
        chapters: m.chapters.map((c: any) =>
          c.id === chapterId
            ? { ...c, pages: result.pages, downloading: false, downloaded: true }
            : c
        ),
      };
    });

    await AsyncStorage.setItem('localMangas', JSON.stringify(mangas));

    onProgress?.({
      chapterId,
      status: 'done',
      current: result.pages.length,
      total: result.pages.length,
    });

    return true;
  } catch (e) {
    console.error('DOWNLOAD ERROR', e);
    onProgress?.({ chapterId, status: 'error', current: 0, total: 0, error: String(e) });
    return false;
  }
};

// Manganın tüm bölümlerini sırayla indir
export const downloadAllChapters = async (
  mangaTitle: string,
  chapters: Array<{ id: string; link: string }>,
  onProgress?: (chapterId: string, p: DownloadProgress) => void
): Promise<void> => {
  for (const chapter of chapters) {
    await downloadChapter(mangaTitle, chapter.id, chapter.link, (p) =>
      onProgress?.(chapter.id, p)
    );
  }
};