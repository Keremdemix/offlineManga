// services/mangaService.ts
import { parseMangaImages } from '../utils/htmlParser';
import { downloadMangaPages } from '../utils/fileUtils';

export async function downloadMangaChapter(mangaUrl: string): Promise<string[]> {
  try {
    // HTML çek
    const response = await fetch(mangaUrl);
    const html = await response.text();

    console.log('HTML LENGTH:', html.length);

    // URL'leri al
    const imageUrls = parseMangaImages(html);

    console.log('FOUND IMAGES:', imageUrls.length);

    if (imageUrls.length === 0) return [];

    // indir
    const folderName = `manga_${Date.now()}`;
    const localDir = await downloadMangaPages(html, folderName);

    // path oluştur
    return imageUrls.map((url, idx) => {
      const fileExt = url.split('.').pop()?.split('?')[0] || 'jpg';
      return `${localDir}/${idx}.${fileExt}`;
    });
  } catch (err) {
    console.error('Manga download error:', err);
    return [];
  }
}