# authenticator-overview Specification

## Purpose
TBD - created by archiving change build-authenticator-workbench. Update Purpose after archive.
## Requirements
### Requirement: Inspect Selected Authenticator
The system SHALL inspect the selected authenticator and display its device report and authenticator capability report.

#### Scenario: User opens overview with selected token
- **WHEN** the user navigates to the overview screen with an active authenticator
- **THEN** the system runs an inspection operation and displays the resulting device and authenticator information

### Requirement: Explain Capabilities Simply
The system SHALL translate technical authenticator capabilities into simple user-facing explanations while preserving access to raw technical details.

#### Scenario: Capability is supported
- **WHEN** inspection reports a supported capability such as resident credentials, large blobs, PIN, UV, biometrics, or authenticator configuration
- **THEN** the overview explains what the capability does in beginner-friendly language and marks it as available

#### Scenario: Capability is unsupported
- **WHEN** inspection reports that a capability is unavailable or unknown
- **THEN** the overview explains that the selected token cannot use that feature or that the app could not determine support

### Requirement: Keep Technical Details Available
The system SHALL include a detailed technical view of the selected authenticator's report for expert users.

#### Scenario: User opens technical details
- **WHEN** the user expands the technical details area
- **THEN** the system displays structured report data such as transport, vendor/product IDs, options, extensions, limits, algorithms, and relevant identifiers when available

### Requirement: React to Token Changes
The system SHALL update overview content when the active authenticator changes.

#### Scenario: User selects a different token
- **WHEN** the active authenticator selection changes
- **THEN** the overview clears stale inspection data and loads the report for the newly selected authenticator

