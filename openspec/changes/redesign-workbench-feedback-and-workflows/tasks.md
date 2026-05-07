## 1. Shared Status Bar

- [x] 1.1 Replace the current top operation strip with a sticky bottom status bar component in the app shell.
- [x] 1.2 Add shared status-bar store state for session summary, active operation, last outcome, and contextual actions.
- [x] 1.3 Route operation progress events, session changes, operation envelopes, and recoverable errors into the status-bar state.
- [x] 1.4 Add status-bar actions for Cancel, Refresh, Clear session, Retry, and View details where the active context supports them.
- [x] 1.5 Add shell spacing and responsive CSS so the sticky bar never covers screen content.

## 2. Large Blob Workspace

- [x] 2.1 Refactor large blobs into a master/detail layout with credential list and selected credential workspace.
- [x] 2.2 Move read result, decode controls, raw hex copy, and raw JSON details into the selected credential workspace.
- [x] 2.3 Move write payload editor, mutation preview, confirm write, and confirm delete into the selected credential workspace.
- [x] 2.4 Add selected-row highlighting and narrow-window detail placement directly below the selected credential.
- [x] 2.5 Update mutation success flow so the list refreshes, selected detail updates, and the status bar summarizes the result.

## 3. Lab Results Integration

- [x] 3.1 Add result areas inside the makeCredential and getAssertion step panels.
- [x] 3.2 Move makeCredential preview, success, error, credential ID, copy action, and raw output into the makeCredential result area.
- [x] 3.3 Move getAssertion success, error, assertion artifacts, copy actions, and raw output into the getAssertion result area.
- [x] 3.4 Wire makeCredential-to-getAssertion handoff through a visible local action and status-bar confirmation.
- [x] 3.5 Keep normalized input inspection available without pushing operation results to detached page-bottom sections.

## 4. Overview Dashboard

- [x] 4.1 Redesign overview first viewport as a token identity dashboard with product, transport, session, AAGUID, versions, and capability summary.
- [x] 4.2 Replace the flat capability card grid with themed capability groups for sign-in, verification, storage, administration, and advanced protocol details.
- [x] 4.3 Add polished loading, empty, unsupported, and unknown states that preserve layout and avoid oversized decorative cards.
- [x] 4.4 Keep raw technical inspection data available as a secondary expandable inspector.
- [ ] 4.5 Verify desktop and narrow-window overview screenshots for hierarchy, text fit, and visual quality.

## 5. Verification

- [x] 5.1 Run `npm run build` from `frontend`.
- [x] 5.2 Run `wails3 build`.
- [ ] 5.3 Smoke test with a real authenticator: cold overview load, operation progress, session error/recovery, and status-bar actions.
- [ ] 5.4 Smoke test large blobs: load list, select credential, read, change decode mode, preview write, confirm write, preview delete, confirm delete.
- [ ] 5.5 Smoke test lab: preview/run makeCredential, copy/use credential ID, run getAssertion, inspect raw details.
- [ ] 5.6 Capture or inspect screenshots for overview, large blobs, lab, and sticky status bar at desktop and narrow widths.
