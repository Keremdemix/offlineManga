// utils/parseMangaImages.ts
import { Image } from 'react-native';

const MIN_SIZE = 600;

/**
 * 600x600 altını filtreler (async çünkü Image.getSize kullanır)
 */
async function filterBySize(urls: string[]): Promise<string[]> {
  const results = await Promise.all(
    urls.map(
      (url) =>
        new Promise<string | null>((resolve) => {
          Image.getSize(
            url,
            (w, h) => {
              if ( h >= MIN_SIZE) resolve(url);
              else resolve(null);
            },
            () => resolve(null),
          );
        }),
    ),
  );

  return results.filter(Boolean) as string[];
}

/**
 * HTML içinden manga image URL'lerini çıkarır
 */
export async function parseMangaImages(html: string): Promise<string[]> {
  if (!html || typeof html !== 'string') return [];

  const urls: string[] = [];

  // 🔥 IMG TAGS
  const imgRegex = /<img[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];

    const url =
      /data-src\s*=\s*"([^"]+)"/i.exec(imgTag)?.[1] ||
      /data-lazy-src\s*=\s*"([^"]+)"/i.exec(imgTag)?.[1] ||
      /data-original\s*=\s*"([^"]+)"/i.exec(imgTag)?.[1] ||
      /src\s*=\s*"([^"]+)"/i.exec(imgTag)?.[1];

    if (!url) continue;

    const clean = url.trim();

    if (
      !clean ||
      clean.startsWith('data:') ||
      clean.includes('placeholder') ||
      clean.includes('loading')
    ) continue;

    const isAsset =
      /logo|icon|avatar|banner|profile|favicon/i.test(clean);

    const isImage =
      /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(clean);

    if (!isImage || isAsset) continue;

    urls.push(clean);
  }

  // 🔥 BACKGROUND IMAGES
  const bgRegex = /background-image\s*:\s*url\(["']?(.*?)["']?\)/gi;
  let bgMatch: RegExpExecArray | null;

  while ((bgMatch = bgRegex.exec(html)) !== null) {
    const clean = bgMatch[1]?.trim();
    if (clean && clean.startsWith('http')) {
      urls.push(clean);
    }
  }

  // 🔥 UNIQUE
  const unique = [...new Set(urls)];

  console.log('FOUND IMAGES (raw):', unique.length);

  // 🔥 SIZE FILTER (600x600)
  const filtered = await filterBySize(unique);

  // 🔥 SORT (numara bazlı)
  filtered.sort((a, b) => {
    const getNum = (s: string) => {
      const m = s.match(/(\d+)(?=\.\w+(\?|$))/);
      return m ? Number(m[1]) : 0;
    };
    return getNum(a) - getNum(b);
  });

  console.log('FOUND IMAGES (600+):', filtered.length);

  return filtered;
}