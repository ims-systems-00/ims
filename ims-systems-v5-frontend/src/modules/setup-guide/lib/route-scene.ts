/**
 * Route scenes — a guide step declares the exact app location it needs
 * (`/functional-units?create=1`). List pages keep their sheet state in the
 * URL, so restoring the location is what opens or closes the right sheet,
 * whichever direction the user arrives from.
 */

export type SceneLocation = { pathname: string; search: string };

const WILDCARD = "*";

type ParsedRoute = { path: string; params: Array<[string, string]> };

function normalisePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function parseRoute(route: string): ParsedRoute {
  const q = route.indexOf("?");
  const rawPath = q === -1 ? route : route.slice(0, q);
  const rawQuery = q === -1 ? "" : route.slice(q + 1);
  return {
    path: normalisePath(rawPath),
    params: [...new URLSearchParams(rawQuery).entries()],
  };
}

/** True when the app is already at the location the step asks for. */
export function sceneMatches(route: string, location: SceneLocation): boolean {
  const wanted = parseRoute(route);
  if (normalisePath(location.pathname) !== wanted.path) return false;

  const actual = new URLSearchParams(location.search);
  const actualKeys = [...new Set(actual.keys())];
  if (actualKeys.length !== wanted.params.length) return false;

  return wanted.params.every(([key, value]) => {
    const current = actual.get(key);
    if (current === null) return false;
    return value === WILDCARD ? current !== "" : current === value;
  });
}

/**
 * Where to navigate so the app matches the step, or `null` when it already
 * does. Wildcard parameters cannot be invented, so an unmet wildcard resolves
 * to the route without it — the step then reports its control as missing.
 */
export function sceneDestination(
  route: string,
  location: SceneLocation
): string | null {
  if (sceneMatches(route, location)) return null;

  const wanted = parseRoute(route);
  const query = new URLSearchParams(
    wanted.params.filter(([, value]) => value !== WILDCARD)
  ).toString();
  return query ? `${wanted.path}?${query}` : wanted.path;
}
