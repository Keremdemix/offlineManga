export function parseMangaImages(html: string): string[] {
  if (!html) return [];

  const urls: string[] = [];

  // 🔥 1. IMG TAGS
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

    // ❌ invalids
    if (
      !clean ||
      clean.startsWith('data:') ||
      clean.includes('placeholder') ||
      clean.includes('loading')
    )
      continue;

    // ❌ asset filter (SAFE VERSION)
    const isAsset = /logo|icon|avatar|banner|profile|favicon/i.test(clean);

    // ❌ image check
    const isImage = /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(clean);

    if (!isImage || isAsset) continue;

    urls.push(clean);
  }

  // 🔥 2. FALLBACK (SPAN / DIV background-image lazy sites)
  const bgRegex = /background-image\s*:\s*url\(["']?(.*?)["']?\)/gi;
  let bgMatch;

  while ((bgMatch = bgRegex.exec(html)) !== null) {
    const clean = bgMatch[1]?.trim();
    if (clean && clean.startsWith('http')) {
      urls.push(clean);
    }
  }

  // 🔥 3. CLEAN + UNIQUE
  const unique = [...new Set(urls)];

  // 🔥 4. SORT (son sayı bazlı)
  unique.sort((a, b) => {
    const getNum = (s: string) => {
      const m = s.match(/(\d+)(?=\.\w+(\?|$))/);
      return m ? Number(m[1]) : 0;
    };
    return getNum(a) - getNum(b);
  });

  console.log('FOUND IMAGES:', unique.length);

  return unique;
}
