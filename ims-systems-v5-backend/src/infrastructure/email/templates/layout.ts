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
  renderBrandFooter,
  renderBrandHeader,
  renderButton,
  renderEyebrow,
  renderMetaList,
  renderParagraph,
  renderTitle,
} from "./primitives";
import type { EmailLayoutInput, RenderedEmail } from "./types";

export function renderEmailLayout(
  subject: string,
  input: EmailLayoutInput
): RenderedEmail {
  const brand = getActiveEmailBranding();
  const paragraphs = input.paragraphs ?? [];
  const closing = input.closing ?? [];
  const footerNote = input.footerNote ?? brand.footerNote;
  const pageBg = brand.primaryExtraLight || EMAIL_PAGE_BG;

  const bodyHtml = [
    input.eyebrow ? renderEyebrow(input.eyebrow) : "",
    renderTitle(input.title),
    input.greeting
      ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(input.greeting)}</p>`
      : "",
    ...paragraphs.map(renderParagraph),
    input.meta?.length ? renderMetaList(input.meta) : "",
    input.safeHtmlBlock ?? "",
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
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(input.title)}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${pageBg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;background:${EMAIL_CARD_BG};border:1px solid rgba(15,23,42,0.08);border-radius:14px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          <tr>
            <td>
              ${renderBrandHeader()}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 12px;font-family:${EMAIL_FONT};color:${EMAIL_TEXT};">
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
  textParts.push(input.title, "");
  if (input.greeting) textParts.push(input.greeting, "");
  for (const p of paragraphs) textParts.push(p, "");
  if (input.meta?.length) {
    for (const row of input.meta) {
      textParts.push(`${row.label}: ${row.value}`);
    }
    textParts.push("");
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
