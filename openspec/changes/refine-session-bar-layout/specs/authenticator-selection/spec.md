## MODIFIED Requirements

### Requirement: Discover Available Authenticators
The system SHALL discover local hardware authenticators through the backend token runtime and present each authenticator with enough identity and session information to choose between multiple devices.

#### Scenario: No authenticator is connected
- **WHEN** the user opens the application or refreshes the device list with no reachable authenticators
- **THEN** the system displays an empty-token state and disables token-dependent actions.

#### Scenario: Multiple authenticators are connected
- **WHEN** discovery returns more than one authenticator
- **THEN** the top bar selector lists every authenticator with ordinal alias, product, manufacturer, serial when available, transport, and a per-row session-state icon.

#### Scenario: A listed authenticator has an open session
- **WHEN** an authenticator row represents a ready open session
- **THEN** the selector row displays the session-state icon in green even when that row is not currently selected.

#### Scenario: A listed authenticator is selected
- **WHEN** an authenticator row is the active selection
- **THEN** the selector uses the select component's selected-row check mark to show selection rather than relying on the session-state icon.

#### Scenario: A listed authenticator is not open
- **WHEN** an authenticator row has no open session or has a closed session
- **THEN** the selector row does not show the green open-session icon merely because the row is selected.
