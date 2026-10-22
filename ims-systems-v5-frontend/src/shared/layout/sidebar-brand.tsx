import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type SidebarBrandProps = {
  /** Resolved organisation logo URL (fresh view URL or stored src). */
  logoUrl?: string | null;
  organisationName?: string | null;
  onNavigate?: () => void;
};

/**
 * Sidebar header branding. When the current organisation has uploaded
 * a logo, only that logo is shown (no name / "Platform V5" text).
 * Otherwise — or if the logo fails to load — it falls back to the
 * default iMS Systems mark.
 */
export function SidebarBrand({
  logoUrl,
  organisationName,
  onNavigate,
}: SidebarBrandProps) {
  const [logoBroken, setLogoBroken] = useState(false);

  useEffect(() => {
    setLogoBroken(false);
  }, [logoUrl]);

  const showOrgLogo = Boolean(logoUrl) && !logoBroken;
  const orgName = organisationName?.trim() || "Organisation";

  return (
    <Link
      to="/"
      className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
      onClick={onNavigate}
      aria-label={showOrgLogo ? `${orgName} — home` : "IMS Systems — home"}
    >
      {showOrgLogo ? (
        <img
          src={logoUrl!}
          alt={`${orgName} logo`}
          className="h-10 w-auto max-w-48 shrink-0 rounded-sm object-contain"
          onError={() => setLogoBroken(true)}
        />
      ) : (
        <>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary text-[0.625rem] font-semibold tracking-wide text-sidebar">
            iMS
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.8125rem] font-semibold tracking-[-0.01em]">
              IMS Systems
            </span>
            <span className="block truncate text-[0.6875rem] text-sidebar-muted">
              Platform V5
            </span>
          </span>
        </>
      )}
    </Link>
  );
}
