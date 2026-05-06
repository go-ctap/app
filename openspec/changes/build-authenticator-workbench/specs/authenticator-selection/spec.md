## ADDED Requirements

### Requirement: Discover Available Authenticators
The system SHALL discover local hardware authenticators through the backend token runtime and present each authenticator with enough identity information to choose between multiple devices.

#### Scenario: No authenticator is connected
- **WHEN** the user opens the application or refreshes the device list with no reachable authenticators
- **THEN** the system displays an empty-token state and disables token-dependent actions

#### Scenario: Multiple authenticators are connected
- **WHEN** discovery returns more than one authenticator
- **THEN** the top bar selector lists every authenticator with ordinal alias, product, manufacturer, serial when available, and transport

### Requirement: Select Active Authenticator
The system SHALL maintain one active authenticator selection for all token-dependent screens and operations.

#### Scenario: Single authenticator is discovered
- **WHEN** discovery returns exactly one authenticator and no active selection exists
- **THEN** the system selects that authenticator automatically

#### Scenario: User changes selected authenticator
- **WHEN** the user chooses another authenticator in the top bar selector
- **THEN** all token-dependent screens use the newly selected authenticator for subsequent operations

### Requirement: Refresh Selection Safely
The system SHALL let the user refresh the discovery snapshot without silently running operations against a stale or missing authenticator.

#### Scenario: Selected authenticator is removed
- **WHEN** the user refreshes and the previously selected authenticator is no longer discovered
- **THEN** the system clears the active selection and shows a reconnect or choose-token state

### Requirement: Surface Operation Progress
The system SHALL show backend operation progress and interaction states emitted while opening devices and running token operations.

#### Scenario: Operation emits progress events
- **WHEN** a token operation emits progress stages
- **THEN** the system displays the current stage in a global operation status area associated with the active operation

