/**
 * Shared PDF renderer for auditor packs (pdf-lib).
 * Modules supply structured sections; this owns layout, branding and pagination.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type AuditorPackPdfSummary = {
  label: string;
  value: string | number;
};

export type AuditorPackPdfSection = {
  number: string;
  title: string;
  lines: string[];
};

export type AuditorPackPdfInput = {
  orgName: string;
  documentTitle: string;
  moduleLabel: string;
  asOf: string;
  summary?: AuditorPackPdfSummary[];
  sections: AuditorPackPdfSection[];
};

export async function renderAuditorPackPdf(
  input: AuditorPackPdfInput
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.39, 0.45, 0.55);
  const accent = rgb(0.06, 0.46, 0.43);
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 48;
  const right = pageWidth - 48;
  const maxWidth = right - left;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 48;
  let pageNo = 1;

  const drawFooter = () => {
    page.drawLine({
      start: { x: left, y: 40 },
      end: { x: right, y: 40 },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.93),
    });
    page.drawText(`${input.orgName} · Confidential`.slice(0, 70), {
      x: left,
      y: 26,
      size: 8,
      font,
      color: muted,
    });
    page.drawText(`Page ${pageNo}`, {
      x: right - 48,
      y: 26,
      size: 8,
      font,
      color: muted,
    });
  };

  const newPage = (continued: boolean) => {
    drawFooter();
    page = pdf.addPage([pageWidth, pageHeight]);
    pageNo += 1;
    page.drawRectangle({
      x: 0,
      y: pageHeight - 8,
      width: pageWidth,
      height: 8,
      color: accent,
    });
    y = pageHeight - 36;
    if (continued) {
      page.drawText(`${input.documentTitle} · continued`.slice(0, 90), {
        x: left,
        y,
        size: 9,
        font,
        color: muted,
      });
      y -= 22;
    }
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 56) newPage(true);
  };

  const wrap = (text: string, size: number, useBold = false): string[] => {
    const f = useBold ? bold : font;
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const write = (
    text: string,
    size = 10,
    useBold = false,
    color = ink
  ) => {
    const lines = wrap(text, size, useBold);
    for (const line of lines) {
      ensureSpace(size + 6);
      page.drawText(line.slice(0, 180), {
        x: left,
        y,
        size,
        font: useBold ? bold : font,
        color,
      });
      y -= size + 5;
    }
  };

  // Masthead
  page.drawRectangle({
    x: 0,
    y: pageHeight - 8,
    width: pageWidth,
    height: 8,
    color: accent,
  });
  y = pageHeight - 40;
  write(input.moduleLabel.toUpperCase(), 9, true, accent);
  write(input.documentTitle, 18, true);
  y -= 2;
  write(input.orgName, 12, true);
  write(`As of ${input.asOf}  ·  Controlled audit evidence`, 9, false, muted);
  y -= 10;

  if (input.summary?.length) {
    write("Summary", 11, true);
    y -= 2;
    for (const card of input.summary) {
      write(`${card.label}: ${card.value}`, 9);
    }
    y -= 8;
  }

  for (const section of input.sections) {
    ensureSpace(40);
    write(`${section.number}  ${section.title}`, 12, true);
    y -= 2;
    if (!section.lines.length) {
      write("None recorded", 9, false, muted);
    } else {
      for (const line of section.lines) {
        write(line, 9);
      }
    }
    y -= 8;
  }

  drawFooter();
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
