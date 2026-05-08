## 1. Frontend Toolchain Upgrade

- [x] 1.1 Upgrade `frontend/package.json` to Svelte 5-compatible `svelte`, `@sveltejs/vite-plugin-svelte`, TypeScript, and Vite dependencies that work with Wails 3.
- [x] 1.2 Run the Svelte 5 migration helper or make equivalent manual compatibility edits, then resolve compile errors without changing backend behavior.
- [x] 1.3 Update Svelte event/component syntax where needed for Svelte 5 compatibility, prioritizing shell and shared components first.
- [x] 1.4 Run `cd frontend; npm install` and confirm lockfile changes are intentional.
- [x] 1.5 Run `cd frontend; npm run build` to establish a Svelte 5 baseline before shadcn-svelte component migration.

## 2. Shadcn Svelte Infrastructure

- [x] 2.1 Add Tailwind v4 and shadcn-svelte dependencies using the npm-based CLI flow for the Vite/Svelte frontend.
- [x] 2.2 Configure `$lib` aliases in `frontend/tsconfig.json` and `frontend/vite.config.js` while preserving the Wails Vite plugin.
- [x] 2.3 Initialize `frontend/components.json` for current shadcn-svelte with aliases for `$lib`, `$lib/components`, `$lib/components/ui`, `$lib/utils`, and `$lib/hooks`.
- [x] 2.4 Create or update `frontend/src/lib/utils.ts` with the `cn` helper expected by shadcn-svelte.
- [x] 2.5 Replace the old global CSS foundation with Tailwind/shadcn semantic tokens in the app CSS entry imported by `frontend/src/main.ts`.
- [x] 2.6 Add the initial shadcn-svelte components required for shell, forms, dialogs, tabs, status, empty states, tables/lists, tooltips, progress, skeletons, and toasts.
- [x] 2.7 Read the generated component files and fix any alias, dependency, or Svelte 5 compatibility issues before using them.

## 3. Shared App UI Wrappers

- [x] 3.1 Rebuild buttons, status badges, empty states, copyable identifiers, metadata rows, JSON/raw detail views, and operation panels as thin wrappers around shadcn-svelte primitives.
- [x] 3.2 Rebuild `InteractionModal` with shadcn-svelte dialog/form primitives while preserving PIN secrecy, Enter submit, Escape cancel, and interaction response paths.
- [x] 3.3 Rebuild `WorkbenchStatusBar` with shadcn-svelte-compatible status, progress, action, recovery, and detail disclosure patterns.
- [x] 3.4 Remove obsolete custom component APIs once all call sites use the migrated wrappers.

## 4. App Shell Migration

- [x] 4.1 Rewrite `frontend/src/App.svelte` around shadcn-svelte navigation, token selection, session controls, app error alert, shell layout, toasts, and Wails drag/no-drag regions.
- [x] 4.2 Preserve Wails event wiring for operation progress, interaction requests, and session changes through the controller/store layer.
- [x] 4.3 Verify selected-token, refresh, open-session, and lock-session affordances still match active session-refresh workflow requirements.

## 5. Screen Migration

- [x] 5.1 Migrate `Overview.svelte` to shadcn-svelte dashboard, capability, loading, and raw technical detail surfaces.
- [x] 5.2 Migrate `Credentials.svelte` to shadcn-svelte list/table, grouping, edit/delete dialogs, copy actions, and scoped reload controls.
- [x] 5.3 Migrate `LargeBlobs.svelte` to shadcn-svelte master/detail, decode mode, read result, preview, warning, and confirmation surfaces.
- [x] 5.4 Migrate `Config.svelte` to shadcn-svelte forms, field groups, capability-gated sections, preview/confirmation flows, and status treatments.
- [x] 5.5 Migrate `Lab.svelte` to shadcn-svelte step cards, fields, toggles/tabs, previews, result panels, handoff actions, and raw detail disclosures.
- [x] 5.6 Migrate `Logs.svelte` to shadcn-svelte filter controls, log list/detail surfaces, badges, empty states, and raw metadata views.
- [x] 5.7 Keep all screen operations routed through `frontend/src/lib/controller.ts`, `stores.ts`, and `api.ts`; do not import raw generated Wails bindings from screens.

## 6. Cleanup

- [ ] 6.1 Delete unused bespoke Svelte components and remove dead selectors from `frontend/src/app.css`.
- [ ] 6.2 Remove unused dependencies/assets introduced by the previous custom UI if they are no longer referenced.
- [x] 6.3 Search for hard-coded old UI classes, raw color values in migrated markup, and direct Wails binding imports from screens.
- [ ] 6.4 Confirm long identifiers, JSON/hex artifacts, and narrow-window layouts do not create horizontal page scrolling or overlapped controls.

## 7. Verification

- [x] 7.1 Run `cd frontend; npm run build`.
- [x] 7.2 Run `wails3 dev` or `task dev` from the repo root and capture the printed Wails URL.
- [ ] 7.3 Open the printed Wails URL in the in-app browser and smoke-test discovery, token selection, session open/lock, each screen, dialogs, status bar, toasts, and keyboard focus.
- [x] 7.4 Run `go test ./... -count=1` if controller/API/backend-facing behavior changed during the rewrite.
- [x] 7.5 Document any remaining visual or runtime follow-up tasks before applying or archiving the OpenSpec change.

## Verification Notes

- `npm run build` passes under Svelte 5, Vite 8, Tailwind v4, and shadcn-svelte-generated components after migrating app controls to shadcn primitives.
- `svelte_autofixer` reports no issues for the migrated shared/header/interaction components and touched screens; some cache-restore `$effect` suggestions remain where screen state intentionally restores from stores.
- App markup grep now finds raw `<button>`, `<input>`, `<textarea>`, and `<select>` only inside generated shadcn-svelte UI primitives.
- Wails dev was launched on `http://localhost:9255/` because port `9245` was already occupied.
- In-app browser smoke needs a fresh pass: the Browser plugin tab handle became stale during reload attempts and fallback Playwright was not available through the current Node/npm execution environment.
- Hardware-backed discovery/session/open/lock flows require a connected authenticator and were not exercised in this smoke pass.
- `go test ./... -count=1` was not required for this pass because no Go, controller, API, or generated binding behavior was changed by the migration work.
