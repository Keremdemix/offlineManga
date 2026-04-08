// utils/htmlParser.ts
export function parseMangaImages(html: string): string[] {
  // Tüm <img> taglerini bul, class wp-manga-chapter-img olanları filtrele
  const imgRegex = /<img[^>]+class="wp-manga-chapter-img"[^>]*>/g;
  const urls: string[] = [];

  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];

    // Öncelikle src attribute
    let url = /src="([^"]+)"/.exec(imgTag)?.[1]?.trim();

    // Eğer src yoksa lazy load için data-src attribute
    if (!url || !url.startsWith('http')) {
      url = /data-src="([^"]+)"/.exec(imgTag)?.[1]?.trim();
    }

    // Son güvenlik kontrolü
    if (url && url.startsWith('http')) {
      urls.push(url);
    }
  }

  console.log('FOUND IMAGES:', urls.length);
  return urls;
}