## Context

`fidoapp` is a Wails 3 desktop application with a generated vanilla frontend. The backend stack for CTAP/FIDO2 already exists in sibling modules, especially `../ctapkit`, whose public facade exposes device discovery, session opening, event sinks, interaction handlers, and typed operations for inspection, credential management, large blobs, configuration, and WebAuthn testing.

The application must become a polished operator-facing desktop workbench. It needs to explain authenticator capabilities clearly, but it must not duplicate CTAP business logic or weaken `ctapkit` safety rules. Svelte is the chosen frontend framework.

## Goals / Non-Goals

**Goals:**

- Build a Svelte Wails frontend with a persistent top-bar token selector and task-oriented screens.
- Add Go Wails services that translate UI requests into `ctapkit` operations and return JSON-safe DTOs.
- Preserve `ctapkit` dry-run, confirmation, PIN, UV, touch, progress, and error semantics in the UI.
- Provide strong defaults and validation for WebAuthn lab inputs while allowing manual expert edits.
- Keep frontend state predictable: selected token, current screen, operation status, pending interaction, and last result/error.

**Non-Goals:**

- Reimplement CTAP/HID/WebAuthn protocol logic in the frontend.
- Add cloud sync, remote token access, MDS trust-chain presentation, or release packaging changes.
- Archive or redesign `ctapkit`; this change consumes its public facade.
- Build a browser WebAuthn relying-party flow. The lab runs through `ctapkit` operations.

## Decisions

### Use Wails Services as the Only Frontend Backend Boundary

The frontend will call typed Wails bindings instead of importing protocol libraries or shelling out to CLIs. A primary `AuthenticatorService` will expose discovery, selection, inspection, credentials, large blobs, configuration, and lab methods. A smaller interaction bridge will emit operation events and block Go operations while the frontend answers prompts.

Alternative considered: invoke an existing CLI from Wails. This would reuse command behavior, but it would make prompts, progress, cancellation, and typed previews harder to model in a desktop app.

### Keep a Session-per-Operation Default

Each mutating or inspecting request will discover/select/open a session, run one operation, and close it. The service can cache the selected device report and last discovery snapshot, but it should not keep long-lived authenticator handles open across normal screen navigation.

Alternative considered: keep a persistent opened session for the selected token. That could reduce overhead, but CTAP operations are user-mediated and safety-sensitive; short sessions fit `ctapkit`'s public flow and reduce stale-handle problems when tokens are unplugged.

### Model Interactions as Modal Application State

`ctapkit` `InteractionRequest` values will be forwarded to the frontend as Wails events. The UI will show one blocking prompt at a time for PIN, UV, touch, or confirmation. The frontend response will resolve the backend handler. Secret PIN values must only travel from the prompt to the pending interaction response and must not be persisted in stores, logs, or operation results.

Alternative considered: expose PIN fields directly on every form. Centralizing prompts keeps sensitive input handling consistent and matches operations that ask for PIN only when needed.

### Use Dry-Run Previews Before Destructive or Mutating Actions

Credential deletion/update, large-blob write/delete, PIN/config changes, biometric mutations, factory reset, and makeCredential will first run or display the `ctapkit` preview mode where supported, then require explicit confirmation before execution. Confirmation text and warnings from `ctapkit` must be shown in the operation dialog.

Alternative considered: submit directly after a browser confirm. This would hide `ctapkit`'s richer safety previews and make destructive flows harder to test.

### Svelte App Structure

The frontend will be organized around route-like views without adding a router dependency unless implementation proves it useful:

- `App.svelte`: shell, top bar, selected token state, global operation overlay.
- `lib/api`: Wails binding wrappers and normalization helpers.
- `lib/stores`: devices, selection, operation status, pending interaction, toast/error state.
- `screens/Home.svelte`: beginner-friendly capability explanation plus technical inspection panels.
- `screens/Credentials.svelte`: RP-grouped resident credential table and edit/delete dialogs.
- `screens/LargeBlobs.svelte`: credential-linked blob list, read/write/delete editor.
- `screens/Config.svelte`: PIN, UV, min PIN, biometrics, reset sections gated by support state.
- `screens/Lab.svelte`: makeCredential/getAssertion forms and result viewers.

SvelteKit is not required for the desktop shell; Vite plus Svelte is enough.

### Result and Error DTOs Stay Close to `ctapkit`

The Go service should return structured outputs matching `ctapkit/model` JSON tags wherever possible, with thin envelope metadata such as `operationId`, `selectedDevice`, or `previewRequired`. Normalized runtime errors should include category, message, and optional actionable hint.

Alternative considered: convert every result to bespoke frontend DTOs. That would add translation work and risk losing useful domain fields already designed in `ctapkit`.

## Risks / Trade-offs

- CTAP interactions can block while the UI waits for PIN, touch, UV, or confirmation -> Use operation IDs, a single pending interaction store, cancellation, timeouts where appropriate, and clear progress messages from `model.OperationEvent`.
- Tokens may be unplugged or change between discovery and execution -> Refresh before operations, use `SelectDevice` against the latest snapshot, and surface invalid-state errors with a refresh action.
- Wails generated bindings may expose Go method shapes awkwardly for Svelte -> Add a small frontend API wrapper rather than scattering binding details through components.
- Some authenticators only support preview-only or partial capabilities -> Gate actions from `ctapkit` support/status reports and explain unsupported states on the relevant screen.
- Factory reset has timing constraints after power-up -> Make reset a guided flow with warning, reconnect instructions, dry-run preview, explicit confirmation, and a narrow execution path.
- PIN is sensitive -> Do not store it in Svelte persistent stores, browser storage, operation history, console logs, or returned DTOs.

## Migration Plan

1. Add `github.com/go-ctap/kit` to the Wails app module, using a local `replace` to `../ctapkit` during development.
2. Replace the starter frontend with a Svelte Vite setup while keeping the Wails runtime plugin and generated bindings output.
3. Add backend services and event/interaction plumbing behind generated Wails bindings.
4. Implement screens incrementally, starting with discovery/selection and inspection, then credential and large-blob workflows, then configuration, then the WebAuthn lab.
5. Verify with frontend build, Go tests, and manual Wails dev smoke tests with no token, one token, and multiple-token states.

Rollback is straightforward during development: revert the Wails service/frontend changes and keep `ctapkit` untouched.

## Open Questions

- Should strict credential-management permissions be enabled by default through `ctapkit.WithStrictPermissions`, or exposed as an advanced app setting?
- Which transport mode controls should be visible in the first UI: automatic only, or automatic/HID/windows-proxy selector?
- Should lab presets include generated `clientDataJSON` templates for common RP/user examples, or require the user to provide raw bytes from the start?
