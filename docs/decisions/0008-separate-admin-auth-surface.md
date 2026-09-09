# ADR 0008: Admin authentication as a separate surface

- **ID:** D-08
- **Status:** Accepted

## Context

V4 treats platform admin authentication as distinct from organisation-user authentication. V5 must not collapse those concerns accidentally.

## Decision

Admin authentication is a **separate security surface**. Do **not** implement the final admin authentication mechanism now.

## Consequences

- Organisation-user AuthN/AuthZ ports/stub must not be assumed sufficient for admin APIs.
- Final admin auth design/implementation waits for a dedicated task.
- Product admin features depending on final admin auth remain out of early bootstrap scope.
