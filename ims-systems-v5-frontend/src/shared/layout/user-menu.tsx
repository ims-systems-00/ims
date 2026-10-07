import { Link } from "react-router-dom";
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
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { DEV_STUB_IDENTITY, resolveProfileUserId } from "@/security";

/**
 * Navbar account menu — profile / organisation now; password & logout deferred.
 */
export function UserMenu() {
  const profileUserId = resolveProfileUserId(DEV_STUB_IDENTITY);
  const userQuery = useUserQuery(profileUserId);
  const user = userQuery.data?.user;
  const displayName = user?.name ?? "Dev user";
  const displayEmail = user?.email ?? DEV_STUB_IDENTITY.email ?? "Session";

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
            imageUrl={user?.profileImage?.url}
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
              imageUrl={user?.profileImage?.url}
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
        <DropdownMenuItem disabled title="Coming soon">
          <KeyRound />
          Change Password
        </DropdownMenuItem>
        <DropdownMenuItem disabled title="Coming soon">
          <LogOut />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
