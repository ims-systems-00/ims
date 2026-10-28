import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import imsDefaultLogo from "@/assets/images/iMS-OS_horizontal_white.png";

type SidebarBrandProps = {
  /** Resolved organisation logo URL (fresh view URL or stored src). */
  logoUrl?: string | null;
  organisationName?: string | null;
  onNavigate?: () => void;
};

/**
 * Sidebar header branding. When the current organisation has uploaded
 * a logo, that logo is shown here (the iMS-OS mark is rendered separately
 * under the Workspace nav label in AppSidebar). Otherwise — or if the
 * logo fails to load — it falls back to the default iMS-OS white mark.
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
        <img
          src={imsDefaultLogo}
          alt="iMS Systems"
          className="h-8 w-auto max-w-48 shrink-0 object-contain"
        />
      )}
    </Link>
  );
}
