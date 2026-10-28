/**
 * Inline-styled HTML primitives for transactional email (inbox-safe).
 * Premium card layout with branded header / footer / CTA.
 */

import { getActiveEmailBranding } from "./branding";
import type { EmailCta, EmailMetaRow } from "./types";

/** Brand primary from V5 FE (`--primary: #0040a3`) — default when no branding active. */
export const EMAIL_BRAND_PRIMARY = "#0040a3";
export const EMAIL_TEXT = "#0f172a";
export const EMAIL_MUTED = "#64748b";
export const EMAIL_BORDER = "#e2e8f0";
export const EMAIL_PAGE_BG = "#e8edf5";
export const EMAIL_CARD_BG = "#ffffff";
export const EMAIL_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function nl2br(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function monogramLabel(brandName: string): string {
  const parts = brandName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "iMS";
  if (parts.length === 1) return parts[0]!.slice(0, 3).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function renderTitle(title: string): string {
  return `<h1 style="margin:0 0 18px;font-size:22px;font-weight:650;letter-spacing:-0.02em;line-height:1.25;color:${EMAIL_TEXT};">${escapeHtml(title)}</h1>`;
}

export function renderEyebrow(text: string): string {
  const brand = getActiveEmailBranding();
  return `<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primary};">${escapeHtml(text)}</p>`;
}

export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${nl2br(text)}</p>`;
}

export function renderMetaList(rows: EmailMetaRow[]): string {
  if (rows.length === 0) return "";
  const brand = getActiveEmailBranding();
  const items = rows
    .map(
      (row, index) => `
      <tr>
        <td style="padding:12px 14px;vertical-align:top;font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:${EMAIL_MUTED};white-space:nowrap;width:132px;border-top:${index === 0 ? "0" : `1px solid ${EMAIL_BORDER}`};">${escapeHtml(row.label)}</td>
        <td style="padding:12px 14px;vertical-align:top;font-size:14px;line-height:1.5;color:${EMAIL_TEXT};border-top:${index === 0 ? "0" : `1px solid ${EMAIL_BORDER}`};">${nl2br(row.value)}</td>
      </tr>`
    )
    .join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 22px;border-collapse:separate;border:1px solid ${EMAIL_BORDER};border-radius:10px;overflow:hidden;background:${brand.primaryExtraLight};">
      ${items}
    </table>`;
}

export function renderButton(cta: EmailCta): string {
  const brand = getActiveEmailBranding();
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 24px;">
      <tr>
        <td style="border-radius:10px;background:${brand.primary};box-shadow:0 8px 20px rgba(15,23,42,0.12);">
          <a href="${escapeHtml(cta.href)}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;letter-spacing:0.01em;color:#ffffff;text-decoration:none;border-radius:10px;">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export function renderDivider(): string {
  return `<hr style="border:none;border-top:1px solid ${EMAIL_BORDER};margin:22px 0;" />`;
}

function renderLogoMark(): string {
  const brand = getActiveEmailBranding();
  if (brand.logoUrl) {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            <img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.brandName)}" width="152" height="48" style="display:block;max-width:152px;max-height:48px;width:auto;height:auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>
      </table>`;
  }

  const mark = monogramLabel(brand.brandName);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="width:44px;height:44px;border-radius:12px;background:${brand.primary};color:#ffffff;font-family:${EMAIL_FONT};font-size:13px;font-weight:800;letter-spacing:0.02em;text-align:center;vertical-align:middle;line-height:44px;">
          ${escapeHtml(mark)}
        </td>
        <td style="padding-left:12px;vertical-align:middle;font-family:${EMAIL_FONT};font-size:18px;font-weight:750;letter-spacing:-0.03em;color:${brand.primaryDark};">
          ${escapeHtml(brand.brandName)}
        </td>
      </tr>
    </table>`;
}

export function renderBrandHeader(): string {
  const brand = getActiveEmailBranding();
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="height:6px;line-height:6px;font-size:0;background:${brand.primary};">&nbsp;</td>
      </tr>
      <tr>
        <td style="padding:28px 32px 22px;background:linear-gradient(180deg, ${brand.primaryExtraLight} 0%, ${EMAIL_CARD_BG} 72%);border-bottom:1px solid ${EMAIL_BORDER};">
          ${renderLogoMark()}
        </td>
      </tr>
    </table>`;
}

export function renderBrandFooter(footerNote: string): string {
  const brand = getActiveEmailBranding();
  const poweredBy =
    brand.brandName === "iMS Systems"
      ? ""
      : `<p style="margin:10px 0 0;font-size:11px;line-height:1.4;color:${EMAIL_MUTED};">Powered by iMS Systems</p>`;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding:0;height:1px;line-height:1px;font-size:0;background:${EMAIL_BORDER};">&nbsp;</td>
      </tr>
      <tr>
        <td style="padding:22px 32px 10px;font-family:${EMAIL_FONT};background:${brand.primaryExtraLight};">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:-0.01em;color:${brand.primaryDark};">${escapeHtml(brand.brandName)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 28px;font-family:${EMAIL_FONT};font-size:12px;line-height:1.5;color:${EMAIL_MUTED};background:${brand.primaryExtraLight};">
          ${escapeHtml(footerNote)}
          ${poweredBy}
        </td>
      </tr>
    </table>`;
}
