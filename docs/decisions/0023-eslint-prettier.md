# ADR 0023: ESLint and Prettier

- **ID:** D-23
- **Status:** Accepted

## Context

V5 backend and frontend need consistent linting and formatting to keep review noise low and AI-generated code aligned.

## Decision

Use **ESLint** for linting and **Prettier** for formatting. Formatting and linting rules should be **centralized and consistent** across V5 applications.

## Consequences

- Shared or mirrored ESLint/Prettier config should cover V5 packages.
- Formatting-only churn in PRs should be avoided by running format locally/CI once tooling is wired.
- Exact rule sets are configuration detail under this baseline, not separate ADRs unless policy changes materially.
