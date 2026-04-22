export function extractChapterNumber(input: string): number | null {
  if (!input) return null;

  // 1) öncelik: explicit chapter patterns
  const explicit = input.match(
    /(?:bolum|bölüm|chapter|episode|ch)[-\/]?\s*(\d+(?:\.\d+)?)/i,
  );

  if (explicit?.[1]) {
    return Number(explicit[1]);
  }

  // 2) fallback: URL'nin SON numeric segmenti
  // örnek: .../845-bolum  veya .../10419/845
  const segments = input.split('/').filter(Boolean).reverse();

  for (const seg of segments) {
    const match = seg.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}
