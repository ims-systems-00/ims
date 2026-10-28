/**
 * Email brand context — default iMS Systems, or organisation-customised.
 */

export type EmailBrandColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryExtraLight: string;
};

/** Persisted on Organisation when Customise Email is saved. */
export type OrganisationEmailBrandingSettings = {
  /** When false/absent, transactional mail uses iMS defaults. */
  enabled: boolean;
  /** UI theme preset id, or "custom". */
  themeId: string | null;
  colors: EmailBrandColors | null;
};

export type EmailBranding = {
  brandName: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryExtraLight: string;
  /** Absolute HTTPS URL preferred for inbox clients. */
  logoUrl: string | null;
  footerNote: string;
};

export const DEFAULT_IMS_BRAND_COLORS: EmailBrandColors = {
  primary: "#0040A3",
  primaryDark: "#002D72",
  primaryLight: "#CCD9ED",
  primaryExtraLight: "#F2F5FA",
};

export const DEFAULT_IMS_EMAIL_BRANDING: EmailBranding = {
  brandName: "iMS Systems",
  ...DEFAULT_IMS_BRAND_COLORS,
  logoUrl: null,
  footerNote:
    "iMS Systems — this message was sent automatically. Please do not reply unless instructed.",
};

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!HEX_RE.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

function readColorField(
  input: Record<string, unknown>,
  key: keyof EmailBrandColors
): string | undefined {
  const value = input[key];
  return typeof value === "string" ? value : undefined;
}

/** Accept plain objects or mongoose subdocuments. */
export function coerceBrandColors(
  input: unknown
): Partial<EmailBrandColors> | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw =
    typeof (input as { toObject?: () => unknown }).toObject === "function"
      ? ((input as { toObject: () => unknown }).toObject() as Record<string, unknown>)
      : (input as Record<string, unknown>);
  return {
    primary: readColorField(raw, "primary"),
    primaryDark: readColorField(raw, "primaryDark"),
    primaryLight: readColorField(raw, "primaryLight"),
    primaryExtraLight: readColorField(raw, "primaryExtraLight"),
  };
}

export function normalizeBrandColors(
  input: Partial<EmailBrandColors> | null | undefined,
  fallback: EmailBrandColors = DEFAULT_IMS_BRAND_COLORS
): EmailBrandColors {
  return {
    primary: normalizeHexColor(input?.primary) ?? fallback.primary,
    primaryDark: normalizeHexColor(input?.primaryDark) ?? fallback.primaryDark,
    primaryLight: normalizeHexColor(input?.primaryLight) ?? fallback.primaryLight,
    primaryExtraLight:
      normalizeHexColor(input?.primaryExtraLight) ?? fallback.primaryExtraLight,
  };
}

export function normalizeOrganisationEmailBranding(
  input: Partial<OrganisationEmailBrandingSettings> | null | undefined
): OrganisationEmailBrandingSettings {
  if (!input) {
    return { enabled: false, themeId: null, colors: null };
  }
  const enabled = input.enabled === true;
  if (!enabled) {
    return { enabled: false, themeId: null, colors: null };
  }
  return {
    enabled: true,
    themeId: input.themeId?.trim() ? input.themeId.trim() : "custom",
    colors: normalizeBrandColors(coerceBrandColors(input.colors)),
  };
}

/**
 * Resolve render-time branding from an organisation record.
 * Disabled / missing settings → iMS Systems defaults.
 * When enabled, org name + logo + saved colours are used (Customise email).
 */
export function resolveOrganisationEmailBranding(org: {
  name: string;
  logoSrc?: string | null;
  emailBranding?: OrganisationEmailBrandingSettings | null;
}): EmailBranding {
  const settings = normalizeOrganisationEmailBranding(org.emailBranding);
  if (!settings.enabled || !settings.colors) {
    return DEFAULT_IMS_EMAIL_BRANDING;
  }
  const name = org.name.trim() || "Organisation";
  const logoUrl = org.logoSrc?.trim() ? org.logoSrc.trim() : null;
  return {
    brandName: name,
    ...settings.colors,
    logoUrl,
    footerNote: `${name} — this message was sent via iMS Systems. Please do not reply unless instructed.`,
  };
}

/** Sync branding stack for nested layout/primitive calls during renderEmail. */
const brandingStack: EmailBranding[] = [];

export function pushEmailBranding(branding: EmailBranding): void {
  brandingStack.push(branding);
}

export function popEmailBranding(): void {
  brandingStack.pop();
}

export function getActiveEmailBranding(): EmailBranding {
  return brandingStack[brandingStack.length - 1] ?? DEFAULT_IMS_EMAIL_BRANDING;
}
