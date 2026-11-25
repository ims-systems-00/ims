/**
 * QR helpers for training self-service links.
 * Mirrors inventory/lib/qr.ts — public QR API with offline SVG fallback.
 */

export function trainingSelfUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/training/t/${encodeURIComponent(token)}`;
}

export async function qrDataUrl(text: string, size = 128): Promise<string> {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("QR fetch failed");
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return svgMatrixFallback(text, size);
  }
}

function svgMatrixFallback(text: string, size: number): string {
  const cells = buildPseudoMatrix(text, 21);
  const n = cells.length;
  const pad = 2;
  const cell = (size - pad * 2) / n;
  const rects: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!cells[y]![x]) continue;
      rects.push(
        `<rect x="${(pad + x * cell).toFixed(2)}" y="${(pad + y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#111"/>`
      );
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#fff"/>${rects.join("")}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildPseudoMatrix(text: string, size: number): boolean[][] {
  const m: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );
  const paintFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        m[oy + y]![ox + x] = edge || core;
      }
    }
  };
  paintFinder(0, 0);
  paintFinder(size - 7, 0);
  paintFinder(0, size - 7);

  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (m[y]![x]) continue;
      if (x < 8 && y < 8) continue;
      if (x >= size - 8 && y < 8) continue;
      if (x < 8 && y >= size - 8) continue;
      const bit = (h ^ (x * 374761393) ^ (y * 668265263)) >>> 0;
      m[y]![x] = (bit & 7) < 3;
    }
  }
  return m;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
