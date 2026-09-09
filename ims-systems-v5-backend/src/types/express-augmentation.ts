import type { Logger } from "../infrastructure/logging/logger";
import type { SecurityIdentity } from "../security/authenticator";
import type { SecurityPorts } from "../security/create-security";

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      log?: Logger;
      security?: SecurityPorts;
      identity?: SecurityIdentity | null;
    }
  }
}

export {};
