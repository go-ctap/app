## ADDED Requirements

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
