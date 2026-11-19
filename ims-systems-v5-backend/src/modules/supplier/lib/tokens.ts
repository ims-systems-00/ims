import { SignJWT, jwtVerify } from "jose";

const UPLOAD_PURPOSE = "asl-upload";
const SHARE_PURPOSE = "asl-share";

export type AslUploadTokenClaims = {
  organizationId: string;
  supplierId: string;
  docId?: string;
};

export type AslShareTokenClaims = {
  organizationId: string;
};

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signUploadToken(
  secret: string,
  claims: AslUploadTokenClaims,
  expiresIn = "30d"
): Promise<string> {
  return new SignJWT({
    ...claims,
    purpose: UPLOAD_PURPOSE,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey(secret));
}

export async function verifyUploadToken(
  secret: string,
  token: string
): Promise<AslUploadTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret));
  if (payload.purpose !== UPLOAD_PURPOSE) {
    throw new Error("Invalid upload token purpose");
  }
  const organizationId = String(payload.organizationId ?? "");
  const supplierId = String(payload.supplierId ?? "");
  if (!organizationId || !supplierId) {
    throw new Error("Incomplete upload token");
  }
  return {
    organizationId,
    supplierId,
    docId: payload.docId ? String(payload.docId) : undefined,
  };
}

export async function signShareToken(
  secret: string,
  claims: AslShareTokenClaims,
  expiresAt: Date
): Promise<string> {
  return new SignJWT({
    ...claims,
    purpose: SHARE_PURPOSE,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey(secret));
}

export async function verifyShareToken(
  secret: string,
  token: string
): Promise<AslShareTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret));
  if (payload.purpose !== SHARE_PURPOSE) {
    throw new Error("Invalid share token purpose");
  }
  const organizationId = String(payload.organizationId ?? "");
  if (!organizationId) throw new Error("Incomplete share token");
  return { organizationId };
}
