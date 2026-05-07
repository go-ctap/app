## 1. Project Setup

- [x] 1.1 Add `github.com/go-ctap/kit` to `go.mod` with a local development `replace` to `../ctapkit`.
- [x] 1.2 Convert the frontend from vanilla Vite JavaScript to Svelte with TypeScript support.
- [x] 1.3 Keep the Wails Vite plugin and verify generated bindings still emit under `frontend/src/bindings` or the configured bindings path.
- [x] 1.4 Replace starter Wails demo files with an application shell, global styles, and Svelte entrypoint.

## 2. Backend Service Foundation

- [x] 2.1 Add an `AuthenticatorService` bound through Wails services.
- [x] 2.2 Implement discovery and selection helpers using `ctapkit.DiscoverDevices`, `SelectDevice`, and device reports.
- [x] 2.3 Implement a session-per-operation runner that opens the selected device, runs one typed `model.Operation`, and closes the session.
- [x] 2.4 Add operation envelopes with operation ID, selected device, result, error category, and user-facing error message.
- [x] 2.5 Add a Wails event sink that forwards `model.OperationEvent` updates to the frontend.
- [x] 2.6 Add an interaction handler bridge for PIN, UV, touch, and confirmation prompts.
- [x] 2.7 Add cancellation support for active operations.

## 3. Frontend State and Shell

- [x] 3.1 Create Svelte stores for discovered devices, active device, active screen, operation status, pending interaction, errors, and toasts.
- [x] 3.2 Build the top bar with refresh, active token selector, transport/status indicators, and disabled states.
- [x] 3.3 Build navigation for Overview, Resident Credentials, Large Blobs, Config, and WebAuthn Lab screens.
- [x] 3.4 Build global operation progress UI driven by backend events.
- [x] 3.5 Build reusable interaction modals for PIN, UV, touch, confirmation, and cancellation.
- [x] 3.6 Build reusable result, error, empty-state, copy, and JSON/hex viewer components.

## 4. Overview Screen

- [x] 4.1 Implement backend inspection method using `model.InspectOperation`.
- [x] 4.2 Load inspection data when the selected authenticator changes.
- [x] 4.3 Render beginner-friendly capability explanations for resident credentials, large blobs, PIN, UV, biometrics, authenticator config, and reset.
- [x] 4.4 Render an expandable technical details view for raw inspection report fields.
- [x] 4.5 Handle no-token, unsupported, loading, and error states.

## 5. Resident Credential Management

- [x] 5.1 Implement backend list credentials method using `model.ListCredentialsOperation`.
- [x] 5.2 Implement backend delete credential preview and confirmed execution using `model.DeleteCredentialOperation`.
- [x] 5.3 Implement backend update user preview and confirmed execution using `model.UpdateCredentialUserOperation`.
- [x] 5.4 Render RP-grouped credential inventory with support state and key credential metadata.
- [x] 5.5 Build credential delete and update dialogs that show previews, warnings, and confirmation state.
- [x] 5.6 Refresh inventory after successful credential mutations.

## 6. Large Blob Management

- [x] 6.1 Implement backend large-blob list, read, write preview/execute, and delete preview/execute methods.
- [x] 6.2 Render credential-linked large-blob list with blob state, byte count, support state, RP, and user data.
- [x] 6.3 Build large-blob read view with raw hex, byte count, decode status, and decoded content.
- [x] 6.4 Build create/replace editor that converts UI input to backend payload bytes.
- [x] 6.5 Build delete flow with backend preview, warnings, and explicit confirmation.
- [x] 6.6 Refresh large-blob state after successful mutations.

## 7. Token Configuration Management

- [x] 7.1 Implement backend config status method using `model.ConfigStatusOperation`.
- [x] 7.2 Implement PIN set/change preview and confirmed execution methods.
- [x] 7.3 Implement always-UV and minimum PIN length preview and confirmed execution methods.
- [x] 7.4 Implement biometric sensor, list, enroll, rename, and remove methods.
- [x] 7.5 Implement factory reset preview and confirmed execution method with reset hints.
- [x] 7.6 Render configuration sections gated by support/configured/preview-only state.
- [x] 7.7 Render biometric enrollment progress from backend events.
- [x] 7.8 Refresh configuration state after successful mutations.

## 8. WebAuthn Lab

- [x] 8.1 Implement backend makeCredential preview and confirmed execution methods.
- [x] 8.2 Implement backend getAssertion execution method.
- [x] 8.3 Build makeCredential form for RP, user, clientDataJSON, algorithms, exclude list, and authenticator options.
- [x] 8.4 Build getAssertion form for RP ID, clientDataJSON, allow list, and authenticator options.
- [x] 8.5 Add validation, sensible defaults, and normalized input preview for both lab forms.
- [x] 8.6 Render makeCredential preview, warnings, and result fields.
- [x] 8.7 Render all getAssertion result assertions and raw JSON/hex artifacts.

## 9. Verification

- [x] 9.1 Add focused Go tests for backend service request mapping, error envelopes, and interaction handler behavior.
- [x] 9.2 Add frontend component or store tests for selection, operation state, validation, and interaction modal flows if the project test stack is added.
- [x] 9.3 Run `go test ./...`.
- [x] 9.4 Run frontend build.
- [ ] 9.5 Run Wails dev smoke checks for no-token, one-token, and multiple-token discovery states.
- [ ] 9.6 Manually verify destructive flows use preview plus explicit confirmation before execution.
