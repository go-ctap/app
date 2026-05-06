## ADDED Requirements

### Requirement: List Resident Credentials
The system SHALL list resident credentials for the selected authenticator using the backend credential inventory operation.

#### Scenario: Credentials are available
- **WHEN** the user opens the resident credentials screen with a selected authenticator
- **THEN** the system displays credentials grouped by relying party with credential ID, user ID, name, display name, transports, protection metadata, and large-blob key state when available

#### Scenario: Credential management is unsupported
- **WHEN** the inventory report indicates credential management is unsupported or preview-only
- **THEN** the system explains the support state and disables unsupported mutation actions

### Requirement: Delete Resident Credential
The system SHALL allow the user to delete a resident credential only after preview and explicit confirmation.

#### Scenario: User previews credential deletion
- **WHEN** the user starts deletion for a credential
- **THEN** the system shows the backend deletion preview, warnings, target relying party, and target user before execution

#### Scenario: User confirms credential deletion
- **WHEN** the user confirms the previewed deletion
- **THEN** the system runs the confirmed deletion operation and refreshes the credential inventory after success

### Requirement: Update Resident Credential User Metadata
The system SHALL allow the user to update editable user metadata for a resident credential only after preview and explicit confirmation.

#### Scenario: User updates credential display name
- **WHEN** the user submits new user metadata for a credential
- **THEN** the system previews the update and displays the current and proposed values before execution

#### Scenario: Update succeeds
- **WHEN** the confirmed metadata update operation succeeds
- **THEN** the system refreshes the credential inventory and shows the updated values

### Requirement: Handle Credential Interactions
The system SHALL support PIN, UV, touch, and confirmation prompts required by credential operations.

#### Scenario: Backend requests PIN for credential management
- **WHEN** the backend requests a PIN during credential listing or mutation
- **THEN** the system prompts for the PIN without storing it after the interaction response is sent

