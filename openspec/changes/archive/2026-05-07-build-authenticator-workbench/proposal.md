## Why

The project already has a Wails shell and a mature Go CTAP/FIDO2 runtime in `../ctapkit`, but the application still lacks a product UI for discovering, explaining, inspecting, and safely changing hardware authenticators. This change turns the existing backend stack into a usable desktop workbench for people who need to understand and test token capabilities without writing CTAP commands by hand.

## What Changes

- Replace the starter frontend with a Svelte-based Wails application.
- Add a token selector in the top bar backed by `ctapkit.DiscoverDevices`, `SelectDevice`, `OpenSession`, and typed `Session.Run` operations.
- Add a home screen that explains the selected authenticator's capabilities in simple, friendly language while still exposing full technical details.
- Add resident credential inventory, delete, and user metadata update workflows.
- Add large blob listing, reading, writing, deletion, previews, and confirmation flows.
- Add token configuration management for PIN, always-UV, minimum PIN length, biometric enrollments, and factory reset where supported by the token.
- Add a WebAuthn lab for hand-building `makeCredential` and `getAssertion` requests, including defaults, validation, previews, execution results, and raw hex/JSON views.
- Add shared UI patterns for progress events, PIN prompts, user-verification prompts, touch prompts, destructive confirmations, dry-run previews, errors, and cancellation.

## Capabilities

### New Capabilities
- `authenticator-selection`: Discover local authenticators, choose one active token, inspect session status, and refresh device lists.
- `authenticator-overview`: Explain the selected token's capabilities in beginner-friendly language and show the detailed CTAP/FIDO2 inspection data.
- `resident-credential-management`: List resident credentials, group them by relying party, delete credentials, and update credential user metadata.
- `large-blob-management`: List, read, create, replace, and delete large blobs associated with resident credentials.
- `token-configuration-management`: Show and mutate supported token configuration, including PIN, always-UV, minimum PIN length, biometrics, and reset.
- `webauthn-lab`: Build and run manual WebAuthn `makeCredential` and `getAssertion` operations against the selected token.

### Modified Capabilities

None.

## Impact

- `go.mod` will depend on `github.com/go-ctap/kit` through the existing local module workflow, likely with a `replace` to `../ctapkit` during development.
- The Wails service layer will add typed Go methods and event bridges for device discovery, selected-token operations, interaction prompts, and cancellation.
- `frontend/package.json`, Vite configuration, and frontend source files will move from vanilla JavaScript to Svelte.
- The frontend will consume Wails-generated bindings for backend services and `@wailsio/runtime` events.
- Safety-sensitive CTAP flows will surface `ctapkit` dry-run previews, confirmations, PIN collection, UV/touch prompts, progress stages, and normalized runtime errors.
