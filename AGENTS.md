# AGENTS.md

## Project
- `fidoapp` is a Wails 3 desktop workbench for local FIDO2/CTAP authenticators.
- The Go backend is a thin application boundary over `github.com/go-ctap/kit`, replaced locally by `../ctapkit`.
- `ctapkit` owns device discovery, sessions, typed operations, DTOs, events, interactions, transport policy, token/session safety, and hardware semantics. Keep that logic there when it is reusable.
- This app owns product UX: Svelte screens, status/log presentation, Wails event wiring, session lifecycle affordances, and app-specific request/response envelopes.
- The project is still greenfield; change architecture, APIs, bindings, and flows when that produces a cleaner result.

## Code Map
- Backend entrypoint: `main.go`; Wails service and app orchestration: `auth_service.go`.
- Frontend app shell: `frontend/src/App.svelte`; controller/store boundary: `frontend/src/lib/`.
- Main screens live in `frontend/src/screens/`; reusable UI in `frontend/src/components/`.
- `frontend/bindings/` is generated Wails binding output. Do not hand-edit it unless you are deliberately updating generated artifacts.
- OpenSpec artifacts live under `openspec/`; use them for requirement history, not as a reason to preserve bad early shapes.

## Runtime Rules
- Prefer `ctapkit.DiscoverDevices`, `ctapkit.SelectDevice`, `ctapkit.OpenSession`, and `Session.Run` over direct CTAP/HID calls.
- Keep PINs, `pinUvAuthToken`, reset confirmations, and other secrets out of logs, stores, JSON dumps, and UI debug panels.
- Discovery/selection should not implicitly open sessions. Open sessions only for explicit session recovery or operations.
- Close/cancel paths must release sessions and resolve pending interactions without holding service locks while closing handles.
- Mutating or destructive authenticator actions need preview/confirmation semantics that match `ctapkit`.

## Frontend / Wails
- The frontend is expected to move to `shadcn-svelte` soon. Prefer changes that make that migration easier; do not over-invest in the current custom UI primitives.
- When working on Svelte or SvelteKit code, use the Svelte MCP server: start with `list-sections`, fetch relevant docs with `get-documentation`, and run `svelte-autofixer` on generated Svelte code until it reports no issues.
- Inspect frontend behavior through the full Wails dev runtime, not plain Vite preview.
- Run `wails3 dev` or `task dev` from the repo root, read the printed URL, and open that exact URL in the in-app browser.
- If Wails dev is already running, reuse its URL from terminal output/logs instead of starting another server.
- After frontend edits, reload the Wails page and inspect the DOM or screenshot again.
- Keep UI state in stores/controllers; screens should call the controller/API layer rather than raw generated bindings.

## Verification
- Backend changes: `go test ./... -count=1`.
- Session, locking, interaction, or cancellation changes: also consider `go test -race ./... -count=1`.
- Frontend changes: `cd frontend; npm run build`.
- Full app smoke check for UI work: run Wails dev and verify the actual screen in the in-app browser.
