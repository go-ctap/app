## Context

`fidoapp` is a Wails 3 desktop workbench whose frontend is currently a Svelte 4/Vite SPA. The current UI uses a single large custom CSS file plus small bespoke components for badges, empty states, dialogs, operation panels, copy controls, JSON views, and screen layout. That has been enough for a greenfield workbench, but the app now has repeated patterns across token selection, session recovery, resident credentials, large blobs, configuration, WebAuthn lab flows, logs, global operation feedback, and interaction prompts.

The target frontend foundation is Svelte 5 plus the current shadcn-svelte/Tailwind v4 stack, not React shadcn/ui and not the Svelte 4 legacy shadcn-svelte docs. The implementation should follow the official Vite setup: add Tailwind CSS through the Svelte CLI, configure `$lib` aliases in TypeScript and Vite, initialize `components.json`, and add shadcn-svelte components into source-controlled `src/lib/components/ui/**`. The Wails runtime plugin and generated bindings remain part of the Vite app.

This change runs alongside `clarify-session-refresh-workflows`. The UI rewrite must preserve that work's controller/store boundary and user-facing session/refresh semantics rather than reintroducing raw binding calls in screens.

## Goals / Non-Goals

**Goals:**

- Make shadcn-svelte and Tailwind semantic tokens the default way to build frontend UI.
- Upgrade the Wails frontend to Svelte 5 while allowing gradual syntax migration where Svelte 5 compatibility permits it.
- Replace all custom screen-level UI primitives with shadcn-svelte components or thin app wrappers around them.
- Keep screens focused on composition and user workflows, with Wails calls and state transitions in `frontend/src/lib/controller.ts`, `stores.ts`, and `api.ts`.
- Preserve current authenticator behavior, session safety, interaction handling, and operation progress semantics.
- Improve accessibility by relying on shadcn-svelte dialog, tabs, form, select, tooltip, and focus primitives where they fit.
- Keep the desktop workbench dense, scannable, and utilitarian rather than turning it into a marketing-style interface.

**Non-Goals:**

- No backend rewrite, CTAP behavior change, generated binding redesign, or `ctapkit` API migration.
- No dark theme toggle unless it naturally falls out of shadcn-svelte tokens and is explicitly designed later.
- No switch from Vite/Wails to SvelteKit.
- No broad state-management replacement; stores/controllers can be shaped for UI needs, but the boundary remains.

## Decisions

### Use shadcn-svelte CLI Output As Owned Source

Add components with `npx shadcn-svelte@latest add ...` and commit the generated Svelte files under `frontend/src/lib/components/ui/**`.

Rationale: shadcn-svelte components are intended to become project-owned source. This keeps the app debuggable inside Wails and lets the workbench tune composition without wrapping a black-box component library.

Alternatives considered:

- Use the React shadcn CLI: rejected because the app is Svelte.
- Use a packaged component library only: rejected because it would not give the same source ownership and shadcn-svelte ecosystem fit.

### Upgrade To Svelte 5 As Part Of The Rewrite

Upgrade `svelte`, `@sveltejs/vite-plugin-svelte`, TypeScript-facing Svelte types, and related frontend dependencies before installing the current shadcn-svelte component set. Existing components can be made Svelte 5-compatible incrementally, but newly written shared UI and migrated screens should prefer Svelte 5 conventions where practical.

Rationale: current shadcn-svelte documentation targets Svelte 5 and Tailwind v4, while Svelte 4 is legacy. A full UI rewrite is the least painful time to cross that boundary.

Alternatives considered:

- Stay on Svelte 4 first, then migrate later: rejected because it would force a second major frontend migration soon after the shadcn-svelte rewrite.
- Convert every component to runes syntax before changing UI: rejected because Svelte 5 supports a gradual migration path, and the product-facing UI rewrite is the primary objective.

### Keep `$lib` As The Import Alias

Configure `frontend/tsconfig.json` and `frontend/vite.config.js` so `$lib` resolves to `frontend/src/lib`, then configure shadcn-svelte aliases around `$lib`, `$lib/components`, `$lib/components/ui`, `$lib/utils`, and `$lib/hooks`.

Rationale: shadcn-svelte documentation uses `$lib`, and Svelte developers expect that shape. It also keeps UI imports distinct from Wails generated bindings.

Alternatives considered:

