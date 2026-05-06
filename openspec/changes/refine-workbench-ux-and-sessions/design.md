## Context

The current app has a working Wails/Svelte shell and a broad backend facade over `ctapkit`, but screenshots reveal several product-quality issues:

- Overview capability cards use oversized pill backgrounds that squeeze copy and look broken.
- Credential and large-blob lists let long credential IDs force horizontal scrolling and unstable action placement.
- The lab is functionally useful but visually reads as two unrelated panels instead of a guided makeCredential/getAssertion workflow.
- The configuration screen exposes biometric controls even for ordinary tokens without biometric support and uses raw state labels that look unfinished.
- Every operation opens and closes a new `ctapkit.Session`, discarding session cache and causing repeated PIN/UV/biometric prompts.
- Basic keyboard affordances such as Enter-to-submit are missing from prompts and forms.

The existing light visual direction is acceptable and should be preserved. This change is a refinement pass, not a brand redesign.

## Goals / Non-Goals

**Goals:**

- Keep the current light theme direction while making the UI look deliberate, dense, and stable.
- Replace brittle cards/rows with reusable status, metadata, table/list, and step components.
- Make the lab a two-step guided workflow: create credential first, then use or paste a credential into getAssertion.
- Hide or collapse unsupported token capabilities, especially biometrics, while still explaining why a section is absent when useful.
- Reuse one selected-token session across operations so `ctapkit` cache and auth tokens survive normal navigation.
- Keep session lifecycle explicit and safe: refresh, reconnect, token change, reset, cancel, lock, and app shutdown must not leave stale handles.
- Add keyboard support for common app flows.

**Non-Goals:**

- Dark theme support.
- New CTAP operations.
- Replacing Svelte, Wails, or `ctapkit`.
- Removing safety prompts or making destructive actions one-click.
- Full browser-style routing; the app can keep its current screen store.

## Decisions

### Replace Session-per-Operation With a Selected Session Manager

`AuthenticatorService` will own a selected-session state:

- selected device identity/report
- discovery snapshot used to open the session
- `*ctapkit.Session`
- event sink
- active operation/cancel function
- lifecycle state: `idle`, `opening`, `ready`, `running`, `stale`, `closed`, `error`

Operations will call `ensureSession(selector)` before `Session.Run`. If the selected device is unchanged and the session is healthy, the existing session is reused. If the token changes, disappears, reset completes, or the session reports invalid state, the service closes the old session and opens a fresh one.

Alternative considered: keep opening per operation but cache PIN in the frontend. That would be worse: PINs should not be cached in the UI, and `ctapkit` already owns session/token cache semantics.

### Add Explicit Session Controls

The top bar/device strip will show session state and offer a "Lock" or "Close session" action. Locking closes the current `ctapkit.Session`, clears backend session cache, and leaves device selection intact. Refreshing discovery must not automatically close a healthy session unless the selected token is no longer present.

Alternative considered: hide session lifecycle completely. That would make repeated prompts mysterious and remove user agency around clearing cached authorization.

### Use Status Components Instead of Raw State Text

Raw labels like `State: configured` will be replaced with compact status components:

- label, semantic tone, and optional help text
- icon or small visual marker, not large decorative blobs
- states mapped from `supported`, `unsupported`, `configured`, `not_configured`, `preview_only`, and `unknown`
- stable dimensions so status content does not push layout around

Alternative considered: only change CSS on existing text. The current issue is not just color; it is hierarchy and semantics.

### Redesign Lab as a Guided Two-Step Surface

The lab will use a horizontal or vertical step layout depending on viewport:

1. Make credential: RP/user/challenge/options/algorithms/exclude list, preview, run, result.
2. Get assertion: allow list can be auto-filled from the created credential or edited manually, then run and inspect assertions.

Generated artifacts will sit in a dedicated inspector rail or collapsible panels so normalized JSON does not dominate the primary forms. Long byte arrays should be summarized by byte count with copyable JSON/hex details available on demand.

Alternative considered: keep two generic panels and just improve spacing. That does not solve the user's mental model; the lab is naturally a sequence.

### Make Capability Sections Adaptive

Configuration sections will be data-driven from config/inspection reports. Unsupported biometrics will not render as a full management area. Instead, the screen may show a small "not supported by this token" row in an overall capabilities summary. Supported sections get full controls; unsupported sections get compact explanations or are omitted when they add no value.

Alternative considered: always show every possible CTAP feature. That helps protocol completeness but makes ordinary tokens feel cluttered and unfinished.

### Improve Scannability of Credential and Blob Lists

Credential IDs and user IDs will be displayed with truncation, monospace affordances, copy buttons, and expandable detail rows. List items will use fixed action columns and metadata chips so long strings cannot force horizontal scrolling. RP groups should be visually calm and compact enough for many entries.

Alternative considered: use plain cards for each RP/credential. Current screenshots show that card-like groups become too tall and noisy for real credential inventories.

### Keyboard Interaction Rules

Forms and dialogs will implement predictable keyboard behavior:

- Enter submits the primary action in PIN prompts and normal forms.
- Ctrl+Enter or Command+Enter runs multiline/editor forms where Enter should insert a newline.
- Escape closes non-destructive dialogs or cancels pending prompts when safe.
- Focus moves to the first meaningful input when a dialog opens and returns to the invoking control after close when practical.
- Buttons retain visible focus styles.

Alternative considered: rely on browser defaults. The current app uses custom modal/form flows where defaults are not enough.

## Risks / Trade-offs

- Persistent sessions can become stale after unplug/replug -> Detect selection mismatch, close on runtime invalid-session/invalid-state categories, expose session status, and allow manual lock/reopen.
- Long-lived sessions may hold device leases longer than expected -> Provide explicit lock/close, close on token switch/app shutdown, and avoid keeping sessions for non-selected devices.
- Session reuse may serialize operations more strictly -> Keep the current single active operation model and surface "running" status.
- Hiding unsupported sections could reduce discoverability -> Show a compact capability summary so users still understand why biometrics or other controls are absent.
- Keyboard shortcuts can conflict with text editing -> Use Ctrl/Command+Enter for textarea submit and plain Enter only for single-line forms/prompts.
- Visual polish can regress existing working flows -> Refactor through reusable components and verify each screen with screenshots at desktop and narrower widths.

## Migration Plan

1. Refactor backend session handling behind the existing Wails service method names so frontend call sites do not need a protocol rewrite.
2. Add session status/lock methods and generated bindings.
3. Introduce UI primitives: status badge, metadata field, copyable truncation, action row, step panel, capability summary, and improved dialog shell.
4. Refactor screens one by one: Overview, Credentials, LargeBlobs, Config, Lab.
5. Add keyboard handlers and focus helpers to dialogs/forms.
6. Verify with `go test ./...`, frontend build, Wails build, and screenshot/manual smoke checks with at least one authenticator.

## Open Questions

- Should the app keep a session alive indefinitely while selected, or close it after a configurable idle timeout?
- Should "Lock session" be the primary label, or "Forget PIN/UV cache" for clarity?
- Should getAssertion auto-fill from the last makeCredential result by default, or ask before replacing an existing allow list?
