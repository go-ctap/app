## Why

The first workbench implementation proves the backend integration, but real screenshots show UI bugs, awkward layouts, and unnecessary re-authentication caused by opening a fresh `ctapkit` session for every operation. This change turns the prototype into a smoother daily-use tool: visually tighter, capability-aware, keyboard-friendly, and respectful of authenticator session cache.

## What Changes

- Fix visible layout bugs in overview capability cards, credential lists, large-blob lists, configuration panels, and JSON viewers.
- Refine the visual language without adding dark theme support in this change.
- Redesign the WebAuthn lab as a guided two-step workflow: step one `makeCredential`, step two `getAssertion`, with a stronger composition around inputs, generated artifacts, previews, and results.
- Make configuration UI adaptive to the selected token: hide or collapse biometric management when the token does not support biometrics, and replace crude text such as `State: configured` with polished status components.
- Improve resident credential and large-blob list readability by preventing long IDs from destroying layout, using scannable rows, better metadata hierarchy, and stable action placement.
- Replace session-per-operation behavior with a persistent selected-token session that preserves `ctapkit` session cache across commands until token change, disconnect, reset, explicit lock/close, or application shutdown.
- Keep all safety semantics: prompts, confirmations, cancellation, dry-run previews, PIN/UV/touch interactions, and destructive warnings still come from backend/session workflows.
- Add keyboard UX for common forms and dialogs, including Enter-to-submit, Escape-to-cancel/close where safe, focus management, and clear default actions.

## Capabilities

### New Capabilities
- `workbench-visual-refinement`: Polished light-theme UI, fixed layout bugs, responsive/scannable tables, status components, and capability-aware configuration presentation.
- `guided-webauthn-lab`: A guided makeCredential-to-getAssertion lab experience with step layout, generated artifacts, and clean result presentation.
- `persistent-session-lifecycle`: Reuse the selected authenticator session across operations while preserving cache and safely handling token changes, cancellation, disconnects, and explicit session close.
- `keyboard-interaction-ux`: Keyboard-first form/dialog behavior for PIN prompts, confirmations, lab forms, edit dialogs, and destructive previews.

### Modified Capabilities

None.

## Impact

- `auth_service.go` will need a selected-token session manager instead of opening/closing a `ctapkit.Session` for every operation.
- Frontend stores and API wrappers will need session status, lock/close actions, and better operation defaults.
- `frontend/src/app.css` and Svelte screens will need substantial layout refinement, especially `Overview.svelte`, `Credentials.svelte`, `LargeBlobs.svelte`, `Config.svelte`, `Lab.svelte`, and interaction/dialog components.
- Tests should cover persistent session reuse, session invalidation, keyboard submission handlers, and UI state gating for unsupported token capabilities.
