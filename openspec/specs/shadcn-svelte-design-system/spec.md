# shadcn-svelte-design-system Specification

## Purpose
TBD - created by archiving change migrate-frontend-to-shadcn-svelte. Update Purpose after archive.
## Requirements
### Requirement: Frontend Runs On Svelte 5
The frontend SHALL be upgraded to Svelte 5-compatible runtime, compiler, Vite plugin, and component conventions as part of the shadcn-svelte migration.

#### Scenario: Frontend dependencies are installed
- **WHEN** the migration updates `frontend/package.json`
- **THEN** Svelte and the Svelte Vite plugin resolve to Svelte 5-compatible versions and the app no longer depends on Svelte 4 as its runtime baseline.

#### Scenario: Existing Svelte syntax remains temporarily
- **WHEN** a migrated or not-yet-migrated component still uses Svelte 4-style syntax that Svelte 5 supports
- **THEN** the component may remain temporarily compatible, but newly created shared UI components use Svelte 5-compatible patterns and do not rely on removed APIs.

### Requirement: Shadcn Svelte Is The Default UI System
The frontend SHALL compose user-facing controls, overlays, navigation, data display, empty states, feedback, and forms from current Svelte 5-compatible shadcn-svelte components or thin app-specific wrappers around them.

#### Scenario: New interactive UI is added
- **WHEN** a frontend screen or shared component needs a button, input, select, checkbox, tab, dialog, alert, badge, table/list, tooltip, toast, empty state, or progress indicator
- **THEN** the implementation uses an installed shadcn-svelte component or an app wrapper that delegates to shadcn-svelte primitives.

#### Scenario: Existing bespoke primitive has a shadcn-svelte equivalent
- **WHEN** a current custom component or CSS pattern is migrated and shadcn-svelte provides the same primitive
- **THEN** the custom primitive is removed or reduced to product-specific mapping logic rather than continuing as an independent visual system.

### Requirement: Semantic Theme Tokens
The frontend SHALL use Tailwind and shadcn-svelte semantic tokens for colors, radii, borders, focus rings, surfaces, and muted text.

#### Scenario: Component styling is implemented
- **WHEN** a migrated Svelte component needs visual styling
- **THEN** it uses semantic utility classes and component variants instead of hard-coded product colors in local component markup.

#### Scenario: Global theme is configured
- **WHEN** the frontend loads
- **THEN** global styles define the shadcn-svelte theme tokens in the app CSS entry used by `frontend/src/main.ts`.

### Requirement: Source Controlled Component Installation
The frontend SHALL keep shadcn-svelte generated component source in the repository under the configured `$lib/components/ui` path.

#### Scenario: A shadcn-svelte component is needed
- **WHEN** implementation requires a component that is not already present
- **THEN** the component is added through the shadcn-svelte CLI and the generated files are reviewed before use.

#### Scenario: Imports reference UI components
- **WHEN** frontend source imports shadcn-svelte UI
- **THEN** imports use the configured `$lib` aliases and do not reach into generated Wails bindings or node modules for UI primitives.

### Requirement: Wails Frontend Boundaries Are Preserved
The UI rewrite SHALL keep Wails generated bindings behind the existing frontend API/controller layer.

#### Scenario: A screen invokes token work
- **WHEN** a migrated screen needs discovery, selection, session recovery, inspection, credential, large-blob, config, lab, or log behavior
- **THEN** the screen calls the controller/API layer or store actions rather than importing raw generated Wails bindings directly.

#### Scenario: Wails events arrive
- **WHEN** operation progress, interaction requests, or session changes arrive from the Wails runtime
- **THEN** app shell wiring forwards them through the existing controller/store handling before UI components render the result.

