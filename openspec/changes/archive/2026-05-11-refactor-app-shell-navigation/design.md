## Context

The current Wails frontend shell keeps screen selection in `activeScreen` and renders every main screen in `App.svelte`, hiding inactive sections. The same shell also places token selection in the top bar while session lifecycle actions, current activity, background sessions, and recent event history live in `ActivityRail.svelte` as a right-side desktop rail or mobile sheet.

The current product model treats selecting an authenticator as opening or owning a persistent session for that authenticator. Multiple sessions can exist in the background; each open session holds a device descriptor and can effectively monopolize that authenticator until the session is closed. This refactor does not change that session model. It makes the model more explicit by placing session ownership next to selection and by keeping background-session release controls globally available.

That shape makes the primary workspace narrower, creates two global control zones, and duplicates Logs with a small Recent Events list. The app is already moving to Svelte 5 and shadcn-svelte, so this is the right moment to make the shell a deliberate product surface rather than preserve the early rail-based layout.

Frontend direction:

- Visual thesis: a quiet local-security workbench with a full-width working canvas, restrained chrome, and one persistent operational heartbeat in the navigation footer.
- Content plan: one continuous top chrome made from aligned sidebar header and top app bar; top bar left side for a rich authenticator selector and Refresh; top bar right side for background-session count and release actions; left navigation for destinations; main workspace for the active route; nav footer for current activity; Logs for event history.
- Interaction thesis: route changes should feel immediate and stable; session actions should be one click from the selected authenticator; activity feedback should update in place without stealing focus or opening a panel.

## Goals / Non-Goals

**Goals:**

- Remove the right activity rail and mobile activity sheet from the default shell.
- Consolidate authenticator selection, device refresh, and session lifecycle actions into the top app bar.
- Put current activity, running operation state, and concise recovery/outcome messaging in the navigation footer.
- Remove Recent Events from the shell and make Logs the single event history surface.
- Replace manual screen switching with `svelte-spa-router` routes for Overview, Credentials, Large Blobs, Config, Lab, and Logs.
- Preserve the current persistent session model where selected authenticators can keep device handles open, while making selected/background session ownership and release actions visible.
- Keep Wails calls behind `frontend/src/lib/controller.ts`, `frontend/src/lib/api.ts`, and stores.
- Keep the implementation shadcn-svelte-first and Tailwind-utility-first, with custom CSS only for repeated app-shell patterns.

**Non-Goals:**

- No backend session lifecycle or CTAP behavior changes.
- No changes to generated Wails bindings except as an incidental result of unrelated backend work.
- No redesign of every screen's internal workflow beyond what is required to fit the new shell.
- No browser-only smoke test plan; UI verification still needs the Wails dev runtime.

## Decisions

### Use `svelte-spa-router` as the screen owner

The app SHALL add `svelte-spa-router` and define a route table for the six main screens. `App.svelte` should render a single routed screen instead of rendering all screens and hiding inactive sections.

Rationale: URL-backed state gives the app explicit destinations and removes the bespoke `activeScreen` as the primary navigation mechanism. The package currently targets Svelte 5 (`5.1.0` in npm), which fits the frontend stack already in `frontend/package.json`.

Alternative considered: keep `activeScreen` and refactor only layout. That would avoid a dependency but preserve hidden mounted screens, make deep links harder, and keep navigation as a global store convention instead of an app-shell contract.

### Sidebar header and top bar form one top chrome

The sidebar header should match the top app bar height and share the same background, border, padding rhythm, and vertical alignment so the app reads as one continuous top system across navigation and workspace. The brand block can remain in the sidebar header, but it should align to the selector/control row in the top bar.

Rationale: the shell currently makes the sidebar header and top bar feel like separate stacked regions. Aligning them reduces visual noise and reinforces that selection, session ownership, and navigation are part of one workbench frame.

Alternative considered: keep independent sidebar/header sizing. That is simpler but makes the UI look assembled from separate panels and weakens the rail-free shell goal.

### Split `ActivityRail` into focused shell components

`ActivityRail.svelte` should be removed or decomposed into smaller components:

- `TopSessionControls.svelte` for open/recover, close selected, close all, refresh, and relevant disabled/recovery states.
- `NavActivityFooter.svelte` for current operation/session outcome, compact progress, cancel/retry/view-log actions where applicable.
- Optional small helpers for background session counts or session status badges if those remain useful.

Rationale: the current component mixes panel layout, session controls, current activity, event list rendering, sheet behavior, and log navigation. Splitting by shell region makes it harder for Recent Events or rail assumptions to leak back into the product.

Alternative considered: keep `ActivityRail` and add variants for top/footer. That would reduce short-term churn but keep the wrong abstraction name and make layout-specific branches the default.

### Top bar owns persistent session lifecycle controls

Session lifecycle controls should live in the same top bar as authenticator selection because selection is the moment the app takes persistent ownership of the authenticator session under the current model. The selected session state should be visible inside the selector, and release actions should be available without opening a panel.

The top bar composition should be:

