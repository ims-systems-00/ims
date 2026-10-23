/**
 * Compile V4-style `<= local.path =>` placeholders into plain text.
 */

function getDeepValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let value: unknown = obj;
  for (const key of keys) {
    if (value && typeof value === "object" && key in (value as object)) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return value;
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/**
 * Replace `<= local.foo.bar =>` tokens using the provided local bag.
 * Paths are evaluated relative to `{ local }`.
 */
export function compileTemplate(
  template: string,
  local: Record<string, unknown>
): string {
  const root = { local };
  return template.replace(/<=\s*([^=>]+?)\s*=>/g, (_match, rawPath: string) => {
    const path = String(rawPath).trim();
    return stringifyValue(getDeepValue(root, path));
  });
}

export function compileAnalyserTemplate(
  definition: {
    dataDisplay: string;
    context: string;
    reportStructure: Array<{
      name: string;
      description?: string | null;
      prompt: string;
      response?: string | null;
    }>;
  },
  local: Record<string, unknown>
) {
  return {
    dataDisplay: compileTemplate(definition.dataDisplay, local),
    context: compileTemplate(definition.context, local),
    reportStructure: definition.reportStructure.map((section) => ({
      name: section.name,
      description: section.description
        ? compileTemplate(section.description, local)
        : section.description ?? null,
      prompt: compileTemplate(section.prompt, local),
      response: section.response ?? "",
    })),
  };
}
