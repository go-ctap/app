## Context

The selected authenticator already has persistent session lifecycle state in the backend and global feedback in the shell/status bar. The remaining UX problem is vocabulary and discoverability: the app has both `Lock session` and `Clear session`, all reload buttons say `Refresh`, and the only obvious way to reopen a closed session is to run Overview inspection.

Credentials and Large Blobs also overlap operationally. Credential enumeration is comparatively slow and primes `ctapkit`'s session cache; Large Blobs depends on credential identity and also causes credential information to be available for the selected session. The UI should treat these as related selected-token data, not as two disconnected pages that always start cold.

## Goals / Non-Goals

**Goals:**

- Use one public verb for clearing cached authenticator authorization: `Lock session`.
- Make reopening a selected token session explicit from the device strip/status bar and from empty/error states.
- Give every refresh/reload button a scope-specific label.
- Remove duplicate visible buttons that perform the same reload in Credentials and Large Blobs.
- Share selected-token credential inventory metadata between Credentials and Large Blobs so each screen can hydrate from data or session cache created by the other.
- Keep slow token I/O visible, cancelable, and safe.

**Non-Goals:**

- Changing CTAP operation semantics or bypassing PIN/UV/touch prompts.
- Caching PINs, UV tokens, or secrets in the frontend.
- Automatically running destructive or mutating operations.
- Replacing the existing Svelte store/controller pattern.

## Decisions

### Use Session Intent Labels

The UI will expose:

- `Lock session`: closes the current selected-token `ctapkit.Session`, clears cached authorization, preserves token selection, and clears screen data that depends on the old session.
- `Open session`: opens or warms a session for the selected token without requiring the user to visit Overview.
- `Retry session`: shown for stale/error states when the previous operation failed and the next best action is to re-open or refresh.

`Clear session` should disappear from user-facing copy unless it is used in technical logs. This gives users one mental model: locking is deliberate privacy/security cleanup; opening is recovery.

Alternative considered: keep both `Clear session` and `Lock session` with tooltips. That still asks the user to distinguish two equivalent actions and does not solve the hidden reopen path.

### Add An Explicit Open-Session Path

Prefer a backend method such as `OpenSession(req OperationRequest) SessionStatus` or `WarmSession(req OperationRequest) OperationEnvelope` that selects the current token, opens the session, returns status, and emits normal session events. If a dedicated method is not practical immediately, the frontend may temporarily implement `Open session` by running a lightweight existing inspection operation, but the status bar and logs must label it as session opening, not Overview loading.

The action should be available when a token is selected and the session is `closed`, `stale`, or `error`, and disabled while an operation is `opening` or `running`. If the session is already `ready`, the button is hidden or replaced by `Lock session`.

Alternative considered: rely on the next real operation to reopen the session. Lazy reopening is technically valid, but it is not discoverable after the user has explicitly locked the session.

### Scope Refresh Copy By Data Domain

Use these labels consistently:

- `Refresh devices`: rediscover authenticators and update selection.
- `Reload overview`: rerun token inspection.
- `Reload credentials`: enumerate resident credentials.
- `Reload blobs`: reload large-blob state and its credential mapping.
- `Retry`: rerun the failed operation from the status bar.

Each screen should have one primary reload control in its header/toolbar. Empty states may reference the same action in text, but they should not add a second visible button when the header action is already visible.

Alternative considered: keep generic `Refresh` and rely on placement. Placement is not enough when the top bar, screen header, empty state, and status bar can all be visible together.

### Store Shared Selected-Token Inventory

Add a shared store keyed by selected token identity, for example:

- `selector`
- stable device identity details from discovery
- `sessionOpenedAt` or `selectionVersion`
- `inventoryEnvelope`
- normalized credential summaries when available
- source: `credentials`, `largeBlobs`, or `overview`
- `loadedAt`
- quality flags such as `hasManagementFields` and `hasBlobFields`

Credentials writes a management-quality inventory after `ListCredentials`. Large Blobs writes blob-quality inventory after `ListLargeBlobs`. Both screens can read the shared store on mount/selection change before deciding whether to run token I/O.

Alternative considered: keep only screen-local caches and trust `ctapkit` backend cache. Backend cache helps performance but does not let the frontend explain why a screen is already warm or hydrate visible rows before the next operation completes.

### Use Cache-Aware Screen Entry

On screen entry:

- Credentials renders management-quality cached inventory immediately when present.
- If only blob-quality inventory is present, Credentials may show a lightweight cached list and start `Reload credentials` automatically only when the related session is already `ready` and no operation is running.
- Large Blobs renders cached credential rows immediately when present, then prompts or starts `Reload blobs` depending on whether blob-quality state is already available.
- A first cold visit with no useful cache should keep an explicit `Reload credentials` or `Reload blobs` call to action instead of surprising the user with a slow authenticator operation.

Mutation success invalidates affected shared inventory and then reloads the owning screen. Explicit `Lock session`, token change, selected token disappearance, factory reset, and stale/error transitions invalidate inventory that cannot be trusted across the new session boundary.

Alternative considered: auto-load every screen on navigation. That feels convenient on warm paths but can surprise users with PIN/UV/touch prompts on cold paths.

## Risks / Trade-offs

- Cached inventory could be stale after external token changes -> Invalidate on explicit lock, token change, discovery loss, successful mutations, reset, and session stale/error events; show `loadedAt` only in low-emphasis copy when useful.
- Additional frontend cache shape can drift from backend reports -> Normalize only the fields needed for cross-screen hydration and keep raw operation envelopes screen-owned for detailed JSON.
- A dedicated open-session method may duplicate operation-session code -> Implement it through the same backend session manager used by normal operations and cover it with lifecycle tests.
- Status bar actions can become crowded -> Show only the highest-priority session action: `Open session` for closed/stale/error, `Lock session` for ready, `Cancel` while running.
- Automatic warm reload can still trigger prompts -> Only auto-run when the user navigated to the screen and the selected session is already `ready`; otherwise show an explicit button.

## Migration Plan

1. Rename user-facing `Clear session` labels to `Lock session` and update status/log copy for consistency.
2. Add the explicit open-session controller/API path and surface it in the device strip, status bar, and session recovery empty/error states.
3. Rename refresh buttons by scope and remove duplicate empty-state/header reload buttons.
4. Introduce shared selected-token inventory state and selectors for management-quality and blob-quality cached data.
5. Wire Credentials and Large Blobs to hydrate from the shared store, then perform cache-aware reloads.
6. Invalidate shared inventory on token/session boundaries and after credential/blob mutations.
7. Verify frontend build plus Wails runtime flows: lock/open session, stale recovery, Credentials -> Large Blobs, Large Blobs -> Credentials, and cold first visits.

## Open Questions

- Should the backend method be named `OpenSession`, `WarmSession`, or `UnlockSession`? `OpenSession` is the clearest UI/API pairing, while `WarmSession` describes the cache behavior more precisely.
- Should warm cross-screen reload start automatically on navigation, or should it be a one-click action with a "session cache is warm" hint? The proposed default is automatic only when the session is already `ready`.
