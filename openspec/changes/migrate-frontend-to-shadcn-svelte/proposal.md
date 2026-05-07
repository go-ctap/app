## Why

The frontend is still built on one-off CSS primitives even though the product is becoming a real desktop workbench with repeated forms, dialogs, status surfaces, tables, and recovery flows. Moving the whole UI to shadcn-svelte now gives the project a stable component foundation before the screen set grows further and before more custom styling becomes costly to replace.

## What Changes

- Upgrade the frontend from Svelte 4 to Svelte 5 and migrate the UI foundation to the current shadcn-svelte + Tailwind v4 stack.
- Introduce shadcn-svelte, Tailwind CSS, semantic theme tokens, `cn`, path aliases, icon support, and a checked-in `src/lib/components/ui/` component set for the Wails/Vite Svelte app.
- Replace custom shell, navigation, status, dialogs, forms, empty states, badges, tables/lists, copy controls, JSON/detail panels, and operation feedback with shadcn-svelte primitives or thin app wrappers around them.
- Refactor all screens (`Overview`, `Credentials`, `LargeBlobs`, `Config`, `Lab`, and `Logs`) to compose shared shadcn-svelte UI surfaces while keeping state and Wails calls in the existing controller/store layer.
- Remove obsolete bespoke UI components and CSS once their behavior is represented by shadcn-svelte equivalents.
- Preserve the current backend and generated Wails binding contracts; this change is a frontend architecture and UX rewrite, not a CTAP/session semantics rewrite.
- **BREAKING** for frontend internals: Svelte component syntax/runtime expectations, component imports, styling conventions, and the shape of reusable UI wrappers will change across the Svelte source tree.

## Capabilities

### New Capabilities

- `shadcn-svelte-design-system`: The workbench frontend uses shadcn-svelte, Tailwind tokens, and shared app-level wrappers as the default UI composition system.

### Modified Capabilities

- `workbench-visual-refinement`: Visual polish requirements now include shadcn-svelte composition, semantic tokens, and removal of bespoke layout/styling primitives.
- `workbench-status-bar`: Global operation and session feedback must be rebuilt using shadcn-svelte-compatible status, action, and overlay primitives.
- `keyboard-interaction-ux`: Dialog, menu, tab, form, and focus behavior must be provided or preserved through accessible shadcn-svelte primitives.
- `premium-overview-dashboard`: Overview dashboard composition must move from custom cards/status panels to shadcn-svelte surfaces without weakening scanability.
- `integrated-large-blob-workspace`: Large blob list/detail/editor surfaces must move to shadcn-svelte tables/forms/dialogs while preserving raw data inspection.
- `integrated-lab-results`: WebAuthn lab steps, inputs, previews, and result panels must move to shadcn-svelte forms, alerts, and detail surfaces.

## Impact

- Frontend dependencies: add Tailwind CSS, shadcn-svelte CLI output, shared class utilities, icon dependencies, and component dependencies selected by the generated shadcn-svelte components.
- Frontend runtime: upgrade Svelte, Svelte compiler/plugin dependencies, and any related tooling needed for Svelte 5 compatibility.
- Frontend config: update Vite and TypeScript aliases for `$lib`, configure Tailwind/global CSS in the Wails frontend entry, and add `components.json`.
- Frontend source: rewrite `frontend/src/App.svelte`, all `frontend/src/screens/*.svelte`, and most `frontend/src/components/*.svelte`; add `frontend/src/lib/components/ui/**` and app-specific composition wrappers where useful.
- Frontend state/API: keep `frontend/src/lib/controller.ts`, `stores.ts`, and `api.ts` as the screen boundary, changing them only where the UI rewrite exposes missing state shape or action ergonomics.
- Verification: run `cd frontend; npm run build`, then inspect the full Wails dev runtime via `wails3 dev` or `task dev` and the in-app browser; run Go tests only if controller/API/backend behavior changes.
