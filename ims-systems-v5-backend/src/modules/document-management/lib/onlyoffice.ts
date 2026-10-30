/**
 * OnlyOffice Document Server helpers for Document Management in-preview edit.
 */

import { SignJWT, jwtVerify } from "jose";

export type OnlyOfficeDocumentType = "word" | "cell" | "slide" | "pdf";

export type OnlyOfficeFileInfo = {
  extension: string;
  documentType: OnlyOfficeDocumentType;
  contentType: string;
};

/** Formats OnlyOffice can open for in-preview edit (Office + PDF). */
const EDITABLE_BY_EXT: Record<string, OnlyOfficeFileInfo> = {
  pdf: {
    extension: "pdf",
    documentType: "pdf",
    contentType: "application/pdf",
  },
  doc: {
    extension: "doc",
    documentType: "word",
    contentType: "application/msword",
  },
  docx: {
    extension: "docx",
    documentType: "word",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  odt: {
    extension: "odt",
    documentType: "word",
    contentType: "application/vnd.oasis.opendocument.text",
  },
  xls: {
    extension: "xls",
    documentType: "cell",
    contentType: "application/vnd.ms-excel",
  },
  xlsx: {
    extension: "xlsx",
    documentType: "cell",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  csv: {
    extension: "csv",
    documentType: "cell",
    contentType: "text/csv",
  },
  ppt: {
    extension: "ppt",
    documentType: "slide",
    contentType: "application/vnd.ms-powerpoint",
  },
  pptx: {
    extension: "pptx",
    documentType: "slide",
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
};

export function getFileExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const idx = base.lastIndexOf(".");
  if (idx <= 0 || idx === base.length - 1) return "";
  return base.slice(idx + 1).toLowerCase();
}

export function resolveOnlyOfficeFileInfo(
  fileName: string
): OnlyOfficeFileInfo | null {
  const ext = getFileExtension(fileName);
  return EDITABLE_BY_EXT[ext] ?? null;
}

/** @deprecated Prefer resolveOnlyOfficeFileInfo */
export function resolveOfficeFileInfo(
  fileName: string
): OnlyOfficeFileInfo | null {
  return resolveOnlyOfficeFileInfo(fileName);
}

export function isOnlyOfficeEditableFileName(fileName: string): boolean {
  return resolveOnlyOfficeFileInfo(fileName) !== null;
}

/** @deprecated Prefer isOnlyOfficeEditableFileName */
export function isOfficeEditableFileName(fileName: string): boolean {
  return isOnlyOfficeEditableFileName(fileName);
}

export type OnlyOfficeRuntimeConfig = {
  enabled: boolean;
  publicUrl: string;
  jwtSecret: string;
  callbackBaseUrl: string;
};

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

/**
 * Rewrite a browser-facing file URL so OnlyOffice Document Server (often in
 * Docker) can fetch it. Only rewrites loopback hosts (localhost / 127.0.0.1)
 * to the origin of callbackBaseUrl (e.g. http://host.docker.internal:3001),
 * keeping path + query intact.
 *
 * Without this, local signed URLs like http://127.0.0.1:3001/... resolve to
 * the OO container itself and return Forbidden.
 */
export function rewriteUrlForOnlyOfficeFetch(
  fileUrl: string,
  callbackBaseUrl: string
): string {
  const callback = callbackBaseUrl.trim();
  if (!callback || !fileUrl || fileUrl.startsWith("memory://")) {
    return fileUrl;
  }
  try {
    const file = new URL(fileUrl);
    if (!LOOPBACK_HOSTS.has(file.hostname.toLowerCase())) {
      return fileUrl;
    }
    const base = new URL(
      callback.includes("://") ? callback : `http://${callback}`
    );
    // callbackBaseUrl is typically .../api/v1 — use origin only.
    file.protocol = base.protocol;
    file.hostname = base.hostname;
    file.port = base.port;
    return file.toString();
  } catch {
    return fileUrl;
  }
}

export type EditorSessionClaims = {
  organizationId: string;
  repositoryId: string;
  nodeId: string;
  userId: string;
  fileName: string;
  bucket: string;
};

export type OnlyOfficeEditorConfig = {
  documentType: OnlyOfficeDocumentType;
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
  };
  editorConfig: {
    mode: "edit";
    callbackUrl: string;
    user: { id: string; name: string };
    customization: { forcesave: boolean; autosave: boolean };
  };
  token: string;
};

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signOnlyOfficePayload(
  secret: string,
  payload: Record<string, unknown>,
  expiresIn = "12h"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey(secret));
}

export async function verifyOnlyOfficeToken(
  secret: string,
  token: string
): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(token, secretKey(secret), {
    algorithms: ["HS256"],
  });
  return payload as Record<string, unknown>;
}

export async function signEditorSessionToken(
  secret: string,
  claims: EditorSessionClaims
): Promise<string> {
  return signOnlyOfficePayload(secret, { ...claims, purpose: "ims-editor" });
}

export async function verifyEditorSessionToken(
  secret: string,
  token: string
): Promise<EditorSessionClaims> {
  const payload = await verifyOnlyOfficeToken(secret, token);
  if (payload.purpose !== "ims-editor") {
    throw new Error("Invalid editor session token purpose");
  }
  const organizationId = String(payload.organizationId ?? "");
  const repositoryId = String(payload.repositoryId ?? "");
  const nodeId = String(payload.nodeId ?? "");
  const userId = String(payload.userId ?? "");
  const fileName = String(payload.fileName ?? "");
  const bucket = String(payload.bucket ?? "");
  if (
    !organizationId ||
    !repositoryId ||
    !nodeId ||
    !userId ||
    !fileName ||
    !bucket
  ) {
    throw new Error("Incomplete editor session token");
  }
  return {
    organizationId,
    repositoryId,
    nodeId,
    userId,
    fileName,
    bucket,
  };
}

/** OnlyOffice save-ready statuses that should persist a new version. */
export const ONLYOFFICE_SAVE_STATUSES = new Set([2, 6]);

export type OnlyOfficeCallbackBody = {
  key?: string;
  status?: number;
  url?: string;
  users?: string[];
  token?: string;
};
