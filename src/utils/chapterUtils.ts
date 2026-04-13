// utils/chapterUtils.ts
// Linkten bölüm numarasını çıkarır
// Desteklenen formatlar:
//   /chapter-12/   → 12
//   /bolum-3.5/    → 3.5
//   /ch-007/       → 7
//   ?chapter=42    → 42
//   /12/           → 12 (sonda sayı)

export function extractChapterNumber(link: string): number | null {
  if (!link) return null;

  const patterns = [
    // chapter-12, bolum-12
    /(?:chapter|bolum|bölüm|ch|cap|chapitre|capitulo|kapitel)[-_.](\d+(?:\.\d+)?)/i,

    // ?chapter=12
    /[?&]chapter=(\d+(?:\.\d+)?)/i,

    // /12/ veya /012/
    /\/(\d{1,4})(?:\/|$|\?)/,

    // 🔥 YENİ: one-piece-1177 gibi
    /-(\d{1,4})(?:$|\?)/,
  ];

  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num)) return num;
    }
  }

  return null;
}