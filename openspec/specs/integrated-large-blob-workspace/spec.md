# integrated-large-blob-workspace Specification

## Purpose
TBD - created by archiving change redesign-workbench-feedback-and-workflows. Update Purpose after archive.
## Requirements
### Requirement: Large Blob Master Detail Workspace
The system SHALL present large-blob management as an integrated list/detail workspace for the selected credential.

#### Scenario: User selects a credential
- **WHEN** the user selects a credential from the large-blob list
- **THEN** the screen shows that credential's detail workspace with identity, blob state, actions, and raw details without moving the user to an unrelated lower page section.

#### Scenario: No credential is selected
- **WHEN** large-blob data is loaded but no credential is selected
- **THEN** the screen invites the user to choose a credential and keeps list scanning efficient.

### Requirement: Inline Read Results
The system SHALL display large-blob read results inside the selected credential workspace.

#### Scenario: User reads a blob
- **WHEN** the user runs Read for a credential
- **THEN** the selected credential workspace displays blob presence, byte count, decode mode, decoded content when available, raw hex copy action, and raw JSON details.

#### Scenario: User changes decode mode
- **WHEN** the user changes the decode mode for a selected credential with a read result
- **THEN** the workspace makes it clear whether the current displayed decoded content reflects the selected mode or requires re-reading.

### Requirement: Inline Mutation Preview And Confirmation
The system SHALL display write and delete previews inside the selected credential workspace before confirmation.

#### Scenario: User previews a write
- **WHEN** the user submits a large-blob payload for preview
- **THEN** the selected credential workspace displays the mutation preview, warning text, byte counts, and Confirm write action in the same pane.

#### Scenario: User previews a delete
- **WHEN** the user previews deletion for a credential
- **THEN** the selected credential workspace displays the delete preview and Confirm delete action in the same pane.

#### Scenario: Mutation succeeds
- **WHEN** a write or delete operation succeeds
- **THEN** the list refreshes, the selected credential workspace updates, and the bottom status bar summarizes the completed mutation.

### Requirement: Responsive Detail Placement
The system SHALL keep the selected credential detail connected to the selected row on both desktop and narrow windows.

#### Scenario: Desktop layout
- **WHEN** the window has enough horizontal space
- **THEN** the list and selected credential workspace appear side by side.

#### Scenario: Narrow layout
- **WHEN** the window is narrow
- **THEN** the selected credential workspace appears directly after or below the selected row, not at the far bottom after unrelated rows.

### Requirement: Large Blob Workspace Uses Shadcn Svelte Master Detail Components
The large-blob workspace SHALL compose its credential list, selected credential detail, blob state, actions, and raw details with shadcn-svelte-compatible data display, card, badge, tabs, form, dialog, alert, and disclosure components.

#### Scenario: User selects a credential after migration
- **WHEN** the user selects a credential from the migrated large-blob list
- **THEN** the selected credential workspace shows identity, blob state, actions, and raw details using the shared shadcn-svelte UI system without moving the user to an unrelated lower page section.

#### Scenario: No credential is selected after migration
- **WHEN** large-blob data is loaded but no credential is selected
- **THEN** the screen uses a shadcn-svelte-compatible empty state that invites selection while preserving efficient list scanning.

### Requirement: Large Blob Mutation Forms Use Shared Field Patterns
The large-blob workspace SHALL implement read, write, delete, decode, preview, and confirmation flows with shadcn-svelte-compatible fields, tabs/toggles, alerts, and dialogs.

#### Scenario: User previews a write after migration
- **WHEN** the user submits a large-blob payload for preview
- **THEN** the selected credential workspace displays mutation preview, warning text, byte counts, and Confirm write action using shared shadcn-svelte UI patterns.

#### Scenario: User reads a blob after migration
- **WHEN** the user runs Read for a credential
- **THEN** blob presence, byte count, decode mode, decoded content, raw hex copy action, and raw JSON details render in the selected credential workspace through shared migrated components.

