/**
 * Shared V5 transactional email layout — premium branded header + footer + card.
 */

import { getActiveEmailBranding } from "./branding";
import {
  EMAIL_CARD_BG,
  EMAIL_FONT,
  EMAIL_PAGE_BG,
  EMAIL_TEXT,
  escapeHtml,
  renderAttachmentNote,
  renderBrandFooter,
  renderBrandHeader,
  renderButton,
  renderCodeBlock,
  renderEyebrow,
  renderHeroPanel,
  renderMetaList,
  renderParagraph,
  renderStatusChip,
  renderTitle,
} from "./primitives";
import type { EmailLayoutInput, RenderedEmail } from "./types";

function defaultHeroForMode(mode: EmailLayoutInput["mode"]): string | undefined {
  switch (mode) {
    case "invite":
      return "You’re invited to collaborate securely on iMS.";
    case "action":
      return "A document needs your attention.";
    case "receipt":
      return "Here’s a summary of your request.";
    case "alert":
      return "Important account update — please review.";
    case "success":
      return "You’re all set.";
    case "internal":
      return "Internal notification for the iMS team.";
    default:
      return undefined;
  }
}

export function renderEmailLayout(
  subject: string,
  input: EmailLayoutInput
): RenderedEmail {
  const brand = getActiveEmailBranding();
  const mode = input.mode ?? "default";
  const paragraphs = input.paragraphs ?? [];
  const closing = input.closing ?? [];
  const footerNote = input.footerNote ?? brand.footerNote;
  const pageBg = brand.primaryExtraLight || EMAIL_PAGE_BG;
  const preheader = input.preheader ?? input.title;
  const hero = input.hero ?? defaultHeroForMode(mode);

  const bodyHtml = [
    input.eyebrow ? renderEyebrow(input.eyebrow) : "",
    input.statusChip ? renderStatusChip(input.statusChip) : "",
    renderTitle(input.title),
    mode === "alert" && !input.hero ? renderHeroPanel(defaultHeroForMode("alert")!) : "",
    input.greeting
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">${escapeHtml(input.greeting)}</p>`
      : "",
    ...paragraphs.map(renderParagraph),
    input.meta?.length ? renderMetaList(input.meta) : "",
    input.codeBlock ? renderCodeBlock(input.codeBlock) : "",
    input.safeHtmlBlock ?? "",
    input.attachmentNote ? renderAttachmentNote(input.attachmentNote) : "",
    input.cta ? renderButton(input.cta) : "",
    ...closing.map(renderParagraph),
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${pageBg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${pageBg};">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:${EMAIL_CARD_BG};border:1px solid rgba(15,23,42,0.08);border-radius:16px;overflow:hidden;box-shadow:0 22px 48px rgba(15,23,42,0.1);">
          <tr>
            <td>
              ${renderBrandHeader(hero)}
            </td>
          </tr>
          <tr>
            <td style="padding:34px 34px 14px;font-family:${EMAIL_FONT};color:${EMAIL_TEXT};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td>
              ${renderBrandFooter(footerNote)}
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-family:${EMAIL_FONT};font-size:11px;line-height:1.4;color:#94a3b8;">
          You’re receiving this email from ${escapeHtml(brand.brandName)}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts: string[] = [];
  textParts.push(brand.brandName, "");
  if (input.eyebrow) textParts.push(input.eyebrow.toUpperCase(), "");
  if (input.statusChip) textParts.push(`[${input.statusChip.label}]`, "");
  textParts.push(input.title, "");
  if (input.greeting) textParts.push(input.greeting, "");
  for (const p of paragraphs) textParts.push(p, "");
  if (input.meta?.length) {
    for (const row of input.meta) {
      textParts.push(`${row.label}: ${row.value}`);
    }
    textParts.push("");
  }
  if (input.codeBlock) {
    textParts.push(
      `${input.codeBlock.label ?? "Code"}: ${input.codeBlock.value}`,
      ""
    );
  }
  if (input.attachmentNote) {
    textParts.push(`Attachment: ${input.attachmentNote}`, "");
  }
  if (input.cta) {
    textParts.push(`${input.cta.label}: ${input.cta.href}`, "");
  }
  for (const line of closing) textParts.push(line, "");
  textParts.push("---", footerNote);

  return {
    subject,
    html,
    text: textParts.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}
