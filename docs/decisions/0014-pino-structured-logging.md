# ADR 0014: Pino structured logging with correlation IDs

- **ID:** D-14
- **Status:** Accepted

## Context

Debugging and operations require correlatable logs without leaking sensitive data.

## Decision

Use **structured application logging** with request/correlation IDs. **Pino** is the preferred logging implementation. Never log secrets, tokens, credentials, or sensitive payloads.

## Consequences

- Logging adapters should standardize on Pino (or a thin wrapper around it).
- Request handling should propagate a correlation/request id into logs.
- Log redaction of sensitive fields is mandatory.
