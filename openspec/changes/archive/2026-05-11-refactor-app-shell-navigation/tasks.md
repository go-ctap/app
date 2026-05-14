## 1. Routing Setup

- [x] 1.1 Add `svelte-spa-router` to the frontend dependencies and update lockfile/package metadata.
- [x] 1.2 Create route constants and a route-to-screen metadata map for Overview, Credentials, Large Blobs, Config, Lab, and Logs.
- [x] 1.3 Replace `activeScreen` as the primary navigation state with router-derived active route state, keeping compatibility only where controller behavior still needs it.
- [x] 1.4 Add default and unknown-route redirects so app startup never lands on a blank workspace.

## 2. App Shell Refactor

- [x] 2.1 Refactor `frontend/src/App.svelte` to render the routed screen instead of mounting every screen and hiding inactive sections.
- [x] 2.2 Align the sidebar header and top app bar to the same height, background, border treatment, and vertical rhythm.
- [x] 2.3 Ensure collapsed sidebar header alignment remains consistent with the top app bar.
- [x] 2.4 Remove the main content grid column reserved for the right activity rail and let the active workspace use full available width.
- [x] 2.5 Update sidebar navigation buttons to navigate through route helpers while preserving active route styling.
- [x] 2.6 Preserve Overview auto-load behavior when the active route becomes Overview and an authenticator is selected.

## 3. Session Controls

- [x] 3.1 Redesign `TokenSelect` as a rich selector that shows display name, serial number or selector, transport pill, and a left session-state icon.
- [x] 3.2 Place Refresh immediately next to the rich selector in the top bar.
- [x] 3.3 Extract selected-session and background-session action logic from `ActivityRail.svelte` into right-aligned top-bar session controls.
- [x] 3.4 Show background open-session count on the right side of the top bar when non-selected sessions exist.
- [x] 3.5 Place close selected session and close all sessions actions on the right side of the top bar.
- [x] 3.6 Ensure busy, disabled, stale, error, and no-device states match existing controller/store semantics.
- [x] 3.7 Add accessible names, titles/tooltips, and keyboard-visible focus states for icon-only refresh/close actions.
- [x] 3.8 Represent background sessions as intentional open device-handle ownership and keep their release path visible without restoring the right rail.

## 4. Activity Footer And Logs

- [x] 4.1 Extract current activity/outcome rendering into a compact navigation footer component.
- [x] 4.2 Support running progress, cancel, retry, idle/session summary, and concise success/error/warning outcomes in the footer.
- [x] 4.3 Remove Recent Events rendering from the shell and ensure event history remains available in Logs.
- [x] 4.4 Preserve view-log/focus-log behavior for activity outcomes that reference a log entry.
- [x] 4.5 Remove the mobile activity sheet trigger and sheet-specific shell behavior.

## 5. Cleanup And UI Polish

- [x] 5.1 Delete or simplify `ActivityRail.svelte` after its session and activity responsibilities are migrated.
- [x] 5.2 Remove unused sheet, card, item, and rail imports that only supported the old activity panel.
- [x] 5.3 Keep app-shell styling shadcn-svelte-first and Tailwind utility-first, adding custom abstractions only for repeated shell patterns.
- [ ] 5.4 Verify narrow and desktop layouts do not overlap, clip icon controls, or introduce horizontal page scrolling.

## 6. Verification

- [x] 6.1 Run `cd frontend; npm run build`.
- [x] 6.2 Ask the user to smoke-test the real Wails desktop window with `wails3 dev` or `task dev`.
- [ ] 6.3 During smoke test, verify route navigation, top-bar session actions, nav-footer activity updates, Logs navigation/focus, and absence of the right rail/sheet.
