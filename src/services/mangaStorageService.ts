// services/mangaStorageService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Manga } from '../types/manga';

const KEY = 'localMangas';

export const getMangas = async (): Promise<Manga[]> => {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
};

export const saveMangas = async (mangas: Manga[]) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(mangas));
};

export const deleteManga = async (title: string) => {
  const mangas = await getMangas();
  const updated = mangas.filter(m => m.title !== title);
  await saveMangas(updated);
};

export const updateManga = async (title: string, update: Partial<Manga>) => {
  const mangas = await getMangas();
  const updated = mangas.map(m =>
    m.title === title ? { ...m, ...update } : m
  );
  await saveMangas(updated);
};