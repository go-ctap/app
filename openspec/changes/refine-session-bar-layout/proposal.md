## Why

The workbench shell already carries persistent session controls, but the top bar and sidebar footer feel visually crowded and do not communicate session ownership clearly enough. Refining these surfaces now will make multi-session state easier to scan before more token workflows depend on the same chrome.

## What Changes

- Replace the separate close-session and close-all-session controls with a compact grouped action: the primary button closes the selected session, and an adjacent menu contains close-all-sessions.
- Restore a subtle glass treatment to the main workspace top bar when content scrolls underneath it.
- Restyle the background-session count from a pill into a compact rounded-square dashed outline indicator.
- Normalize top-bar control height, vertical alignment, and edge padding so the selector, refresh action, session action group, and background count read as one row.
- Slightly increase top-bar height to give the authenticator selector enough breathing room.
- Correct selector session-state icons so green indicates an open session regardless of selected item state, while the check mark remains the selected-device affordance.
- Simplify the sidebar footer activity surface by removing the extra details button and card-like treatment, using the space for denser status text and only directly useful actions.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `workbench-app-shell-navigation`: refine top chrome sizing, glass behavior, grouped session actions, and background-session count presentation.
- `authenticator-selection`: clarify selector item session-state icon semantics independent of selected-item state.
- `workbench-status-bar`: simplify navigation footer activity layout and remove redundant detail affordances from the compact shell surface.

## Impact

- Frontend shell and session controls in `frontend/src/App.svelte`, `frontend/src/components/TopSessionControls.svelte`, `frontend/src/components/TokenSelect.svelte`, and `frontend/src/components/NavActivityFooter.svelte`.
- Shared shadcn-svelte component usage may require installing or wiring `button-group` and `dropdown-menu` primitives under `frontend/src/lib/components/ui/`.
- No backend API or Wails binding changes are expected.
- Verification should include `cd frontend; npm run build` and manual smoke testing in the real Wails dev window.
