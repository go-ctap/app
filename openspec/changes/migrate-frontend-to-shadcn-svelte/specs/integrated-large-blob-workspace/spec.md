## ADDED Requirements

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

