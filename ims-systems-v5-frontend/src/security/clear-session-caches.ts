import type { QueryClient } from "@tanstack/react-query";

/**
 * Drop all React Query data when the Auth0/BFF principal changes.
 * Logout clears tokens but left `/users/me` and org queries cached, so a
 * newly registered user could still see the previous account in the navbar
 * and inherit the previous org via stale `organisations/mine`.
 */
export function clearSessionCaches(queryClient: QueryClient): void {
  queryClient.clear();
}
