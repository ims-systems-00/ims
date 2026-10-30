# ADR 0027: OnlyOffice in-preview document editing

- **ID:** D-27
- **Status:** Accepted
- **Context spec:** `docs/module-specifications/document-management.md`

## Context

Document Management preview was read-only (PDF iframe, Microsoft Office
Online view embed, plain-text). Controlled documents already version through
`addVersion` / revise-pending. Product needs in-preview editing of PDF and
Office files, with every save creating a new pending version rather than
overwriting the published file.

## Decision

1. **OnlyOffice Document Server** provides in-browser edit for:
   - PDF (`pdf`, `documentType: "pdf"`)
   - Word / Excel / PowerPoint (`doc`/`docx`/`xls`/`xlsx`/`ppt`/`pptx`, plus
     related extensions the server supports)
2. **Save model:** Editor callback stores the saved bytes via File Handler and
   calls existing `addVersion` (authoriser inheritance matches the “Add new
   version” sheet). No in-place overwrite of published files.
3. **Edit gate:** Only **Published** editable documents with no pending sibling
   (same guards as `addVersion`).
4. **Feature flag:** `ONLYOFFICE_ENABLED` + `VITE_ONLYOFFICE_URL`. When off,
   preview behaviour is unchanged (PDF iframe / Office Online view embed).

## Consequences

- Local/compose needs a Document Server container and callback/file URLs
  reachable from that container (`ONLYOFFICE_CALLBACK_BASE_URL`,
  `FILES_LOCAL_PUBLIC_BASE_URL`).
- Scanned/image-only PDFs open in the editor but text rewrite is limited to
  what OnlyOffice can extract; text and fillable PDFs are the strong case.
- Signature placement on Office still depends on deferred LibreOffice
  conversion; OnlyOffice does not replace that path.
- Empty authoriser lists still publish immediately via `addVersion` semantics;
  this ADR does not force authorisers on every edit.
