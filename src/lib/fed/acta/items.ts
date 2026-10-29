import type { ActaItem } from "./types";

/** Páginas que se leen: el acta es de una sola hoja; si trae más, el formato no es el esperado. */
const MAX_PAGES = 1;

/**
 * Lee un PDF de acta y devuelve sus textos con posición (origen arriba a la izquierda).
 * Solo servidor: usa pdf.js en su versión para Node, sin ejecutar código del PDF.
 */
export async function readActaItems(pdf: Uint8Array): Promise<ActaItem[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: pdf, useSystemFonts: true });
  const doc = await task.promise;
  try {
    if (doc.numPages > MAX_PAGES) throw new Error(`El acta tiene ${doc.numPages} páginas y se esperaba ${MAX_PAGES}.`);
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: ActaItem[] = [];
    for (const item of content.items) {
      if (!("str" in item) || item.str.trim() === "") continue;
      items.push({
        s: item.str,
        x: Math.round(item.transform[4] * 10) / 10,
        y: Math.round((viewport.height - item.transform[5]) * 10) / 10,
      });
    }
    return items;
  } finally {
    await task.destroy();
  }
}
