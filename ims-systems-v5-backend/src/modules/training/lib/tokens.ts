import { SignJWT, jwtVerify } from "jose";

const SELF_PURPOSE = "training-self";
const RSVP_PURPOSE = "training-rsvp";

export type TrainingSelfTokenClaims = {
  organizationId: string;
  personId: string;
};

export type TrainingRsvpTokenClaims = {
  organizationId: string;
  sessionId: string;
  personId: string;
};

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSelfToken(
  secret: string,
  claims: TrainingSelfTokenClaims,
  expiresInDays: number
): Promise<string> {
  return new SignJWT({
    ...claims,
    purpose: SELF_PURPOSE,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresInDays}d`)
    .sign(secretKey(secret));
}

export async function verifySelfToken(
  secret: string,
  token: string
): Promise<TrainingSelfTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret));
  if (payload.purpose !== SELF_PURPOSE) {
    throw new Error("Invalid self token purpose");
  }
  const organizationId = String(payload.organizationId ?? "");
  const personId = String(payload.personId ?? "");
  if (!organizationId || !personId) {
    throw new Error("Incomplete self token");
  }
  return { organizationId, personId };
}

export async function signRsvpToken(
  secret: string,
  claims: TrainingRsvpTokenClaims,
  expiresAt: Date
): Promise<string> {
  return new SignJWT({
    ...claims,
    purpose: RSVP_PURPOSE,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey(secret));
}

export async function verifyRsvpToken(
  secret: string,
  token: string
): Promise<TrainingRsvpTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret));
  if (payload.purpose !== RSVP_PURPOSE) {
    throw new Error("Invalid RSVP token purpose");
  }
  const organizationId = String(payload.organizationId ?? "");
  const sessionId = String(payload.sessionId ?? "");
  const personId = String(payload.personId ?? "");
  if (!organizationId || !sessionId || !personId) {
    throw new Error("Incomplete RSVP token");
  }
  return { organizationId, sessionId, personId };
}
