import RNFS from 'react-native-fs';
import { parseMangaImages } from './htmlParser';

export async function downloadMangaPages(html: string, folderName: string) {
  const urls = await parseMangaImages(html); // 🔥 FIX

  if (!urls || urls.length === 0) {
    throw new Error('No images found');
  }

  const dir = `${RNFS.DocumentDirectoryPath}/${folderName}`;

  await RNFS.mkdir(dir).catch(() => null);

  const promises = urls.map((url, index) => {
    const fileExt = url.split('.').pop()?.split('?')[0] || 'jpg';
    const filePath = `${dir}/${index}.${fileExt}`;

    return RNFS.downloadFile({
      fromUrl: url,
      toFile: filePath,
    }).promise;
  });

  await Promise.all(promises);

  return dir;
}