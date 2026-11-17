/**
 * Shared onboarding email attachments (Service Charter + Adoption Pack).
 * Files live in `assets/onboarding/` at the backend package root.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Logger } from "../logging/logger";
import type { EmailAttachment } from "./types";

const ONBOARDING_ASSETS: Array<{ filename: string; type: string }> = [
  {
    filename: "ims-systems-adoption-pack.pptx",
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  { filename: "service-charter.pdf", type: "application/pdf" },
];

const SERVICE_CHARTER_ASSET = {
  filename: "service-charter.pdf",
  /** Friendly name shown to the recipient. */
  downloadName: "iMS OS Service Charter.pdf",
  type: "application/pdf",
} as const;

let cachedOnboardingAttachments: EmailAttachment[] | undefined;
let cachedServiceCharter: EmailAttachment[] | undefined;

function resolveOnboardingAssetsDir(): string {
  // This module lives at <root>/{src|dist}/infrastructure/email.
  return path.resolve(__dirname, "../../../assets/onboarding");
}

function loadAttachmentFile(
  assetsDir: string,
  filename: string,
  type: string,
  downloadName: string,
  logger?: Logger
): EmailAttachment | null {
  try {
    const content = readFileSync(path.join(assetsDir, filename));
    return {
      filename: downloadName,
      contentBase64: content.toString("base64"),
      type,
      // PDFs/PPTX must be downloadable attachments — SendGrid requires
      // content_id when disposition is "inline" (used only for cid images).
      disposition: "attachment",
    };
  } catch {
    logger?.warn(
      { filename, assetsDir },
      "Onboarding attachment missing; sending without it"
    );
    return null;
  }
}

/** Adoption pack + Service Charter (Go Live onboard-success). */
export function loadOnboardingAttachments(logger?: Logger): EmailAttachment[] {
  if (cachedOnboardingAttachments) return cachedOnboardingAttachments;
  const assetsDir = resolveOnboardingAssetsDir();
  const attachments: EmailAttachment[] = [];
  for (const asset of ONBOARDING_ASSETS) {
    const loaded = loadAttachmentFile(
      assetsDir,
      asset.filename,
      asset.type,
      asset.filename,
      logger
    );
    if (loaded) attachments.push(loaded);
  }
  cachedOnboardingAttachments = attachments;
  return attachments;
}

/** Service Charter only (registration welcome email). */
export function loadServiceCharterAttachment(
  logger?: Logger
): EmailAttachment[] {
  if (cachedServiceCharter) return cachedServiceCharter;
  const assetsDir = resolveOnboardingAssetsDir();
  const loaded = loadAttachmentFile(
    assetsDir,
    SERVICE_CHARTER_ASSET.filename,
    SERVICE_CHARTER_ASSET.type,
    SERVICE_CHARTER_ASSET.downloadName,
    logger
  );
  cachedServiceCharter = loaded ? [loaded] : [];
  return cachedServiceCharter;
}
