# AGENTS.md

## Mission
- `fidoapp` is a Wails 3 desktop workbench for local FIDO2/CTAP authenticators.
- The Go app is a product boundary over `github.com/go-ctap/kit`, replaced locally by `../ctapkit`.
- `ctapkit` is a runtime/toolkit for UI applications, not an abstract remote backend; generated Wails and `ctapkit` DTOs are UI-facing first-party model contracts.
- Keep reusable authenticator, CTAP, device, transport, interaction, token, and session semantics in `ctapkit`.
- Keep product UX, Wails wiring, app state, screens, status/log presentation, and app-specific envelopes in this repo.
- The project is greenfield. Prefer clean architecture over preserving early shapes.

## Hard Rules
- Never log, store, dump, or render PINs, `pinUvAuthToken`, reset confirmations, or other secrets.
- Treat generated Wails bindings and `ctapkit/service` DTOs as first-party contracts. Do not add defensive optional chaining, fallback object construction, or "unknown JSON" normalization around fields that are required by those Go types; open `../ctapkit` and the generated bindings when in doubt.
- Operation responses use typed generated envelopes from `ctapkit/service`. Screens must not call raw generated Wails service methods directly. Centralize operation envelope/result traversal in named typed extractors/controllers under `frontend/src/lib/`; after extraction, UI builders and components may accept generated DTO types directly. Do not add `resultOf()`, `objectValue()`, defensive `Partial<>`, or `Record<string, unknown>` normalization around required generated DTO fields. `MDSLookupEnvelope.result` is a typed `LookupResult`; use it directly.
- Startup discovery may automatically select and open a session only when exactly one authenticator is discovered. When multiple authenticators are discovered, wait for an explicit device selection.
- The selected device is the session boundary: changing selection must close any existing open session, resolve/cancel pending interactions, clear per-device screen state, and open one session for the newly selected device. The app should not expose manual session management controls.
- Clearing selection or app shutdown must close open sessions and resolve/cancel pending interactions.
- Close/cancel paths must release sessions and resolve pending interactions without holding service locks while closing handles.
- Mutating or destructive authenticator actions need preview/confirmation semantics matching `ctapkit`.
- Do not hand-edit `frontend/bindings/` unless intentionally updating generated Wails artifacts.

## Frontend
- Bindings are the model. Do not create local copies of `DeviceReport`, `LookupResult`, `AuthenticatorGetInfoResponse`, service envelopes, or other `ctapkit` model DTOs.
- Local frontend types are allowed only for genuine presentation shapes: rows, badges, modal props, sidebar/titlebar state, status/log display, and similar UI-only structures.
- View models are allowed only when they aggregate multiple UI states/stores or transform generated DTOs into a real presentation structure. Do not introduce `*Model`, `*ViewModel`, `*Info`, or `*Report` types that merely mirror generated DTOs, and do not add adapter/wrapper layers "just in case".
- `shadcn-svelte` is the preferred source for accessible UI primitives and locally owned component code.
- Inspect `frontend/components.json` before adding shadcn components. Add components through the `shadcn-svelte` CLI/registry, then customize the generated local files intentionally.
- The `lyra` shadcn style is the visual baseline. Product CSS should provide layout, density, Wails shell behavior, and domain state hooks, not a parallel custom design system.
- Tailwind is acceptable inside shadcn-generated UI primitives and small primitive wrappers. Product screens and workbench components should prefer shadcn primitives plus minimal CSS classes for layout and state.
- Frontend CSS must follow CUBE CSS strictly: CSS/global rules first, then Composition, Utility, Block, and Exception.
- `data-*` attributes are the required CUBE Exception mechanism for real state/variant deviations. They are not an escape hatch from CUBE.
- Do not introduce Tailwind-like utility piles, custom visual themes, or component variants that bypass Lyra/shadcn styling and the CUBE layers.
- Do not import `bits-ui` directly outside generated/local shadcn UI components under `frontend/src/lib/components/ui/`. App/product code should consume shadcn components instead.
- Screens compose product/workbench components. Product components compose small UI components and shadcn UI primitives.
- Keep state in stores/controllers under `frontend/src/lib/`; screens should not call raw generated bindings directly.

## Local Map
- Backend entrypoint: `main.go`; Wails service: `auth_service.go`.
- Frontend shell: `frontend/src/App.svelte`.
- Screens: `frontend/src/screens/`; reusable components: `frontend/src/components/`; app stores/controllers, typed extractors, and presentation builders: `frontend/src/lib/`. Do not use `frontend/src/lib/` for DTO mirrors.
- OpenSpec files under `openspec/` are history and requirements, not architectural handcuffs.

## Verify
- Backend: `go test ./... -count=1`.
- Session, locking, interaction, or cancellation changes: also consider `go test -race ./... -count=1`.
- Frontend: `cd frontend; pnpm run build`.
- UI smoke tests must use the real Wails window. Wails 3 dev runtime is not reliable through browser automation; ask the user to run `wails3 dev` or `task dev`.
