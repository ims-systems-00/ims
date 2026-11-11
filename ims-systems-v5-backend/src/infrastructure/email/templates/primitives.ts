/**
 * Inline-styled HTML primitives for transactional email (inbox-safe).
 * Colorful brand theme without gradients or heavy card chrome.
 */

import { getActiveEmailBranding } from "./branding";
import type {
  EmailCta,
  EmailMetaRow,
  EmailStatusChip,
  EmailStatusTone,
} from "./types";

/** Brand primary from V5 FE (`--primary: #0040a3`) when no branding active. */
export const EMAIL_BRAND_PRIMARY = "#0040a3";
export const EMAIL_TEXT = "#111827";
export const EMAIL_MUTED = "#64748b";
export const EMAIL_BORDER = "#e2e8f0";
export const EMAIL_PAGE_BG = "#eef2f7";
export const EMAIL_CARD_BG = "#ffffff";
export const EMAIL_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const TONE_COLORS: Record<
  EmailStatusTone,
  { bg: string; fg: string }
> = {
  info: { bg: "#DBEAFE", fg: "#1D4ED8" },
  success: { bg: "#D1FAE5", fg: "#047857" },
  warning: { bg: "#FEF3C7", fg: "#B45309" },
  danger: { bg: "#FEE2E2", fg: "#B91C1C" },
};

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

export function renderTitle(title: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;color:${EMAIL_TEXT};">${escapeHtml(title)}</h1>`;
}

export function renderEyebrow(text: string): string {
  const brand = getActiveEmailBranding();
  return `<p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${brand.primary};">${escapeHtml(text)}</p>`;
}

export function renderStatusChip(chip: EmailStatusChip): string {
  const tone = chip.tone ?? "info";
  const colors = TONE_COLORS[tone];
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
      <tr>
        <td style="padding:6px 12px;background:${colors.bg};font-family:${EMAIL_FONT};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${colors.fg};">
          ${escapeHtml(chip.label)}
        </td>
      </tr>
    </table>`;
}

export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">${nl2br(text)}</p>`;
}

export function renderMetaList(rows: EmailMetaRow[]): string {
  if (rows.length === 0) return "";
  const brand = getActiveEmailBranding();
  const items = rows
    .map(
      (row, index) => `
      <tr>
        <td style="padding:12px 14px;vertical-align:top;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL_MUTED};white-space:nowrap;width:128px;border-top:${index === 0 ? "0" : `1px solid ${EMAIL_BORDER}`};">${escapeHtml(row.label)}</td>
        <td style="padding:12px 14px;vertical-align:top;font-size:14px;line-height:1.5;color:${EMAIL_TEXT};border-top:${index === 0 ? "0" : `1px solid ${EMAIL_BORDER}`};">${nl2br(row.value)}</td>
      </tr>`
    )
    .join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 22px;background:${brand.primaryExtraLight};">
      ${items}
    </table>`;
}

export function renderTwoColumnMeta(
  left: EmailMetaRow,
  right: EmailMetaRow
): string {
  const brand = getActiveEmailBranding();
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 22px;background:${brand.primaryExtraLight};">
      <tr>
        <td width="50%" style="padding:14px;vertical-align:top;border-right:1px solid ${EMAIL_BORDER};">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL_MUTED};">${escapeHtml(left.label)}</p>
          <p style="margin:0;font-size:15px;font-weight:650;color:${EMAIL_TEXT};">${nl2br(left.value)}</p>
        </td>
        <td width="50%" style="padding:14px;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL_MUTED};">${escapeHtml(right.label)}</p>
          <p style="margin:0;font-size:15px;font-weight:650;color:${EMAIL_TEXT};">${nl2br(right.value)}</p>
        </td>
      </tr>
    </table>`;
}

export function renderCodeBlock(input: {
  label?: string;
  value: string;
}): string {
  const brand = getActiveEmailBranding();
  const label = input.label
    ? `<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL_MUTED};">${escapeHtml(input.label)}</p>`
    : "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0 22px;">
      <tr>
        <td style="padding:18px 16px;background:${brand.primaryExtraLight};text-align:center;">
          ${label}
          <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:0.08em;color:${brand.primaryDark};">${escapeHtml(input.value)}</p>
        </td>
      </tr>
    </table>`;
}

export function renderHeroPanel(text: string): string {
  const brand = getActiveEmailBranding();
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
      <tr>
        <td style="padding:14px 16px;background:${brand.primary};color:#ffffff;font-family:${EMAIL_FONT};font-size:14px;line-height:1.55;font-weight:500;">
          ${escapeHtml(text)}
        </td>
      </tr>
    </table>`;
}

