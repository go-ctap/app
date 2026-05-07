## 1. Session Recovery Language

- [x] 1.1 Replace user-facing `Clear session` labels and copy with `Lock session` while preserving technical log detail where useful.
- [x] 1.2 Add an explicit selected-token open/warm session API path or controller helper that updates `SessionStatus` without navigating to Overview.
- [x] 1.3 Surface `Open session` for closed/stale/error selected sessions in the device strip and status bar.
- [x] 1.4 Ensure running/opening operations prioritize `Cancel` and do not expose conflicting session lock/open actions.
- [x] 1.5 Add backend or controller tests for lock -> open session recovery and stale/error recovery action state.

## 2. Scoped Refresh Controls

- [x] 2.1 Rename global discovery refresh controls to `Refresh devices`.
- [x] 2.2 Rename Overview reload controls to `Reload overview`.
- [x] 2.3 Rename Credentials reload controls to `Reload credentials`.
- [x] 2.4 Rename Large Blobs reload controls to `Reload blobs` or `Reload blob map`.
- [x] 2.5 Remove duplicate visible same-operation reload buttons from Credentials and Large Blobs empty states when the screen toolbar action is visible.
- [x] 2.6 Update status bar retry/recovery labels so retry remains operation-specific and discovery refresh remains device-specific.

## 3. Shared Inventory Cache

- [x] 3.1 Add shared selected-token credential inventory state keyed by selector/device identity/selection version.
- [x] 3.2 Normalize the minimal cross-screen credential fields and cache quality flags for management-quality and blob-quality data.
- [x] 3.3 Update Credentials successful loads to write management-quality inventory into the shared cache.
- [x] 3.4 Update Large Blobs successful loads to write blob-quality inventory into the shared cache.
- [x] 3.5 Invalidate or mark shared inventory stale on token change, selected token disappearance, explicit lock, session stale/error, factory reset, and credential/blob mutations.

## 4. Cache-Aware Screen Hydration

- [x] 4.1 Hydrate Credentials from management-quality shared inventory immediately on selected-token screen entry.
- [x] 4.2 Hydrate Credentials from blob-quality inventory as limited context and start a visible cache-aware reload only when the selected session is already ready.
- [x] 4.3 Hydrate Large Blobs credential rows from shared inventory before blob-specific state is loaded.
- [x] 4.4 Keep cold first visits explicit by showing scoped reload actions instead of silently starting slow token I/O when no suitable cache exists.
- [x] 4.5 Show operation progress and cancellation for any automatic warm reload started from cache-aware screen entry.

## 5. Verification

- [x] 5.1 Run frontend type/build checks.
- [x] 5.2 Run Go tests for session lifecycle and new open/warm session behavior.
- [ ] 5.3 Inspect the Wails dev runtime and verify lock/open session works without switching to Overview.
- [ ] 5.4 Manually verify Credentials -> Large Blobs and Large Blobs -> Credentials warm paths with a real authenticator.
- [x] 5.5 Verify no Credentials or Large Blobs viewport shows two visible buttons that run the same reload action.
