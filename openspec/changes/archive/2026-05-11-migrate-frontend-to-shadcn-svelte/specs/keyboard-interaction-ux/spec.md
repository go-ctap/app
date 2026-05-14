## ADDED Requirements

### Requirement: Shadcn Svelte Primitives Preserve Keyboard Behavior
The system SHALL preserve existing keyboard interaction requirements while migrating dialogs, tabs, selects, forms, menus, and disclosure controls to shadcn-svelte primitives.

#### Scenario: User submits a PIN interaction
- **WHEN** a PIN prompt implemented with the migrated dialog/form components is focused and the user presses Enter
- **THEN** the prompt submits the PIN as the primary action without exposing the PIN in logs, stores, JSON dumps, or debug surfaces.

#### Scenario: User cancels an interaction dialog
- **WHEN** a migrated PIN, confirmation, preview, edit, or non-destructive dialog is open and the user presses Escape
- **THEN** the dialog cancels or closes through the existing interaction response path and restores focus to a stable workbench area when practical.

#### Scenario: User tabs through migrated controls
- **WHEN** the user navigates through migrated buttons, inputs, selects, tabs, row actions, copy controls, and status bar actions with the keyboard
- **THEN** each focused control shows a visible shadcn-svelte/Tailwind focus state.

### Requirement: Form Composition Preserves Submit Semantics
The system SHALL use shadcn-svelte form, field, input, textarea, select, checkbox, and toggle patterns without weakening existing Enter and multiline editing behavior.

#### Scenario: Single-line migrated form is focused
- **WHEN** the user presses Enter in a focused single-line credential, config, blob, or lab form where the primary action is unambiguous
- **THEN** the form triggers its preview or submit action according to the current workflow state.

#### Scenario: Multiline migrated editor is focused
- **WHEN** the user presses Enter inside a migrated textarea for JSON, client data, blob payload, or other multiline content
- **THEN** the textarea inserts a newline unless the workflow explicitly supports Ctrl+Enter or Command+Enter for the primary action.

