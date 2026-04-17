export function parseMangaImages(html: string): string[] {
  const urls: string[] = [];

  // 1️⃣ Direkt tüm HTML içinde img taglerini yakala
  const imgRegex = /<img[^>]+>/gi;

  let match: RegExpExecArray | null;

 while ((match = imgRegex.exec(html)) !== null) {
  const imgTag = match[0];

  const url =
    /data-src="([^"]+)"/i.exec(imgTag)?.[1] ||
    /data-lazy-src="([^"]+)"/i.exec(imgTag)?.[1] ||
    /data-original="([^"]+)"/i.exec(imgTag)?.[1] ||
    /src="([^"]+)"/i.exec(imgTag)?.[1];

  if (!url) continue;

  const cleanUrl = url.trim();

  // ❌ thumbnail / small image detection
const isThumbnail =
  /-\d{2,4}x\d{2,4}(-\d+)?\./.test(cleanUrl)
    cleanUrl.includes("thumb") ||
    cleanUrl.includes("thumbnail");

  // ❌ unwanted assets
  const isUnwanted =
    cleanUrl.includes("logo") ||
    cleanUrl.includes("icon") ||
    cleanUrl.includes("avatar") ||
    cleanUrl.includes("banner") ||
    cleanUrl.includes("cover") ||
    cleanUrl.includes("covers") ||
    cleanUrl.includes("profile") ||
    cleanUrl.includes("author") ||
    cleanUrl.includes("user-") ||
    cleanUrl.includes("default");

  // ❌ extension check (sadece image kalsın)
  const isValidImage = /\.(png|jpg|jpeg|webp)$/i.test(cleanUrl);

  if (!cleanUrl.startsWith("http") || !isValidImage || isThumbnail || isUnwanted) {
    continue;
  }

  urls.push(cleanUrl);
}

  // 4️⃣ Duplicate temizle
  const uniqueUrls = [...new Set(urls)];

  // 5️⃣ Sayıya göre sırala (1.jpg, 2.jpg vs)
  uniqueUrls.sort((a, b) => {
    const getNum = (str: string) => {
      const match = str.match(/(\d+)(?=\.\w+$)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    return getNum(a) - getNum(b);
  });

  console.log("FOUND IMAGES:", uniqueUrls.length);
console.log("IMAGE LIST:");
uniqueUrls.forEach((url, index) => {
  console.log(`${index + 1}. ${url}`);
});

  return uniqueUrls;
}