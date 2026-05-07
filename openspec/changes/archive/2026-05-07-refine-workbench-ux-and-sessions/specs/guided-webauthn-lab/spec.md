## ADDED Requirements

### Requirement: Present Lab As Two-Step Workflow
The system SHALL present the WebAuthn lab as a guided two-step workflow where makeCredential is step one and getAssertion is step two.

#### Scenario: User opens lab screen
- **WHEN** the user opens the lab screen
- **THEN** the UI clearly shows step one for makeCredential and step two for getAssertion in a cohesive layout

### Requirement: Connect MakeCredential Result To GetAssertion
The system SHALL help the user carry a newly created credential into the getAssertion step.

#### Scenario: makeCredential succeeds
- **WHEN** makeCredential returns a credential ID
- **THEN** the lab offers to use that credential ID in the getAssertion allow list without requiring manual copy/paste

### Requirement: Separate Primary Forms From Artifact Inspectors
The system SHALL separate primary lab forms from normalized JSON/result inspectors so the workflow remains readable.

#### Scenario: User edits makeCredential fields
- **WHEN** the user edits RP, user, options, algorithms, challenge, or exclude list fields
- **THEN** the primary form remains visible and the normalized request artifact is shown in a secondary inspector area

#### Scenario: User inspects operation result
- **WHEN** a makeCredential or getAssertion result is available
- **THEN** the result is shown as concise key fields first with expandable raw JSON and copyable hex artifacts

### Requirement: Guide GetAssertion Inputs
The system SHALL make getAssertion usable after either a fresh makeCredential result or manual allow-list entry.

#### Scenario: No created credential exists
- **WHEN** the user has not run makeCredential in the current lab session
- **THEN** getAssertion allows manual allow-list entry and explains that an empty allow list asks the authenticator to select a matching credential

#### Scenario: Created credential exists
- **WHEN** a makeCredential result exists
- **THEN** getAssertion can populate the allow list from the created credential and uses the same RP ID by default

### Requirement: Keep Lab Responsive
The system SHALL keep the two-step lab usable on both wide desktop and narrower window sizes.

#### Scenario: Window width is narrow
- **WHEN** the lab screen is viewed in a narrow window
- **THEN** the two steps stack vertically while keeping step order, primary actions, and inspectors readable

