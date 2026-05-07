## ADDED Requirements

### Requirement: Show Token Configuration Status
The system SHALL display the selected authenticator's configuration status, support state, retry state, reset hints, and limits.

#### Scenario: User opens configuration screen
- **WHEN** the user opens the configuration screen with a selected authenticator
- **THEN** the system runs the configuration status operation and displays PIN, UV, biometrics, authenticator config, reset hints, and limits

### Requirement: Manage PIN
The system SHALL allow supported PIN set and change operations with dry-run preview, explicit confirmation, and secret-safe PIN handling.

#### Scenario: User sets a new PIN
- **WHEN** PIN is supported and not configured and the user submits a new PIN
- **THEN** the system previews the PIN set operation and executes it only after explicit confirmation

#### Scenario: User changes PIN
- **WHEN** PIN is configured and the user submits current and new PIN values
- **THEN** the system previews the PIN change operation and executes it only after explicit confirmation

### Requirement: Manage Authenticator Config
The system SHALL allow supported always-UV and minimum PIN length mutations with preview, warnings, and explicit confirmation.

#### Scenario: User changes always-UV
- **WHEN** always-UV configuration is supported and the user selects a new target state
- **THEN** the system previews the current and requested state before executing the confirmed operation

#### Scenario: User changes minimum PIN length
- **WHEN** minimum PIN length configuration is supported and the user submits a new length and optional RP IDs
- **THEN** the system previews the requested policy and executes it only after explicit confirmation

### Requirement: Manage Biometrics
The system SHALL display biometric enrollment state and allow supported enrollment rename and removal operations with previews and confirmations.

#### Scenario: User enrolls biometric sample
- **WHEN** biometric enrollment is supported and the user starts enrollment
- **THEN** the system shows sample capture progress until enrollment succeeds, fails, or is canceled

#### Scenario: User removes biometric enrollment
- **WHEN** the user confirms removal of a biometric template
- **THEN** the system runs the confirmed removal operation and refreshes biometric enrollment state

### Requirement: Guide Factory Reset
The system SHALL present factory reset as a guided destructive flow with warnings, reset hints, and explicit confirmation.

#### Scenario: User starts factory reset
- **WHEN** the user opens reset flow
- **THEN** the system displays reset warnings and token-specific reset hints before any confirmed reset operation can run

