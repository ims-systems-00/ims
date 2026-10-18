/**
 * Auth0 /userinfo helper — access tokens often omit `email` (it lives on id_token).
 * Used during JIT provisioning when the access token has no email claim.
 */

export type Auth0UserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  nickname?: string;
};

export async function fetchAuth0UserInfo(options: {
  domain: string;
  accessToken: string;
  fetchFn?: typeof fetch;
}): Promise<Auth0UserInfo | null> {
  const domain = options.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!domain || !options.accessToken) return null;

  const fetchFn = options.fetchFn ?? fetch;
  try {
    const response = await fetchFn(`https://${domain}/userinfo`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${options.accessToken}`,
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as Auth0UserInfo;
  } catch {
    return null;
  }
}
