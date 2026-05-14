## Why

The current workbench shell splits core context across the top selector, left navigation, right activity rail, mobile activity sheet, and logs screen. This makes persistent session ownership feel detached from token selection, duplicates event history outside Logs, and leaves the primary workspace squeezed by a secondary panel.

This refactor consolidates global controls into a calmer app frame before more screens depend on the current shell shape, and it introduces URL-backed routing so navigation state is explicit, shareable within the Wails runtime, and easier to extend.

## What Changes

- Remove the right activity rail and its mobile sheet variant from the main workbench layout.
- Move session lifecycle controls fully into the top app bar: a rich authenticator selector on the left, Refresh next to it, and session ownership/release actions on the right.
- Make the selector itself carry key token context: display name, serial number or selector, transport as a compact pill, and session state through a left status icon.
- Align the sidebar header and top app bar as one continuous top chrome with matching height, background, border treatment, and vertical rhythm.
- Treat authenticator selection as owning a persistent session for that authenticator under the current product model; make background sessions visible as open device handles that can monopolize authenticators until closed.
- Move current activity and concise operation/session feedback into the navigation footer area, keeping it compact and persistent without taking workspace width.
- Remove the Recent Events surface from the shell; event history remains available through the Logs screen and log deep links/focus behavior.
- Replace the manual `activeScreen` screen switcher with `svelte-spa-router` routes for the main workbench screens.
- Preserve stores/controllers as the screen boundary: screens continue to call the controller/API layer rather than generated bindings directly.
- Preserve Wails runtime behavior and backend session semantics; this change is a frontend shell, routing, and UX refactor.
- **BREAKING** for frontend internals: screen navigation, active-screen state ownership, shell component composition, and activity/session component boundaries will change.

## Capabilities

### New Capabilities

- `workbench-app-shell-navigation`: The workbench provides a rail-free application shell with top-bar persistent session controls, compact nav-footer activity, explicit background session ownership, and route-backed screen navigation.

### Modified Capabilities

- `workbench-status-bar`: Global operation feedback moves from a bottom/right activity summary model into a compact navigation footer activity surface, while detailed logs remain in the Logs screen.
- `keyboard-interaction-ux`: Route-backed navigation and top-bar session controls must preserve keyboard focus, accessible labels, and predictable tab order.
- `workbench-visual-refinement`: The refined shell removes secondary panel chrome and keeps the primary workspace full-width, dense, and readable.

## Impact

- Frontend dependencies: add `svelte-spa-router` and any minimal route typing/helpers needed for Svelte 5.
- Frontend source: refactor `frontend/src/App.svelte`; replace or split `frontend/src/components/ActivityRail.svelte`; add app-shell components for top-bar session controls and nav-footer activity.
- Frontend state/routing: replace `activeScreen` as the primary navigation mechanism with route-derived state; keep compatibility helpers only where existing controller behavior still needs the current screen concept.
- Session UX: keep persistent selected-authenticator sessions as an intentional app behavior, but expose their resource ownership clearly because open sessions hold device descriptors and can monopolize authenticators.
- Frontend screens: mount screens through router definitions for Overview, Credentials, Large Blobs, Config, Lab, and Logs.
- Frontend i18n: add or adjust labels for top-bar session actions, route navigation, and compact activity footer copy.
- Verification: run `cd frontend; npm run build`; for UI smoke testing, use the full Wails dev runtime (`wails3 dev` or `task dev`) rather than browser-only preview.
