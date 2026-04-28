import { parseMangaImages } from '../utils/htmlParser';
import { downloadMangaPages } from '../utils/fileUtils';

export interface DownloadResult {
  pages: string[];
  error?: string;
}

export async function downloadMangaChapter(
  mangaUrl: string,
  onProgress?: (current: number, total: number) => void,
): Promise<DownloadResult> {
  try {
    const response = await fetch(mangaUrl);

    if (!response.ok) {
      return { pages: [], error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    console.log('HTML LENGTH:', html.length);

    // 🔥 FIX BURADA
    const imageUrls = await parseMangaImages(html);

    console.log('FOUND IMAGES:', imageUrls.length);

    if (!imageUrls || imageUrls.length === 0) {
      return { pages: [], error: 'Sayfa bulunamadı' };
    }

    onProgress?.(0, imageUrls.length);

    const folderName = `manga_${Date.now()}`;
    const localDir = await downloadMangaPages(html, folderName);

    const pages = imageUrls.map((url, idx) => {
      const fileExt = url.split('.').pop()?.split('?')[0] || 'jpg';
      return `${localDir}/${idx}.${fileExt}`;
    });

    onProgress?.(imageUrls.length, imageUrls.length);

    return { pages };
  } catch (err) {
    console.error('Manga download error:', err);
    return { pages: [], error: String(err) };
  }
}