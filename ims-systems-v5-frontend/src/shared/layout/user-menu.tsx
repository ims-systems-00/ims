import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  KeyRound,
  LogOut,
  UserRound,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { UserAvatar } from "@/modules/users/components/user-avatar";
import {
  useProfileImageUrl,
  useSessionUserQuery,
} from "@/modules/users/hooks/use-users";
import {
  DEV_STUB_IDENTITY,
  resolveProfileUserId,
  useAuthClient,
} from "@/security";
import { loadPublicEnv } from "@/shared/lib/env";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { notify } from "@/shared/lib/toast";

/**
 * Navbar account menu — profile / organisation / logout (Auth0 when enabled).
 */
export function UserMenu() {
  const authClient = useAuthClient();
  const navigate = useNavigate();
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordPending, setChangePasswordPending] = useState(false);

  async function handleLogout() {
    await authClient.logout();
    navigate("/login", { replace: true });
  }

  // F-06: reuse the Auth0 dbconnections change-password email flow
  // (same path as forgot-password). Not available in development-stub.
  async function handleChangePassword() {
    const email = user?.email;
    if (!email) return;
    setChangePasswordPending(true);
    try {
      await authClient.requestPasswordReset({ email });
      notify.success(`Password change link sent to ${email}`);
      setChangePasswordOpen(false);
    } catch (error) {
      notify.fromError(error, "Unable to start password change. Try again.");
    } finally {
      setChangePasswordPending(false);
    }
  }
  const stubProfileId =
    provider === "development-stub"
      ? resolveProfileUserId(DEV_STUB_IDENTITY)
      : undefined;
  const userQuery = useSessionUserQuery(stubProfileId);
  const user = userQuery.data?.user;
  const profileImageUrl = useProfileImageUrl(user);
  const displayName = user?.name ?? (provider === "auth0-openfga" ? "Signed in" : "Dev user");
  const displayEmail =
    user?.email ??
    (provider === "development-stub"
      ? (DEV_STUB_IDENTITY.email ?? "Session")
      : "Session");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-md"
          aria-label="Open account menu"
        >
          <UserAvatar
            name={displayName}
            imageUrl={profileImageUrl}
            size="sm"
            className="size-7 rounded-sm"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <div className="flex items-center gap-2.5 py-0.5">
            <UserAvatar
              name={displayName}
              imageUrl={profileImageUrl}
              size="sm"
            />
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-[0.6875rem] font-normal text-muted-foreground">
                {displayEmail}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserRound />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/organisation">
            <Building2 />
            My organisation
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={provider === "development-stub" || !user?.email}
          title={
            provider === "development-stub"
              ? "Password change requires Auth0 (VITE_SECURITY_PROVIDER=auth0-openfga)"
              : undefined
          }
          onSelect={(event) => {
            event.preventDefault();
            if (provider === "development-stub" || !user?.email) return;
            setChangePasswordOpen(true);
          }}
        >
          <KeyRound />
          Change Password
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={provider === "development-stub"}
          title={
            provider === "development-stub"
              ? "Logout requires Auth0 (VITE_SECURITY_PROVIDER=auth0-openfga)"
              : undefined
          }
          onSelect={(event) => {
            if (provider === "development-stub") {
              event.preventDefault();
              return;
            }
            void handleLogout();
          }}
        >
          <LogOut />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ConfirmDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        title="Change password"
        description={`We will email a secure password-change link to ${user?.email ?? "your email address"}. Your current password stays active until you complete the change.`}
        confirmLabel="Send link"
        destructive={false}
        pending={changePasswordPending}
        onConfirm={handleChangePassword}
      />
    </DropdownMenu>
  );
}
