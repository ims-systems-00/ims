import pino, { type Logger, type LoggerOptions } from "pino";

const REDACT_PATHS = [
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "headers.authorization",
  "headers.cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "body.password",
  "body.token",
];

export type CreateLoggerOptions = {
  level: LoggerOptions["level"];
  name?: string;
};

export function createLogger(options: CreateLoggerOptions): Logger {
  return pino({
    name: options.name ?? "ims-systems-v5-backend",
    level: options.level ?? "info",
    redact: {
      paths: REDACT_PATHS,
      censor: "[Redacted]",
    },
  });
}

export type { Logger };