export function renderDetailCard(title: string, body: string): string {
  const brand = getActiveEmailBranding();
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
      <tr>
        <td style="padding:10px 14px;background:${brand.primaryExtraLight};font-family:${EMAIL_FONT};font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${brand.primaryDark};">
          ${escapeHtml(title)}
        </td>
      </tr>
      <tr>
        <td style="padding:14px;font-family:${EMAIL_FONT};font-size:14px;line-height:1.6;color:#334155;background:${EMAIL_CARD_BG};">
          ${nl2br(body)}
        </td>
      </tr>
    </table>`;
}

export function renderAttachmentNote(text: string): string {
  const brand = getActiveEmailBranding();
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
      <tr>
        <td style="padding:12px 14px;background:${brand.primaryExtraLight};font-family:${EMAIL_FONT};font-size:13px;line-height:1.5;color:#475569;">
          ${escapeHtml(text)}
        </td>
      </tr>
    </table>`;
}

/**
 * Solid brand CTA with Outlook VML fallback.
 */
export function renderButton(cta: EmailCta): string {
  const brand = getActiveEmailBranding();
  const href = escapeHtml(cta.href);
  const label = escapeHtml(cta.label);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 24px;">
      <tr>
        <td>
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:42px;v-text-anchor:middle;width:220px;" arcsize="8%" stroke="f" fillcolor="${brand.primary}">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;">${label}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a href="${href}" target="_blank" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;letter-spacing:0.01em;color:#ffffff;text-decoration:none;background:${brand.primary};">
            ${label}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

export function renderDivider(): string {
  return `<hr style="border:none;border-top:1px solid ${EMAIL_BORDER};margin:20px 0;" />`;
}

function renderLogoMark(): string {
  const brand = getActiveEmailBranding();
  if (brand.logoUrl) {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            <img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.brandName)}" width="168" style="display:block;max-width:168px;max-height:48px;width:auto;height:auto;border:0;outline:none;text-decoration:none;" />
          </td>
        </tr>
      </table>`;
  }

  return `
    <p style="margin:0;font-family:${EMAIL_FONT};font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">
      ${escapeHtml(brand.brandName)}
    </p>`;
}

export function renderBrandHeader(hero?: string): string {
  const brand = getActiveEmailBranding();
  const heroHtml = hero
    ? `<p style="margin:14px 0 0;font-family:${EMAIL_FONT};font-size:14px;line-height:1.55;color:rgba(255,255,255,0.9);">${escapeHtml(hero)}</p>`
    : "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding:28px 28px 26px;background:${brand.primaryDark};">
          ${renderLogoMark()}
          ${heroHtml}
        </td>
      </tr>
      <tr>
        <td style="height:4px;line-height:4px;font-size:0;background:${brand.primary};">&nbsp;</td>
      </tr>
    </table>`;
}

export function renderBrandFooter(footerNote: string): string {
  const brand = getActiveEmailBranding();
  const isIms = brand.brandName === "iMS Systems";
  const poweredBy = isIms
    ? ""
    : `<p style="margin:8px 0 0;font-size:12px;line-height:1.4;color:${EMAIL_MUTED};">Powered by iMS Systems</p>`;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding:22px 28px 8px;font-family:${EMAIL_FONT};background:${brand.primaryExtraLight};">
          <p style="margin:0;font-size:13px;font-weight:700;color:${brand.primaryDark};">${escapeHtml(brand.brandName)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 10px;font-family:${EMAIL_FONT};font-size:12px;line-height:1.55;color:${EMAIL_MUTED};background:${brand.primaryExtraLight};">
          ${escapeHtml(footerNote)}
          ${poweredBy}
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 24px;font-family:${EMAIL_FONT};font-size:12px;line-height:1.5;color:${EMAIL_MUTED};background:${brand.primaryExtraLight};">
          <a href="mailto:support@imssystems.tech" style="color:${brand.primary};text-decoration:none;font-weight:600;">support@imssystems.tech</a>
        </td>
      </tr>
    </table>`;
}
