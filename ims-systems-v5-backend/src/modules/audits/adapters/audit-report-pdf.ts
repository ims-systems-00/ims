/**
 * Professional A4 PDF extract for audit report emails (pdf-lib).
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Audit } from "../types";

const PAGE = { width: 595, height: 842 } as const;
const MARGIN = { left: 48, right: 48, top: 48, bottom: 52 } as const;
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

const COLORS = {
  ink: rgb(0.07, 0.09, 0.15),
  muted: rgb(0.39, 0.45, 0.55),
  line: rgb(0.86, 0.89, 0.93),
  brand: rgb(0, 0.25, 0.64),
  brandDark: rgb(0, 0.18, 0.45),
  band: rgb(0.95, 0.96, 0.98),
  success: rgb(0.02, 0.47, 0.34),
  warning: rgb(0.71, 0.33, 0.04),
};

function fmtDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB", { dateStyle: "medium" });
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0]!;
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]!}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i]!;
    }
  }
  lines.push(current);
  return lines;
}

type PdfCtx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  pageNumber: number;
};

function ensureSpace(ctx: PdfCtx, needed: number): void {
  if (ctx.y - needed >= MARGIN.bottom) return;
  drawFooter(ctx);
  ctx.page = ctx.doc.addPage([PAGE.width, PAGE.height]);
  ctx.pageNumber += 1;
  ctx.y = PAGE.height - MARGIN.top;
  drawPageChrome(ctx);
}

function drawPageChrome(ctx: PdfCtx): void {
  const { page } = ctx;
  page.drawRectangle({
    x: 0,
    y: PAGE.height - 10,
    width: PAGE.width,
    height: 10,
    color: COLORS.brandDark,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE.height - 14,
    width: PAGE.width,
    height: 4,
    color: COLORS.brand,
  });
}

function drawFooter(ctx: PdfCtx): void {
  const { page, font, pageNumber } = ctx;
  page.drawLine({
    start: { x: MARGIN.left, y: MARGIN.bottom - 12 },
    end: { x: PAGE.width - MARGIN.right, y: MARGIN.bottom - 12 },
    thickness: 0.6,
    color: COLORS.line,
  });
  page.drawText("iMS Systems · Confidential audit extract", {
    x: MARGIN.left,
    y: MARGIN.bottom - 28,
    size: 8,
    font,
    color: COLORS.muted,
  });
  const label = `Page ${pageNumber}`;
  const width = font.widthOfTextAtSize(label, 8);
  page.drawText(label, {
    x: PAGE.width - MARGIN.right - width,
    y: MARGIN.bottom - 28,
    size: 8,
    font,
    color: COLORS.muted,
  });
}

function drawHeading(ctx: PdfCtx, title: string, size = 18): void {
  ensureSpace(ctx, size + 18);
  ctx.page.drawText(title, {
    x: MARGIN.left,
    y: ctx.y,
    size,
    font: ctx.bold,
    color: COLORS.ink,
  });
  ctx.y -= size + 10;
}

function drawParagraph(
  ctx: PdfCtx,
  text: string,
  options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number }
): void {
  const size = options?.size ?? 10;
  const font = options?.bold ? ctx.bold : ctx.font;
  const color = options?.color ?? COLORS.ink;
  const indent = options?.indent ?? 0;
  const lines = wrapText(font, text, size, CONTENT_WIDTH - indent);
  for (const line of lines) {
    ensureSpace(ctx, size + 4);
    ctx.page.drawText(line, {
      x: MARGIN.left + indent,
      y: ctx.y,
      size,
      font,
      color,
    });
    ctx.y -= size + 4;
  }
}

function drawSectionTitle(ctx: PdfCtx, title: string, count: number): void {
  ensureSpace(ctx, 28);
  ctx.y -= 6;
  ctx.page.drawRectangle({
    x: MARGIN.left,
    y: ctx.y - 4,
    width: CONTENT_WIDTH,
    height: 22,
    color: COLORS.band,
  });
  ctx.page.drawText(`${title} (${count})`, {
    x: MARGIN.left + 10,
    y: ctx.y + 2,
    size: 11,
    font: ctx.bold,
    color: COLORS.brandDark,
  });
  ctx.y -= 26;
}

function drawMetaRow(ctx: PdfCtx, label: string, value: string): void {
  const size = 10;
  ensureSpace(ctx, size + 8);
  ctx.page.drawText(label, {
    x: MARGIN.left,
    y: ctx.y,
    size,
    font: ctx.bold,
    color: COLORS.muted,
  });
  const lines = wrapText(ctx.font, value, size, CONTENT_WIDTH - 140);
  lines.forEach((line, index) => {
    if (index > 0) ensureSpace(ctx, size + 4);
    ctx.page.drawText(line, {
      x: MARGIN.left + 140,
      y: ctx.y,
      size,
      font: ctx.font,
      color: COLORS.ink,
    });
    if (index < lines.length - 1) ctx.y -= size + 4;
  });
  ctx.y -= size + 8;
}

function drawEmptyState(ctx: PdfCtx, message: string): void {
  drawParagraph(ctx, message, { size: 10, color: COLORS.muted });
  ctx.y -= 4;
}

export async function buildAuditReportPdf(audit: Audit): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE.width, PAGE.height]);

  const ctx: PdfCtx = {
    doc,
    page,
    font,
    bold,
    y: PAGE.height - MARGIN.top - 8,
    pageNumber: 1,
  };

  drawPageChrome(ctx);

  drawHeading(ctx, "Audit report", 20);
  drawParagraph(ctx, `${audit.reference} · ${audit.title}`, {
    size: 12,
    bold: true,
  });
  ctx.y -= 4;

  const status = audit.completed?.status ? "Completed" : "Open";
  const statusColor = audit.completed?.status ? COLORS.success : COLORS.warning;
  ensureSpace(ctx, 18);
  ctx.page.drawText(status.toUpperCase(), {
    x: MARGIN.left,
    y: ctx.y,
    size: 9,
    font: bold,
    color: statusColor,
  });
  ctx.y -= 18;

  drawSectionTitle(ctx, "Summary", 1);
  drawMetaRow(ctx, "Type", audit.type);
  drawMetaRow(ctx, "Focus area", audit.focusArea);
  drawMetaRow(
    ctx,
    "Start date",
    `${fmtDate(audit.startDate)}${audit.time ? ` · ${audit.time}` : ""}`
  );
  drawMetaRow(ctx, "Interval", audit.interval);
  drawMetaRow(ctx, "Status", status);
  if (audit.comment?.trim()) {
    drawMetaRow(ctx, "Comment", audit.comment.trim());
  }

  drawSectionTitle(ctx, "Identifications / non-conformities", audit.identifications.length);
  if (audit.identifications.length === 0) {
    drawEmptyState(ctx, "None recorded.");
  } else {
    audit.identifications.forEach((item, index) => {
      drawParagraph(ctx, `${index + 1}. ${item.nonConformity}`, {
        size: 10,
        bold: true,
      });
      if (item.rootCause?.trim()) {
        drawParagraph(ctx, `Root cause: ${item.rootCause}`, {
          size: 9,
          color: COLORS.muted,
          indent: 14,
        });
      }
      ctx.y -= 4;
    });
  }

  drawSectionTitle(ctx, "Embedded risks", audit.risks.length);
  if (audit.risks.length === 0) {
    drawEmptyState(ctx, "None recorded.");
  } else {
    audit.risks.forEach((risk, index) => {
      drawParagraph(
        ctx,
        `${index + 1}. ${risk.title}  ·  L${risk.likelihood} × C${risk.consequence} = ${risk.total}`,
        { size: 10, bold: true }
      );
      if (risk.description?.trim()) {
        drawParagraph(ctx, risk.description, {
          size: 9,
          color: COLORS.muted,
          indent: 14,
        });
      }
      ctx.y -= 4;
    });
  }

  drawSectionTitle(ctx, "Opportunities for improvement", audit.ofis.length);
  if (audit.ofis.length === 0) {
    drawEmptyState(ctx, "None recorded.");
  } else {
    audit.ofis.forEach((ofi, index) => {
      drawParagraph(ctx, `${index + 1}. ${ofi.title}`, { size: 10, bold: true });
      if (ofi.opportunityForImprovement?.trim()) {
        drawParagraph(ctx, ofi.opportunityForImprovement, {
          size: 9,
          color: COLORS.muted,
          indent: 14,
        });
      }
      ctx.y -= 4;
    });
  }

  drawSectionTitle(ctx, "Supporting attachments", audit.attachments.length);
  if (audit.attachments.length === 0) {
    drawEmptyState(ctx, "None attached to this audit.");
  } else {
    audit.attachments.forEach((file, index) => {
      drawParagraph(ctx, `${index + 1}. ${file.fileName}`, { size: 10 });
    });
  }

  ctx.y -= 10;
  drawParagraph(
    ctx,
    `Generated by iMS Systems on ${fmtDate(new Date())}. This extract summarises the audit record for the recipient named in the covering email.`,
    { size: 8, color: COLORS.muted }
  );

  drawFooter(ctx);
  return doc.save();
}