- Use `@/`: common in React/Vite projects, but less idiomatic for Svelte and unnecessary here.
- Use relative imports everywhere: rejected because generated component folders and app wrappers would become brittle.

### Build App Wrappers For Product Semantics

Use raw shadcn-svelte primitives for generic controls, but keep app-specific wrappers for concepts such as token identity, session state, operation progress, copyable protocol IDs, raw artifact disclosure, mutation previews, and interaction prompts.

Rationale: shadcn-svelte should supply accessible primitives and visual consistency; `fidoapp` still needs product language for CTAP/FIDO workflows.

Alternatives considered:

- Replace every local component with direct shadcn-svelte usage: rejected because it would duplicate product-specific mapping logic across screens.
- Keep existing custom components and only restyle them: rejected because it would leave the project with two UI systems.

### Migrate Screen By Screen Behind A Shared Shell

Start with Tailwind/shadcn setup and the app shell, then migrate reusable components, then migrate screens in this order: Overview, Credentials, LargeBlobs, Config, Lab, Logs, and finally cleanup.

Rationale: the shell establishes tokens, navigation, token/session affordances, interaction prompts, toasts, and the sticky status bar. Each screen can then be moved to the same primitives while preserving working behavior.

Alternatives considered:

- Rewrite all files in one pass: possible but higher risk because compile and Wails runtime issues become harder to isolate.
- Leave shell for last: rejected because all screens depend on shared layout, session affordances, and status presentation.

### Preserve Wails Runtime Verification

Use `npm run build` for frontend compilation, then run `wails3 dev` or `task dev` and inspect the printed Wails URL in the in-app browser for visual and interaction checks.

Rationale: plain Vite preview does not exercise the Wails runtime, bindings, or desktop shell constraints.

Alternatives considered:

- Verify only with Vite build: rejected because Wails event wiring and runtime affordances are part of the UI.

## Risks / Trade-offs

- [Risk] Svelte 5 introduces runtime and syntax changes that can interact with existing Svelte 4 components. -> Mitigation: upgrade dependencies first, use the official migration path where useful, and let old syntax remain temporarily only when it is Svelte 5-compatible.
- [Risk] shadcn-svelte may pull in Tailwind v4/token conventions that conflict with the current single CSS file. -> Mitigation: replace custom styling deliberately, keep semantic tokens in one global CSS entry, and remove obsolete selectors only after migrated screens compile.
- [Risk] Generated component APIs may differ from memory or examples. -> Mitigation: use the shadcn-svelte CLI and inspect generated files before composing screens.
- [Risk] Dialog and interaction prompt migration could accidentally leak secrets or change cancel behavior. -> Mitigation: keep prompt values local to the interaction component, preserve existing controller responses, and test PIN/confirmation submit/cancel paths.
- [Risk] Rewriting every screen can obscure regressions in session refresh behavior. -> Mitigation: keep `controller.ts` and stores as the action boundary and cross-check against the active `clarify-session-refresh-workflows` change during implementation.
- [Risk] The component set can grow too large if every possible shadcn-svelte component is added. -> Mitigation: add only components needed by the workbench surfaces, then add more as screens require them.

## Migration Plan

1. Upgrade the frontend toolchain to Svelte 5-compatible packages and confirm the existing app can compile or expose migration errors clearly.
2. Initialize frontend UI infrastructure: Tailwind v4, aliases, `components.json`, `cn`, global tokens, icon package, and the initial current shadcn-svelte component set.
3. Build the shell with shadcn-svelte navigation, token select, session controls, app error alert, interaction dialog, toast/status surfaces, and Wails-safe drag/no-drag regions.
4. Convert shared app components to shadcn-svelte wrappers and delete obsolete bespoke primitives as their call sites move.
5. Convert all screens while preserving controller/store calls and current operation flows.
6. Clean up `app.css`, unused components, dead selectors, and dependency drift.
7. Verify with `cd frontend; npm run build`, then Wails dev runtime in the in-app browser. Run Go tests if frontend API/controller changes touch backend-facing behavior.

Rollback is a git rollback of the frontend migration commit(s). Because backend contracts and generated bindings are not intended to change, rollback should not require authenticator or `ctapkit` changes.

## Open Questions

- Which shadcn-svelte base color should be selected during `components.json` setup? Default to Slate unless the user asks for a different neutral.
- Should the implementation keep the current Inter font asset or rely on system fonts through shadcn-svelte tokens? Default to keeping Inter if it remains visually clean and build-friendly.
