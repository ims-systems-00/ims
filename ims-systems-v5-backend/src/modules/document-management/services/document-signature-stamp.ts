import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { ValidationAppError } from "../../../shared";
import type { SignatureLocation } from "../types";

/**
 * Stamp a professional electronic-signature block at relative page
 * locations on a PDF and return the new bytes.
 *
 * Block layout (top → bottom, inspired by the V4 stamp):
 * scripted name over a signature rule, printed name · title ·
 * organisation, and an "Electronically signed on …" caption — inside a
 * subtle bordered card with a navy accent edge. Locations are stored
 * top-left origin percentages (see the visual placement editor).
 * PDF-only by design (see ADR 0025 for the Office decision).
 */

const BLOCK_WIDTH = 200;
const BLOCK_HEIGHT = 68;
const PAGE_MARGIN = 8;

const INK = rgb(0.05, 0.16, 0.45);
const SLATE = rgb(0.25, 0.3, 0.4);
const MUTED = rgb(0.45, 0.5, 0.6);
const RULE = rgb(0.35, 0.42, 0.58);
const BORDER = rgb(0.62, 0.68, 0.78);
const ACCENT = rgb(0.11, 0.23, 0.48);

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatSignedDate(date: Date): string {
  const day = date.getUTCDate();
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} at ${hours}:${minutes} UTC`;
}

/** pdf-lib standard fonts are WinAnsi — strip anything outside it. */
function toWinAnsi(text: string): string {
  return text.replace(/[^\u0020-\u00FF]/g, "").trim();
}

/** Shrink (then truncate) a line until it fits the given width. */
function fitLine(
  font: PDFFont,
  text: string,
  maxWidth: number,
  startSize: number
): { text: string; size: number } {
  let size = startSize;
  let value = text;
  while (size > 6 && font.widthOfTextAtSize(value, size) > maxWidth) {
    size -= 0.5;
  }
  while (value.length > 4 && font.widthOfTextAtSize(value, size) > maxWidth) {
    value = `${value.slice(0, -2)}...`;
  }
  return { text: value, size };
}

export async function stampSignaturePdf(
  pdfBytes: Buffer,
  input: {
    name: string;
    jobTitle?: string;
    organisation?: string;
    locations: SignatureLocation[];
    signedAt: Date;
  }
): Promise<Buffer> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(pdfBytes);
  } catch {
    throw new ValidationAppError(
      "Signature placement is only supported for PDF documents"
    );
  }

  const scriptFont = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  const signerName = toWinAnsi(input.name) || "Signer";
  const identityParts = [toWinAnsi(input.jobTitle ?? ""), toWinAnsi(input.organisation ?? "")]
    .filter(Boolean)
    .join(", ");
  const identityLine = identityParts
    ? `${signerName} · ${identityParts}`
    : signerName;
  const caption = `Electronically signed on ${formatSignedDate(input.signedAt)} · iMS Systems`;

  for (const location of input.locations) {
    const page = pages[location.page - 1];
    if (!page) {
      throw new ValidationAppError(
        `Signature location page ${location.page} is out of range (document has ${pages.length} page(s))`
      );
    }
    const { width, height } = page.getSize();

    // Location (top-left origin) → PDF coords (bottom-left origin),
    // clamped so the whole block stays on the page.
    const originX = Math.min(
      Math.max(location.x * width, PAGE_MARGIN),
      Math.max(PAGE_MARGIN, width - BLOCK_WIDTH - PAGE_MARGIN)
    );
    const topY = Math.min(
      Math.max(height - location.y * height, BLOCK_HEIGHT + PAGE_MARGIN),
      height - PAGE_MARGIN
    );
    const blockBottom = topY - BLOCK_HEIGHT;
    const innerWidth = BLOCK_WIDTH - 24;

    // Card with accent edge.
    page.drawRectangle({
      x: originX,
      y: blockBottom,
      width: BLOCK_WIDTH,
      height: BLOCK_HEIGHT,
      color: rgb(1, 1, 1),
      opacity: 0.92,
      borderColor: BORDER,
      borderWidth: 0.75,
      borderOpacity: 0.9,
    });
    page.drawRectangle({
      x: originX,
      y: blockBottom,
      width: 3,
      height: BLOCK_HEIGHT,
      color: ACCENT,
    });

    // Scripted signature over the rule.
    const script = fitLine(scriptFont, signerName, innerWidth, 17);
    page.drawText(script.text, {
      x: originX + 12,
      y: topY - 23,
      size: script.size,
      font: scriptFont,
      color: INK,
    });
    page.drawLine({
      start: { x: originX + 12, y: topY - 29 },
      end: { x: originX + BLOCK_WIDTH - 12, y: topY - 29 },
      thickness: 0.8,
      color: RULE,
    });

    // Printed identity.
    const identity = fitLine(boldFont, identityLine, innerWidth, 7.5);
    page.drawText(identity.text, {
      x: originX + 12,
      y: topY - 41,
      size: identity.size,
      font: boldFont,
      color: SLATE,
    });

    // Electronic-signature caption.
    const captionLine = fitLine(regularFont, caption, innerWidth, 6.5);
    page.drawText(captionLine.text, {
      x: originX + 12,
      y: topY - 53,
      size: captionLine.size,
      font: regularFont,
      color: MUTED,
    });
  }

  const saved = await pdf.save();
  return Buffer.from(saved);
}