- Left: a rich selector showing token display name, serial number or selector, transport as a compact pill, and session state through a left status icon.
- Next to selector: Refresh as a compact icon action.
- Right: background open-session count when non-selected sessions exist.
- Right actions: close selected session and close all sessions.

The top bar should remain compact: icon buttons with accessible labels for common actions, visible text only where ambiguity, monopolized device state, or destructive release state requires it.

Rationale: users choose a token and recover or release its session in one global context. This is especially important because persistent sessions hold device descriptors and can block other work with that authenticator. This also preserves workspace width and avoids a secondary panel competing with screen-local actions.

Alternative considered: move session controls into each screen header. That would duplicate global behavior and make recovery inconsistent across screens.

### Rich selector owns selected-token context

The selector should absorb the useful context that was previously visible in the right activity block: token name, selector/serial, transport, and session state. The session-state icon should be placed before the token name so users can scan whether the selected authenticator is open, closed, busy, stale, or errored before acting.

Rationale: the selector is the token identity surface. Moving metadata there reduces the need for a secondary context panel and makes persistent session ownership obvious at the point of selection.

Alternative considered: keep the selector minimal and put metadata in adjacent badges. That would work mechanically but spread selected-token identity across too many small controls.

### Background sessions are first-class global state

The shell should distinguish the selected session from background sessions. Background sessions do not belong in the main workspace, but the top/global control area should expose their count and provide a close-all path because they can keep device handles open.

Rationale: multiple sessions are expected, not an error. The risk is invisible resource ownership, so the UI needs release affordances rather than hiding background sessions in a panel.

Alternative considered: only show the selected session. That would simplify the top bar but make device monopolization hard to diagnose when a background authenticator remains open.

### Nav footer owns current activity, not history

The navigation footer should show only the current operation or the latest important outcome/recovery state. It can link to Logs or focus a log entry, but it must not render a Recent Events feed.

Rationale: activity feedback is operational state; event history is a destination. Keeping those separate matches a dense app surface and avoids turning navigation into a second log viewer.

Alternative considered: keep a short recent event list in a collapsible footer. That would preserve duplication and reintroduce a panel-like behavior in a smaller area.

### Keep screens ignorant of router implementation where practical

Screens should not call `svelte-spa-router` directly for routine controller work. Navigation helpers can live in an app-shell route module, and controller/store code should only receive route information when behavior genuinely depends on the active destination, such as focusing a log entry after a View Logs action.

Rationale: screens already have enough domain logic. Routing should be a shell concern unless a workflow intentionally navigates.

Alternative considered: let every screen import router helpers. That is flexible but spreads navigation policy across product workflows.

## Risks / Trade-offs

- Route hash behavior may be visually awkward in a desktop app -> Use predictable hash routes and central route constants; keep route labels independent from URL fragments.
- Hidden-screen state may reset when only the routed component is mounted -> Preserve intentional screen state in existing stores/caches, and audit screens that currently rely on remaining mounted while hidden.
- Moving session actions to the top bar could crowd narrow windows -> Use a compact rich selector, icon refresh/close actions, tooltips, responsive grouping, and overflow only if the right-side background count plus release actions cannot fit.
- Matching sidebar header and top bar heights may constrain branding copy -> Keep brand copy compact and let secondary subtitle truncate or hide in collapsed/narrow states.
- Persistent background sessions may look like leaked handles -> Label them as intentional open sessions and expose close-selected/close-all controls near selection.
- Removing Recent Events may hide useful context for users who relied on the rail -> Preserve log focus/deep-link actions from activity outcomes and make Logs easy to reach from navigation.
- Existing `workbench-status-bar` language still references bottom status surfaces -> This change updates the requirement to a compact navigation footer feedback surface.

## Migration Plan

1. Add `svelte-spa-router` to `frontend/package.json` and introduce typed route constants for all workbench screens.
2. Refactor `App.svelte` so the sidebar menu navigates routes, the main area renders the router, and the sidebar header aligns visually with the top app bar.
3. Extract selected-token summary and session action logic from `ActivityRail.svelte` into a rich top-bar selector and right-aligned session controls without changing controller/API semantics or the persistent-session ownership model.
4. Extract current activity/outcome rendering into a navigation footer component and remove Recent Events rendering from the shell.
5. Remove rail/sheet imports and layout columns, letting the main workspace use full available width.
6. Preserve or adapt log focus behavior so activity actions can open Logs when detailed history is needed.
7. Run `cd frontend; npm run build`, then ask for Wails-window smoke testing with `wails3 dev` or `task dev`.

Rollback strategy: revert the route dependency and shell refactor as one frontend change if route mounting or Wails runtime behavior breaks. Backend and generated bindings are not part of the migration.

## Open Questions

- Should the default route redirect to Overview or the last visited screen within the current app session?
- Should Close All Sessions stay visible even when there are no background sessions, or become disabled/hidden until there is more than one open session?
- Should activity footer outcomes auto-clear after a timeout, or remain until replaced by the next operation/session event?
