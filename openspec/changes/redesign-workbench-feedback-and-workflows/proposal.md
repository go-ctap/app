## Why

The workbench now functions, but users still cannot reliably understand what just happened: progress, errors, previews, read results, and operation outcomes appear in disconnected places. Large blobs, lab operations, and the overview need a clearer interaction model that keeps feedback close to the user's task and gives the app a more polished, confident first impression.

## What Changes

- Replace the transient top operation strip with a sticky bottom status bar that shows session state, current operation, last result/error, and contextual recovery actions.
- Redesign large-blob management as an integrated workspace where selecting a credential opens a local detail/editor pane instead of sending read/preview/write results to the bottom of the page.
- Redesign the WebAuthn lab so makeCredential/getAssertion results appear beside the active step, with the sticky status bar summarizing operation outcome and next action.
- Redesign the overview screen into a more premium token dashboard with stronger hierarchy, inspection summary, capability storytelling, and technical details that feel intentional rather than dumped.
- Keep backend method names and operation semantics; this is a UX/information architecture change, not a CTAP feature expansion.

## Capabilities

### New Capabilities

- `workbench-status-bar`: Sticky bottom feedback system for operation progress, session state, errors, success summaries, and contextual actions.
- `integrated-large-blob-workspace`: Split large-blob list/detail workflow with inline read, preview, edit, confirm, and result states for the selected credential.
- `integrated-lab-results`: Guided lab workflow where each step owns its preview/result area and the global status bar summarizes recent lab activity.
- `premium-overview-dashboard`: Redesigned overview dashboard that makes token identity and capabilities feel polished, clear, and visually distinctive.

### Modified Capabilities

None.

## Impact

- Frontend shell, stores, and operation event handling need a shared status model instead of screen-local ad hoc loading/error feedback.
- `LargeBlobs.svelte`, `Lab.svelte`, and `Overview.svelte` need substantial layout and state refactors.
- Existing backend APIs can remain unchanged, though operation envelopes and progress events should be consumed more consistently.
- Verification must include desktop screenshots and manual smoke with a real authenticator, because the main risk is workflow comprehension and visual quality rather than backend correctness.
