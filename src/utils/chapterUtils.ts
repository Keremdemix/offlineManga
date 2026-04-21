export function extractChapterNumber(html: string): number | null {
  if (!html) return null;

  // 1. normal pattern
  const patterns = [
    /chapter\s*[-:.]?\s*(\d+(?:\.\d+)?)/i,
    /episode\s*[-:.]?\s*(\d+(?:\.\d+)?)/i,
    /ch\s*[-:.]?\s*(\d+(?:\.\d+)?)/i,
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m) return Number(m[1]);
  }

  // 2. fallback: ilk sayı
  const fallback = html.match(/\d+(?:\.\d+)?/);
  return fallback ? Number(fallback[0]) : null;
}
