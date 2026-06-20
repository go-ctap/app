# AGENTS.md

## Mission
- `fidoapp` is a Wails 3 desktop workbench for local FIDO2/CTAP authenticators.
- The Go app is a product boundary over `github.com/go-ctap/kit`, replaced locally by `../ctapkit`.
- Keep reusable authenticator, CTAP, device, transport, interaction, token, and session semantics in `ctapkit`.
- Keep product UX, Wails wiring, app state, screens, status/log presentation, and app-specific envelopes in this repo.
- The project is greenfield. Prefer clean architecture over preserving early shapes.

## Hard Rules
- Never log, store, dump, or render PINs, `pinUvAuthToken`, reset confirmations, or other secrets.
- Treat generated Wails bindings and `ctapkit/service` DTOs as first-party contracts. Do not add defensive optional chaining, fallback object construction, or "unknown JSON" normalization around fields that are required by those Go types; open `../ctapkit` and the generated bindings when in doubt.
- Startup discovery may automatically select and open a session only when exactly one authenticator is discovered. When multiple authenticators are discovered, wait for an explicit device selection.
- The selected device is the session boundary: changing selection must close any existing open session, resolve/cancel pending interactions, clear per-device screen state, and open one session for the newly selected device. The app should not expose manual session management controls.
- Clearing selection or app shutdown must close open sessions and resolve/cancel pending interactions.
- Close/cancel paths must release sessions and resolve pending interactions without holding service locks while closing handles.
- Mutating or destructive authenticator actions need preview/confirmation semantics matching `ctapkit`.
- Do not hand-edit `frontend/bindings/` unless intentionally updating generated Wails artifacts.

## Frontend
- Tailwind is rejected as a frontend foundation. Do not add new Tailwind utilities, config, plugins, abstractions, or Tailwind-dependent patterns.
- `shadcn-svelte` is not the design system. Do not build new screens shadcn-first, and do not install new shadcn components except as a temporary migration bridge.
- Existing Tailwind/shadcn code is technical debt, not precedent. Remove it when touching affected UI in a meaningful way.
- Build UI with Svelte components, vanilla CSS, CSS custom properties, and product-specific component boundaries.
- Frontend CSS must follow CUBE CSS strictly: CSS/global rules first, then Composition, Utility, Block, and Exception.
- `data-*` attributes are the required CUBE Exception mechanism for real state/variant deviations. They are not an escape hatch from CUBE.
- Do not introduce BEM-style modifier classes, Tailwind-like utility piles, ad hoc scoped styling, or component variants that bypass the CUBE layers.
- Use Bits UI directly for complex accessible behavior: dialogs, menus, popovers, selects, tabs, tooltips, focus-managed interactions.
- Screens compose product/workbench components. Product components compose small UI components. UI components may wrap Bits UI.
- Keep state in stores/controllers under `frontend/src/lib/`; screens should not call raw generated bindings directly.

## Local Map
- Backend entrypoint: `main.go`; Wails service: `auth_service.go`.
- Frontend shell: `frontend/src/App.svelte`.
- Screens: `frontend/src/screens/`; reusable components: `frontend/src/components/`; app stores/controllers: `frontend/src/lib/`.
- OpenSpec files under `openspec/` are history and requirements, not architectural handcuffs.

## Verify
- Backend: `go test ./... -count=1`.
- Session, locking, interaction, or cancellation changes: also consider `go test -race ./... -count=1`.
- Frontend: `cd frontend; npm run build`.
- UI smoke tests must use the real Wails window. Wails 3 dev runtime is not reliable through browser automation; ask the user to run `wails3 dev` or `task dev`.
