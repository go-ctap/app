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
- Build new frontend UI around `shadcn-svelte` components first, not around the current legacy visual design. Treat the app as greenfield when that produces a cleaner product surface.
- Keep custom styling minimal: prefer shadcn component composition plus Tailwind utilities in Svelte markup. Add CSS/component abstractions only for repeated product patterns that shadcn does not cover cleanly.
- Avoid spreading `clsx`/`tailwind-merge` into screen code. It is acceptable inside generated shadcn primitives and small shared helpers, but product layout should stay readable and Tailwind-first.
- When working on Svelte or SvelteKit code, use the Svelte MCP server: start with `list-sections`, fetch relevant docs with `get-documentation`, and run `svelte-autofixer` on generated Svelte code until it reports no issues.
- For `shadcn-svelte` work, treat `https://shadcn-svelte.com/llms.txt` as the official docs index.
- Before adding or changing a `shadcn-svelte` component, fetch only the relevant `.md` docs from that index.
- Prefer the `shadcn-svelte` CLI for component installation instead of hand-copying component trees.
- In this Wails/Vite app, run `shadcn-svelte` CLI commands from `frontend/` or pass `--cwd frontend`.
- Use Svelte MCP for Svelte syntax/autofix, and `shadcn-svelte` docs for component API, CLI, theming, and registry behavior.
- Inspect frontend behavior through the full Wails dev runtime, not plain Vite preview.
- Wails 3 dev runtime does not work correctly through the Codex in-app browser/browser automation. For UI work, run build checks locally, then ask the user to smoke-test the actual Wails window manually.
- If the user is smoke-testing, ask them to run `wails3 dev` or `task dev` from the repo root and verify the real desktop window rather than a browser URL.
- Keep UI state in stores/controllers; screens should call the controller/API layer rather than raw generated bindings.

## Verification
- Backend changes: `go test ./... -count=1`.
- Session, locking, interaction, or cancellation changes: also consider `go test -race ./... -count=1`.
- Frontend changes: `cd frontend; npm run build`.
- Full app smoke check for UI work: ask the user to run Wails dev and verify the actual desktop screen manually.
