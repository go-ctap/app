## ADDED Requirements

### Requirement: Replace Bespoke Visual Primitives With Shadcn Svelte
The system SHALL preserve the refined light-theme workbench direction while replacing bespoke cards, buttons, badges, empty states, dialogs, tables, and layout primitives with shadcn-svelte components or app wrappers.

#### Scenario: A migrated screen renders primary content
- **WHEN** any main workbench screen is displayed after the migration
- **THEN** its primary surfaces use shadcn-svelte composition and no longer depend on the old custom `.capability`, `.list-section`, `.empty-state`, `.modal`, `.status-badge`, or equivalent bespoke styling as independent primitives.

#### Scenario: Unsupported or unavailable states render
- **WHEN** a token capability, credential feature, blob state, or lab result is unavailable
- **THEN** the UI presents the state with shadcn-svelte-compatible Badge, Alert, Empty, or muted content patterns without oversized decorative panels.

### Requirement: Preserve Dense Desktop Workbench Layout
The system SHALL keep a dense, scannable desktop workbench layout after the component migration.

#### Scenario: Desktop window displays repeated data
- **WHEN** credential rows, blob rows, logs, capability groups, or protocol details are shown on a desktop viewport
- **THEN** the layout supports scanning and comparison without marketing-style hero sections or decorative card-heavy spacing.

#### Scenario: Narrow window displays repeated data
- **WHEN** the Wails window is narrow
- **THEN** migrated shadcn-svelte surfaces wrap or stack without text overlap, clipped controls, or horizontal page scrolling.

