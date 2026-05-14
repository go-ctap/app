## 1. Component Setup

- [x] 1.1 Check the shadcn-svelte docs index for `button-group` and `dropdown-menu` usage before changing or adding those components.
- [x] 1.2 Install missing shadcn-svelte primitives from `frontend/` with the CLI, preferring generated component files over hand-copying component trees.
- [x] 1.3 Confirm existing lucide icons cover the grouped session menu affordances and add only necessary icon imports.

## 2. Top Bar Layout

- [x] 2.1 Increase shared sidebar header and workspace top bar height while keeping them aligned in expanded and collapsed sidebar states.
- [x] 2.2 Normalize top-bar horizontal padding, control heights, gaps, and centerline alignment across selector, refresh, session controls, background count, and locale selector.
- [x] 2.3 Add scroll-aware glass styling to the main workspace header so blur/translucency appears when content scrolls under it and remains calm at scroll top.

## 3. Session Controls

- [x] 3.1 Replace separate close selected and close all buttons in `TopSessionControls.svelte` with a `ButtonGroup.Root` containing the primary close-selected button and dropdown trigger.
- [x] 3.2 Move close-all-sessions into a dropdown menu item with accessible label, disabled state, and existing controller behavior.
- [x] 3.3 Restyle the background-session count as a compact rounded-square dashed-outline indicator with title or accessible label text.
- [x] 3.4 Preserve open/recover selected session behavior and busy-state disabling.

## 4. Selector State Semantics

- [x] 4.1 Pass session snapshots or a derived session-state lookup from `App.svelte` into `TokenSelect.svelte`.
- [x] 4.2 Update selector row icons so green means the row's authenticator has a ready open session regardless of selection.
- [x] 4.3 Preserve the select component's selected-row check mark as the selected-device affordance.
- [x] 4.4 Ensure closed, running/opening, stale, and error rows use distinct icon/tone states without leaking session secrets or raw debug data.

## 5. Navigation Footer

- [x] 5.1 Remove the card-like wrapper treatment from `NavActivityFooter.svelte` while keeping the footer compact and readable in the sidebar.
- [x] 5.2 Remove the generic details button from the footer action list.
- [x] 5.3 Preserve direct utility actions such as cancel, retry, refresh discovery, and open/recover session.
- [x] 5.4 Use the reclaimed footer space for denser title/message text without overflowing collapsed or narrow sidebar states.

## 6. Verification

- [x] 6.1 Run Svelte MCP `list-sections`, fetch relevant docs, and run `svelte-autofixer` on changed Svelte components until no relevant issues remain.
- [x] 6.2 Run `cd frontend; npm run build`.
- [x] 6.3 Ask the user to run `wails3 dev` or `task dev` from the repo root and smoke-test the real desktop window, including scrolling the main workspace, opening the selector, and checking selected/background session states.
