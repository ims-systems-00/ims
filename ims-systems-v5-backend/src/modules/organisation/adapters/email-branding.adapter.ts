/**
 * Resolves transactional-email branding for an organisation
 * (custom logo + theme when enabled; otherwise iMS defaults).
 *
 * When logoStorage is present, mints a fresh inline view URL so inbox
 * clients can load the image (stored logoSrc may be an expired signed URL).
 */

import {
  DEFAULT_IMS_EMAIL_BRANDING,
  resolveOrganisationEmailBranding,
  type EmailBranding,
} from "../../../infrastructure/email/templates";
import type { ObjectStoragePort } from "../../files/ports";
import { createOrganisationRepository } from "../repositories/organisation.repository";

/** Keep logo links valid for recipients who open mail days later. */
const EMAIL_LOGO_URL_TTL_SECONDS = 60 * 60 * 24 * 14;

export type EmailBrandingResolver = (
  organizationId: string
) => Promise<EmailBranding>;

export function createOrganisationEmailBrandingResolver(deps?: {
  files?: ObjectStoragePort;
}): EmailBrandingResolver {
  const organisations = createOrganisationRepository();
  const files = deps?.files;

  return async (organizationId: string) => {
    if (!organizationId) return DEFAULT_IMS_EMAIL_BRANDING;
    const org = await organisations.findById(organizationId);
    if (!org) return DEFAULT_IMS_EMAIL_BRANDING;

    let logoUrl = org.logoSrc?.trim() || null;
    if (files && org.logoStorage?.bucket && org.logoStorage.key) {
      try {
        logoUrl = await files.createViewUrl({
          bucket: org.logoStorage.bucket,
          key: org.logoStorage.key,
          expiresInSeconds: EMAIL_LOGO_URL_TTL_SECONDS,
          disposition: "inline",
          downloadFileName: org.logoStorage.fileName ?? "logo",
        });
      } catch {
        // Fall back to stored logoSrc when minting fails.
      }
    }

    return resolveOrganisationEmailBranding({
      name: org.name,
      logoSrc: logoUrl,
      emailBranding: org.emailBranding,
    });
  };
}
