# keyboard-interaction-ux Specification

## Purpose
TBD - created by archiving change refine-workbench-ux-and-sessions. Update Purpose after archive.
## Requirements
### Requirement: Submit PIN Prompt With Enter
The system SHALL allow users to submit PIN prompts from the keyboard.

#### Scenario: PIN prompt is focused
- **WHEN** the user enters a PIN and presses Enter
- **THEN** the prompt submits the PIN as the primary action

### Requirement: Cancel Dialogs With Escape
The system SHALL allow safe dialogs and prompts to be canceled or closed with Escape.

#### Scenario: Non-destructive dialog is open
- **WHEN** the user presses Escape
- **THEN** the dialog closes or sends a canceled interaction response

#### Scenario: Destructive confirmation is open
- **WHEN** the user presses Escape
- **THEN** the destructive action is not executed and the confirmation dialog is canceled

### Requirement: Submit Single-Line Forms With Enter
The system SHALL submit focused single-line forms with Enter when the action is unambiguous.

#### Scenario: Credential edit form is focused
- **WHEN** the user edits a single-line field and presses Enter
- **THEN** the form triggers its primary preview or submit action according to the current dialog state

### Requirement: Preserve Textarea Editing
The system SHALL avoid stealing plain Enter from multiline editors.

#### Scenario: Textarea is focused
- **WHEN** the user presses Enter inside a textarea
- **THEN** the textarea inserts a newline unless the user presses Ctrl+Enter or Command+Enter for the primary action

### Requirement: Manage Focus In Dialogs
The system SHALL move focus into dialogs and restore useful focus after closing.

#### Scenario: Prompt opens
- **WHEN** a PIN, confirmation, preview, or edit dialog opens
- **THEN** focus moves to the first meaningful input or primary action

#### Scenario: Prompt closes
- **WHEN** a dialog closes
- **THEN** focus returns to a stable invoking area when practical

### Requirement: Show Focus States
The system SHALL provide visible keyboard focus states for interactive controls.

#### Scenario: User tabs through controls
- **WHEN** the user navigates with Tab
- **THEN** buttons, inputs, selects, navigation tabs, and copy controls show visible focus outlines

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

### Requirement: Route Navigation Preserves Keyboard Access
The system SHALL keep route-backed navigation and global session controls accessible from the keyboard.

#### Scenario: User tabs through navigation
- **WHEN** the user tabs through the sidebar navigation after route-backed navigation is introduced
- **THEN** each route item receives a visible focus state and can be activated with keyboard interaction.

#### Scenario: User tabs through top bar controls
- **WHEN** the user tabs through the authenticator selector, refresh action, and session lifecycle controls
- **THEN** focus order follows the visual order and every icon-only action exposes an accessible name.

#### Scenario: Route changes from keyboard activation
- **WHEN** the user activates a navigation item with the keyboard
- **THEN** the route changes and focus remains in a stable workbench area without opening an activity sheet or losing the active route indication.

### Requirement: Activity Footer Actions Preserve Focus
The system SHALL keep compact navigation footer actions keyboard-accessible without stealing focus during passive status updates.

#### Scenario: Activity status updates passively
- **WHEN** an operation progress event updates the navigation footer while focus is elsewhere
- **THEN** focus remains on the user's current control.

#### Scenario: User activates activity action
- **WHEN** the user focuses and activates a Retry, Cancel, or View Logs action in the navigation footer
- **THEN** the action runs through the existing controller path and focus moves only as required by the resulting workflow or route change.

