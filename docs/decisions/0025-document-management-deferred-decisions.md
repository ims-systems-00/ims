# ADR 0025: Document Management deferred-item decisions

- **ID:** D-25
- **Status:** Accepted
- **Context spec:** `docs/module-specifications/document-management.md` §9/§10

## Context

The Document Management deferred plan required deliberate decisions on the
V4 "checks" endpoints, Bull-queue hard deletes, the signature `Reviewed`
status, Office-document signature placement, WebSocket signature pushes, and
the Stats digital-maturity consumer. This ADR records those decisions so the
absent endpoints are a choice, not an omission.

## Decisions

1. **`checks/pending-node` — dropped (endpoint), behaviour kept.**
   V5 enforces the same rule server-side: adding a new version is rejected
   while a pending version exists in the family. A separate pre-flight
   endpoint would duplicate that guard, so no endpoint is ported.

2. **`checks/document-ownership` and `checks/process-requirements` — dropped.**
   The spec itself flags the V4 implementations as known-fragile
   (§9 discrepancies). Porting them blindly would import unreliable
   ownership/process semantics. V5 instead enforces ownership and
   authorisation directly in the service layer (repository privacy,
   authorisation decide flows, OpenFGA `document-management` permissions).
   If a future UI needs a pre-flight, it must be designed against the V5
   service rules, not the V4 endpoints.

3. **Async (BullMQ) hard-delete queues — deferred, synchronous deletes kept.**
   V4 queued permanent node/repository deletes to remove File Handler
   storage off-request. V5 hard deletes are synchronous with per-file
   storage cleanup and continue-on-error semantics, which is acceptable at
   current volumes. Revisit only if delete latency or storage-cleanup
   failures become operationally visible; the port boundary
   (`DocumentFilesPort.deleteStoredFile`) is where a queue would slot in.
   Signature invite/resend email is sent inline through the existing
   transactional email system (which itself queues via BullMQ), so no
   additional DM-specific queue was built.

4. **Signature `Reviewed` status — retained in the model, not user-facing.**
   The status enum keeps `Pending | Reviewed | Signed` for V4 data parity,
   but no V5 UI action sets `Reviewed`; lists simply render it if present.
   `conformance` is `floor(signed/total * 100)` over all invite records for
   the document, `-1` (hidden) when there are none.

5. **Signature placement — PDF first-class; Office docs blocked explicitly.**
   Placement coordinates are stored per invite and stamped with `pdf-lib`
   at sign time. Non-PDF documents fail signing with a clear validation
   error instead of silently skipping placement. Office placement depends
   on the File Handler's deferred LibreOffice converter; when that lands,
   placement can reuse the converted PDF.

6. **WebSocket `new-document-signature-info` push — not implemented.**
   V5 has no socket push wired for this module yet; internal invitees get
   an in-app notification plus email. Adding the socket event is a
   follow-up once module socket infrastructure exists.

7. **Stats digital-maturity consumes DM (implemented).**
   The Stats spec lists Document Management as one of seven maturity areas,
   so `GET /stats/digital-maturity` now reads DM via
   `DocumentManagementApplicationPort.getDocumentUtilisation`: a business
   unit counts as using DM when a repository is scoped to it or the org
   has published documents (org-wide repositories serve every BU).

## Consequences

- No `…/checks/…` routes exist under Document Management; clients must rely
  on the real mutation endpoints' errors.
- Cross-org folder copy is Super-Admin-only (membership verified in both
  organisations via `DocumentMembershipPort`); folders only, never files.
- IMS Project work-package ↔ document linking stays blocked until an IMS
  Projects module exists in V5.
