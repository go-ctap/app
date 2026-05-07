## 1. Session Lifecycle Backend

- [x] 1.1 Introduce a selected-session manager in `AuthenticatorService` with selected device identity, session handle, lifecycle state, active operation, and close/lock behavior.
- [x] 1.2 Refactor operation execution to call `ensureSession` and reuse a healthy `ctapkit.Session` for the selected authenticator.
- [x] 1.3 Close and clear the current session on token selection changes, selected token disappearance, factory reset success, app shutdown, and explicit lock.
- [x] 1.4 Add Wails methods for reading session status and locking/closing the selected session.
- [x] 1.5 Preserve existing operation envelopes, event sink behavior, interaction prompts, cancellation, and dry-run confirmation semantics.
- [x] 1.6 Reject or disable concurrent operations against the same selected session with a clear busy state.
- [x] 1.7 Add Go tests for session reuse, session close on token change, stale-session invalidation, lock behavior, and interaction cancellation.

## 2. UI Primitive Refinement

- [x] 2.1 Add reusable status component for supported/configured/unsupported/preview-only/unknown states.
- [x] 2.2 Add reusable copyable truncated identifier component for credential IDs, user IDs, blob IDs, and hex artifacts.
- [x] 2.3 Add reusable metadata row/chip components with stable dimensions and no oversized decorative blobs.
- [x] 2.4 Add reusable dialog shell with focus management, Escape handling, primary action semantics, and destructive styling.
- [x] 2.5 Add reusable step panel/stepper components for guided workflows.
- [x] 2.6 Update global CSS to fix visible focus states, responsive constraints, overflow behavior, button sizing, and light-theme polish.

## 3. Shell And Session UX

- [x] 3.1 Show selected-token session state in the device strip or top bar.
- [x] 3.2 Add a lock/close-session action that keeps token selection but clears backend session cache.
- [x] 3.3 Ensure discovery refresh does not close a healthy selected session unless the selected token disappears.
- [x] 3.4 Show clear stale/disconnected session messaging and recovery action when a token disappears or session becomes invalid.
- [x] 3.5 Disable token operation actions while another operation is running on the selected session.

## 4. Overview Visual Fixes

- [x] 4.1 Replace overview capability card status blobs with compact status components.
- [x] 4.2 Adjust overview card layout so copy, headings, and status fit cleanly across desktop and narrower widths.
- [x] 4.3 Keep technical report available but visually secondary and not dominant.
- [ ] 4.4 Verify overview screenshot against the provided broken layout.

## 5. Credential And Blob List UX

- [x] 5.1 Refactor resident credential RP groups into compact scannable list/table rows with stable action columns.
- [x] 5.2 Use truncated copyable identifiers for credential IDs and user IDs to prevent horizontal scrolling.
- [x] 5.3 Refactor large-blob rows to keep RP, user, blob state, byte count, and actions aligned.
- [x] 5.4 Move rarely needed raw details into expandable row detail or JSON inspector sections.
- [ ] 5.5 Verify credential and large-blob list screenshots with real long identifiers.

## 6. Configuration UX

- [x] 6.1 Replace raw `State: ...` text with status components and concise explanatory copy.
- [x] 6.2 Hide full biometric management controls when biometric support is unavailable.
- [x] 6.3 Render unsupported capabilities as compact summary rows when useful instead of full inactive panels.
- [x] 6.4 Rework PIN, always-UV, minimum PIN length, reset, and biometric controls into visually balanced sections.
- [ ] 6.5 Verify ordinary non-biometric token config screen no longer shows a large biometric area.

## 7. Guided WebAuthn Lab

- [x] 7.1 Redesign lab screen as step one makeCredential and step two getAssertion.
- [x] 7.2 Move normalized JSON into secondary inspector rail or collapsible panels.
- [x] 7.3 Summarize byte-array artifacts by label and byte count with copyable raw details on demand.
- [x] 7.4 Offer to populate getAssertion allow list from the last successful makeCredential result.
- [x] 7.5 Keep manual allow-list editing and explain empty allow-list behavior.
- [ ] 7.6 Verify lab layout on wide and narrower windows.

## 8. Keyboard Interaction UX

- [x] 8.1 Submit PIN prompt with Enter and cancel with Escape.
- [x] 8.2 Add Enter-to-preview/submit for single-line edit and configuration forms.
- [x] 8.3 Use Ctrl+Enter or Command+Enter for textarea/editor primary actions without stealing plain Enter.
- [x] 8.4 Restore focus after dialogs close where practical.
- [x] 8.5 Ensure all buttons, inputs, selects, tabs, and copy controls have visible keyboard focus.

## 9. Verification

- [x] 9.1 Run `go test ./...`.
- [x] 9.2 Run frontend production build.
- [x] 9.3 Run `wails3 build`.
- [ ] 9.4 Run Wails dev smoke checks with the user's token for overview, credentials, large blobs, config, and lab.
- [ ] 9.5 Manually verify persistent session reduces repeated PIN/UV prompts across multiple operations on the same token.
- [ ] 9.6 Capture or inspect screenshots for overview, credentials, config, and lab to confirm the reported layout bugs are fixed.
