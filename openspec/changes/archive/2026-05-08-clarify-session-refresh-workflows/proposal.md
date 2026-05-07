## Why

Session and refresh controls currently expose backend mechanics instead of user intent: `Clear session` and `Lock session` appear to do the same thing, reopening a closed session is hidden behind visiting Overview, and Credentials/Large Blobs each show duplicate generic `Refresh` buttons. This is especially painful because credential enumeration is the slow path, while large-blob state and credential inventory can reuse the same `ctapkit` session cache.

## What Changes

- Rename and rationalize session actions so there is one user-facing "Lock session" action for clearing cached authenticator authorization, plus an explicit "Open session" recovery action available from any selected-token screen.
- Replace generic duplicate `Refresh` copy with scoped actions: "Refresh devices" for discovery, "Reload credentials" for resident credential inventory, and "Reload blobs" or "Reload blob map" for large-blob state.
- Make closed/stale/error session states self-recovering in the UI: the device strip/status bar should explain the state and offer the next action without requiring navigation to Overview.
- Add shared per-token inventory state so Credentials and Large Blobs can reuse resident credential data gathered by either screen.
- Let Large Blobs opportunistically hydrate from cached credential inventory before or while loading blob-specific state, and let Credentials hydrate immediately from cached inventory produced by Large Blobs.
- Preserve explicit user control for slow token operations: automatic cache hydration may update the screen, but token I/O still shows progress and remains cancelable.

## Capabilities

### New Capabilities

- `explicit-session-recovery`: Selected-token session states expose clear lock/open/retry actions from the global shell and relevant screens.
- `scoped-refresh-actions`: Refresh controls communicate exactly which data they update and avoid duplicate generic buttons in one visual context.
- `shared-credential-inventory-cache`: Credentials and Large Blobs share resident credential inventory for the selected token and can hydrate each other from cached operation results.

### Modified Capabilities

None. The repository currently carries these areas as active changes rather than archived baseline specs, so this change introduces complementary capabilities and references the affected active work in Impact.

## Impact

- Frontend app shell: device strip/session controls, bottom status bar actions, labels, and recovery copy.
- Frontend stores/controller: shared selected-token inventory cache, cache metadata, scoped reload helpers, and cross-screen hydration.
- Credentials and LargeBlobs screens: remove duplicate generic empty-state/header refresh buttons, use scoped action names, hydrate from shared cache, and distinguish cached data from currently reloading data.
- Backend API surface may remain unchanged if the existing inspect/list operations are enough; an explicit frontend "open session" helper can call a lightweight existing operation or a new backend method if needed.
- Tests should cover session lock/reopen affordances, refresh label semantics, cross-screen inventory hydration, and stale cache invalidation on token change, discovery loss, mutation, and explicit lock.
