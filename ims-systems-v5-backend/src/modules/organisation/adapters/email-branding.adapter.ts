/**
 * Resolves transactional-email branding for an organisation
 * (custom logo + theme when enabled; otherwise iMS defaults).
 *
 * When logoStorage is present, prefers a freshly signed view URL.
 * Local / unreachable hosts are inlined as data URIs so Mailtrap and
 * other sandboxes can still render the logo image.
 */

import {
  DEFAULT_IMS_EMAIL_BRANDING,
  resolveOrganisationEmailBranding,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import { getLocalObjectStorage } from "../../files/local-fallback-storage";
import type { ObjectStoragePort } from "../../files/ports";
import { createOrganisationRepository } from "../repositories/organisation.repository";

/** Keep logo links valid for recipients who open mail days later. */
const EMAIL_LOGO_URL_TTL_SECONDS = 60 * 60 * 24 * 14;

export type EmailBrandingResolver = (
  organizationId: string
) => Promise<EmailBranding>;

type ReadableObjectStorage = ObjectStoragePort & {
  readObject?: (input: { bucket: string; key: string }) => Promise<Buffer>;
};

function isPublicHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function guessImageMime(fileName?: string | null): string {
  const lower = (fileName ?? "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/png";
}

async function resolveLogoUrl(input: {
  files?: ReadableObjectStorage;
  logoSrc: string | null | undefined;
  logoStorage?: {
    bucket?: string | null;
    key?: string | null;
    fileName?: string | null;
  } | null;
}): Promise<string | null> {
  const stored = input.logoSrc?.trim() || null;
  const bucket = input.logoStorage?.bucket?.trim();
  const key = input.logoStorage?.key?.trim();
  const files = input.files;

  let signedUrl: string | null = null;
  if (files && bucket && key) {
    try {
      signedUrl = await files.createViewUrl({
        bucket,
        key,
        expiresInSeconds: EMAIL_LOGO_URL_TTL_SECONDS,
        disposition: "inline",
        downloadFileName: input.logoStorage?.fileName ?? "logo",
      });
    } catch {
      // Fall through to stored / inline paths.
    }
  }

  const candidate = signedUrl || stored;
  if (candidate && isPublicHttpUrl(candidate)) {
    return candidate;
  }

  // Local/dev signed URLs are not fetchable by Mailtrap. Inline the bytes.
  const local = files ? getLocalObjectStorage(files) : null;
  if (bucket && key && (files?.readObject || local)) {
    try {
      const bytes = files?.readObject
        ? await files.readObject({ bucket, key })
        : await local!.readObject({ bucket, key });
      const mime = guessImageMime(input.logoStorage?.fileName);
      return `data:${mime};base64,${bytes.toString("base64")}`;
    } catch {
      // Ignore and fall back.
    }
  }

  if (candidate?.startsWith("data:image/")) {
    return candidate;
  }

  return DEFAULT_IMS_EMAIL_BRANDING.logoUrl;
}

export function createOrganisationEmailBrandingResolver(deps?: {
  files?: ObjectStoragePort;
}): EmailBrandingResolver {
  const organisations = createOrganisationRepository();
  const files = deps?.files as ReadableObjectStorage | undefined;

  return async (organizationId) => {
    if (!organizationId) return DEFAULT_IMS_EMAIL_BRANDING;
    const org = await organisations.findById(organizationId);
    if (!org) return DEFAULT_IMS_EMAIL_BRANDING;

    const logoUrl = await resolveLogoUrl({
      files,
      logoSrc: org.logoSrc,
      logoStorage: org.logoStorage,
    });

    return resolveOrganisationEmailBranding({
      name: org.name,
      logoSrc: logoUrl,
      emailBranding: org.emailBranding,
    });
  };
}
