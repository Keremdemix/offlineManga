/* import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadMangaChapter } from '../services/mangaService';

interface Chapter {
  id: string;
  link: string;
  pages?: string[];
  downloading?: boolean;
  downloaded?: boolean;
}

interface Manga {
  title: string;
  chapters: Chapter[];
}

export const downloadChapter = async (
  chapterId: string,
  link: string
): Promise<void> => {
  try {
    // 🔥 download
    const result = await downloadMangaChapter(link);

    const pages: string[] =
      Array.isArray(result) ? result : result?.pages || [];

    if (!pages.length) {
      console.warn('No pages found for chapter:', chapterId);
      return;
    }

    // 🔥 storage al
    const data = await AsyncStorage.getItem('localMangas');
    const mangas: Manga[] = data ? JSON.parse(data) : [];

    // 🔥 safe update
    const updatedMangas = mangas.map((m) => ({
      ...m,
      chapters: (m.chapters || []).map((c) =>
        c.id === chapterId
          ? {
              ...c,
              pages,
              downloading: false,
              downloaded: true,
            }
          : c
      ),
    }));

    // 🔥 save
    await AsyncStorage.setItem(
      'localMangas',
      JSON.stringify(updatedMangas)
    );
  } catch (e) {
    console.error('DOWNLOAD ERROR', e);
  }
}; */