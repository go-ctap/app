# integrated-lab-results Specification

## Purpose
TBD - created by archiving change redesign-workbench-feedback-and-workflows. Update Purpose after archive.
## Requirements
### Requirement: Step Owned Lab Results
The system SHALL display WebAuthn lab previews and operation results inside the step that produced them.

#### Scenario: User previews makeCredential
- **WHEN** the user previews makeCredential
- **THEN** the makeCredential step displays the preview result, normalized input summary, warnings, and next action without requiring the user to scroll below the workflow.

#### Scenario: User runs makeCredential
- **WHEN** makeCredential succeeds or fails
- **THEN** the makeCredential step displays the success or error result, important artifacts, copy actions, and raw details in that step's result area.

#### Scenario: User runs getAssertion
- **WHEN** getAssertion succeeds or fails
- **THEN** the getAssertion step displays the assertion result, signature/client data/authenticator data summaries, copy actions, and raw details in that step's result area.

### Requirement: Lab Result Status Integration
The system SHALL integrate lab operations with the sticky bottom status bar.

#### Scenario: Lab operation is active
- **WHEN** a lab operation is running
- **THEN** the bottom status bar shows the active lab operation stage and offers Cancel.

#### Scenario: Lab operation finishes
- **WHEN** a lab operation completes
- **THEN** the bottom status bar summarizes the outcome and offers a contextual action to focus the relevant step result.

### Requirement: Credential Handoff Visibility
The system SHALL make the makeCredential-to-getAssertion handoff explicit and local to the lab workflow.

#### Scenario: Created credential is available
- **WHEN** makeCredential returns a credential ID
- **THEN** the makeCredential result area displays the credential ID, copy action, and a clear action to populate getAssertion allow list.

#### Scenario: Allow list is populated
- **WHEN** the user populates getAssertion from a created credential
- **THEN** the getAssertion step visibly updates and the status bar confirms the handoff.

### Requirement: Preserve Expert Inspection
The system SHALL keep raw normalized inputs and raw operation outputs available without making them the primary visual result.

#### Scenario: User opens raw details
- **WHEN** the user expands technical details in a lab step
- **THEN** the system displays the raw JSON/hex artifacts associated with that step.

