## Context

The current shell uses shadcn-svelte primitives for the sidebar, top app bar, selector, and footer activity surface. The main workspace top bar is sticky but opaque, session actions are split into separate buttons, the background-session count reads like a generic badge, selector item icons currently conflate selection with open-session state, and the navigation footer spends space on card chrome plus a details action that duplicates the Logs destination.

Visual thesis: a quiet desktop workbench chrome with glass only at the scroll boundary, compact outlined controls, and session state presented as instrument-panel status rather than decorative badges.

Interaction thesis:
- The sticky top bar gains a subtle backdrop-blur/shadow state when workspace content scrolls underneath it.
- Session release actions collapse into a single grouped control so the common action stays immediate and destructive breadth is tucked into a menu.
- Selector icons communicate open/running/error/closed session ownership independently from the selected check mark.

## Goals / Non-Goals

**Goals:**
- Make the main top bar taller and less cramped while preserving the existing shell structure.
- Normalize control height, edge padding, and row alignment across selector, refresh, grouped session action, background count, and locale select.
- Use shadcn-svelte `ButtonGroup` and `DropdownMenu` composition for selected-session close plus close-all.
- Restyle background sessions as a rounded-square dashed-outline count indicator.
- Make selector item session-state icons reflect actual session state for each authenticator, not whether that row is selected.
- Simplify the sidebar footer into a dense activity/status area with direct actions only.

**Non-Goals:**
- Change backend session lifecycle semantics or Wails bindings.
- Add a new activity panel, bottom status bar, or persistent right rail.
- Redesign individual screen content outside the shell chrome.
- Introduce decorative gradients, heavy card layouts, or custom component systems outside shadcn-svelte composition.

## Decisions

1. Use grouped session actions instead of separate close buttons.
   - Decision: Render a `ButtonGroup.Root` in `TopSessionControls.svelte` with a primary outline button for closing the selected session and an adjacent icon dropdown trigger for secondary session actions such as close all sessions.
   - Rationale: Closing the selected session is the local action; closing all sessions is broader and belongs in a menu with clearer intent.
   - Alternative considered: Keep two visible buttons. This preserves discoverability but keeps the row crowded and visually uneven.

2. Keep the top bar sticky and add scroll-aware glass styling.
   - Decision: Increase the sidebar header and workspace header to a shared height, then apply `bg-background/75`, `supports-backdrop-filter:backdrop-blur`, and a subtle border/shadow state to the workspace header only when scrollable content passes beneath it.
   - Rationale: The glass effect belongs to the main scrolling surface, while the sidebar should stay stable and quiet.
   - Alternative considered: Always-on blur. This is simpler but makes the shell look hazy even when no content is under the bar.

3. Represent background sessions as a status counter, not a badge.
   - Decision: Replace the pill with a square-ish dashed outline element using fixed height, fixed or minimum width, centered count, and accessible title/label text.
   - Rationale: Background sessions are a resource ownership indicator, not a category label.
   - Alternative considered: Keep the text badge. It is readable but consumes horizontal space and competes with primary actions.

4. Separate selected item affordance from session-state affordance in the selector.
   - Decision: Pass enough session snapshots into `TokenSelect.svelte` to compute per-device session state. The left icon represents that row's session state, and the existing select check mark remains the selected-row indicator.
   - Rationale: Users need to see which authenticators are held by open sessions even when those authenticators are not selected.
   - Alternative considered: Continue using selected-state icons. This makes selected identity clear but hides background ownership.

5. Treat the sidebar footer as inline activity, not a card.
   - Decision: Remove the card-like border/background wrapper and omit the generic details button from the compact footer. Keep progress, cancellation, retry, refresh, and open-session actions when directly useful; route detailed inspection through Logs when the user explicitly navigates there.
   - Rationale: The footer is constrained sidebar real estate and should maximize status text, not duplicate details navigation.
   - Alternative considered: Keep details as a small icon button. This still spends scarce space on an action the user identified as low value.

## Risks / Trade-offs

- Scroll-aware glass can be hard to verify in Wails if tested only through Vite/browser preview. Mitigation: use local build checks, then ask for manual Wails dev smoke testing in the real desktop window.
- Installing `button-group` and `dropdown-menu` can touch generated shadcn component files. Mitigation: use the shadcn-svelte CLI from `frontend/` and keep product edits in shell components.
- Per-device session icons depend on matching session snapshots back to device identifiers. Mitigation: centralize matching in `TokenSelect.svelte` or a small helper and reuse existing selector/device ID logic.
- Removing the details button reduces one-click log access from the footer. Mitigation: keep Logs navigation as the detailed event history surface and preserve retry/cancel/recovery actions in the footer.
