# large-blob-management Specification

## Purpose
TBD - created by archiving change build-authenticator-workbench. Update Purpose after archive.
## Requirements
### Requirement: List Large Blob State
The system SHALL list large-blob state for credentials on the selected authenticator.

#### Scenario: User opens large blobs screen
- **WHEN** the user opens the large blobs screen with a selected authenticator
- **THEN** the system displays credential-linked blob state, blob presence, byte count, relying party, user identity, and support information

### Requirement: Read Large Blob Contents
The system SHALL allow the user to read a large blob for a credential and choose an available decode mode.

#### Scenario: Blob is present
- **WHEN** the user reads a credential's large blob
- **THEN** the system displays raw hex, byte count, decoded status, and decoded content when the selected decode mode succeeds

#### Scenario: Blob is missing
- **WHEN** the selected credential has no blob
- **THEN** the system reports the missing state without treating it as an application failure

### Requirement: Write Large Blob Contents
The system SHALL allow the user to create or replace large-blob contents only after preview and explicit confirmation.

#### Scenario: User previews large blob write
- **WHEN** the user submits new blob payload content
- **THEN** the system shows the mutation preview including operation type, current/proposed byte counts, array size changes, and warnings

#### Scenario: User confirms large blob write
- **WHEN** the user confirms the previewed write
- **THEN** the system runs the confirmed write operation and refreshes large-blob state after success

### Requirement: Delete Large Blob Contents
The system SHALL allow the user to delete a large blob only after preview and explicit confirmation.

#### Scenario: User confirms large blob deletion
- **WHEN** the user confirms a previewed delete operation
- **THEN** the system runs the confirmed delete operation and refreshes large-blob state after success

