import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadMangaChapter } from '../services/mangaService';

export const downloadChapter = async (chapterId: string, link: string) => {
  try {
    const pages = await downloadMangaChapter(link);

    const data = await AsyncStorage.getItem('localMangas');
    let mangas = JSON.parse(data || '[]');

    mangas = mangas.map((m: { chapters: any[]; }) => ({
      ...m,
      chapters: m.chapters.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              pages,
              downloading: false,
              downloaded: true
            }
          : c
      )
    }));

    await AsyncStorage.setItem('localMangas', JSON.stringify(mangas));
  } catch (e) {
    console.log('DOWNLOAD ERROR', e);
  }
};