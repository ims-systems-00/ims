# Module Specifications

This folder holds **business / product Module Specifications** for the IMS system, plus the shared reference that defines how those documents must be written.

## Contents

| File | Purpose |
| ---- | ------- |
| [`MODULE_SPECIFICATION_REFERENCE.md`](./MODULE_SPECIFICATION_REFERENCE.md) | Canonical rules, section order, inspection guidance, writing standards, and blank template for every module specification |
| `<module-slug>.md` | One future specification file per business module (create only when tasked) |

## Conventions

- Follow **`MODULE_SPECIFICATION_REFERENCE.md`** for every new or updated module specification.
- Use lowercase kebab-case filenames (for example: `risk-management.md`).
- Document **current** business behavior only; do not invent features or propose redesigns in these files.
- Do not put API, database, or code-architecture documentation here.

Individual module specifications are **not** created as part of setting up this reference structure.
