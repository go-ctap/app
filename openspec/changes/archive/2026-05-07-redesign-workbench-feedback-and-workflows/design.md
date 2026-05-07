## Context

The app now has stable backend session behavior and a central frontend controller, but user feedback is still fragmented. Operation events live in a temporary strip near the top, session errors live in a separate notice, toasts are detached from the active workflow, and screen results often appear below the working area. This makes the app feel unpredictable even when the backend operation succeeds.

Large blobs and the lab are especially affected: the user acts on a row or step, then has to scan lower page sections to discover the read result, preview, or generated credential. The overview has the opposite problem: it technically explains features but lacks a strong visual model for “this is your token and these are its powers.”

## Goals / Non-Goals

**Goals:**

- Make global operation/session feedback persistent, compact, and predictable in a sticky bottom status bar.
- Keep workflow results adjacent to the item or step that produced them.
- Turn large blobs into a list/detail workspace with a selected credential and an integrated editor/result pane.
- Turn lab results into step-owned panels that show what happened immediately after preview/run.
- Redesign overview as a high-quality token dashboard with stronger identity, capability, and technical hierarchy.
- Preserve current backend APIs and safety prompts.

**Non-Goals:**

- New CTAP operations or backend data contracts.
- Dark mode or full brand redesign.
- Replacing Svelte stores with a new state library.
- Hiding raw JSON from expert users.

## Decisions

### Use One Sticky Bottom Status Bar

The app shell will replace the current top operation strip with a bottom status bar that is always visible when the app has a token, active operation, session issue, or recent result. It should contain:

- session state and selected token short label;
- current operation stage and progress counts when running;
- last success/error summary after completion;
- contextual actions such as Cancel, Refresh, Clear session, View result, or Retry when applicable.

Alternative considered: keep a top operation strip and improve styling. That still competes with page content and does not solve the user’s need for a stable “what just happened?” place.

### Keep Detailed Results Inside The Active Workflow

The status bar summarizes, but detailed output stays in the active screen near the thing that produced it. Large blob read/preview/write results should appear in the selected credential pane. Lab makeCredential/getAssertion results should appear inside the matching step/result column. The status bar can deep-link or scroll/focus to the detailed result, but it should not become the only result viewer.

Alternative considered: move all results into the status bar. That would make complex JSON, hex, and previews cramped and would be worse for expert inspection.

### Redesign Large Blobs As A Two-Pane Workspace

Large blobs will use a master/detail layout:

- left/main list: credential rows with RP/user/blob status and compact actions;
- right/detail pane: selected credential identity, read result, decode controls, payload editor, mutation preview, confirmation actions, and raw JSON details.

On narrow windows, the detail pane becomes an in-page drawer below the selected row, not a detached page-bottom section. Selecting Read, Write, or Delete changes the pane mode instead of appending sections at the bottom.

Alternative considered: keep row actions and improve spacing. The user’s complaint is workflow placement, not only layout density.

### Redesign Lab Around Step-Owned Results

The lab remains a guided makeCredential -> getAssertion workflow, but each step gets an adjacent output area:

- preview shows normalized input and dry-run warnings inside the step;
- run shows success/error summary, key artifacts, and raw JSON inside the same step;
- created credential can be copied or pushed into getAssertion from the makeCredential result area.

Alternative considered: a single inspector rail for all results. The rail is useful for normalized inputs, but operation outcomes need to land next to the action that created them.

### Make Overview Feel Like A Dashboard, Not A Card Grid

Overview should lead with a “token identity” dashboard: product name, transport/session state, AAGUID, protocol versions, and a small capability score/summary. Capabilities should be grouped by practical themes:

- Sign-in and verification;
- Storage and resident credentials;
- Administration and reset;
- Advanced protocol details.

The layout should use compact metric bands, strong typography, and selective icons/status badges instead of seven similar cards. Raw technical report remains available in a secondary inspector.

Alternative considered: prettier capability cards. Similar cards are the source of the flat, boring feeling; the dashboard needs more hierarchy and contrast.

## Risks / Trade-offs

- Sticky bottom UI can cover content -> Add bottom padding to the app shell and verify on smaller windows.
- Status bar can become noisy -> Limit it to current operation plus latest important outcome; routine screen loading stays local unless it invokes a backend token operation.
- Large blob detail pane can feel dense -> Use modes, tabs, or segmented controls for Read/Edit/Preview/Raw rather than stacking every panel at once.
- Overview “wow” can become marketing fluff -> Keep all content derived from real inspection data and avoid decorative-only hero sections.
- More shared state can regress workflows -> Add a small status model in stores and keep screen-specific detailed result state local.

## Migration Plan

1. Introduce shared status-bar state and replace `OperationBar` with a sticky bottom component in the app shell.
2. Route operation progress, session changes, operation envelopes, and screen actions through the shared status model.
3. Refactor LargeBlobs into list/detail modes and remove page-bottom read/editor sections.
4. Refactor Lab result placement into step-owned result panels.
5. Rebuild Overview dashboard hierarchy and responsive layout.
6. Verify with frontend build, Wails build, desktop screenshots, and manual real-token flows for read/write/delete blob and makeCredential/getAssertion.
