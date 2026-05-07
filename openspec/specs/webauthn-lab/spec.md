# webauthn-lab Specification

## Purpose
TBD - created by archiving change build-authenticator-workbench. Update Purpose after archive.
## Requirements
### Requirement: Build MakeCredential Input
The system SHALL provide a manual lab form for constructing a WebAuthn makeCredential operation.

#### Scenario: User edits makeCredential fields
- **WHEN** the user edits RP, user, clientDataJSON, public key algorithms, exclude list, or authenticator options
- **THEN** the system validates required fields and shows the normalized operation input that will be sent to the backend

### Requirement: Run MakeCredential
The system SHALL run makeCredential against the selected authenticator only after preview and explicit confirmation.

#### Scenario: User previews makeCredential
- **WHEN** the user submits a valid makeCredential input
- **THEN** the system displays the backend preview including RP, user, algorithms, exclude list, options, and warnings

#### Scenario: makeCredential succeeds
- **WHEN** the user confirms and the backend creates a credential
- **THEN** the system displays credential ID, format, public key COSE hex, authenticator data hex, attestation object CBOR hex, AAGUID when available, sign count, and UP/UV flags

### Requirement: Build GetAssertion Input
The system SHALL provide a manual lab form for constructing a WebAuthn getAssertion operation.

#### Scenario: User edits getAssertion fields
- **WHEN** the user edits RP ID, clientDataJSON, allow list, or authenticator options
- **THEN** the system validates required fields and shows the normalized operation input that will be sent to the backend

### Requirement: Run GetAssertion
The system SHALL run getAssertion against the selected authenticator and display all returned assertions.

#### Scenario: getAssertion succeeds
- **WHEN** the backend returns one or more assertions
- **THEN** the system displays each assertion's credential descriptor, authenticator data hex, signature hex, user identity when returned, credential count metadata, sign count, and UP/UV flags

### Requirement: Preserve Raw Lab Artifacts
The system SHALL allow users to inspect and reuse raw request and response artifacts from lab operations.

#### Scenario: User opens raw result view
- **WHEN** a lab operation has completed
- **THEN** the system displays a structured JSON result view and copyable hex fields for generated credentials or assertions

