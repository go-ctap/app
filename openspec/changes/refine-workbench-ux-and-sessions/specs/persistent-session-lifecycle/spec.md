## ADDED Requirements

### Requirement: Reuse Selected Authenticator Session
The system SHALL reuse a healthy `ctapkit.Session` for the selected authenticator across multiple operations.

#### Scenario: User runs multiple operations on same token
- **WHEN** the user runs inspection, credential listing, config status, or lab operations on the same selected authenticator
- **THEN** the backend reuses the existing session when it is healthy instead of opening and closing a new session for every command

### Requirement: Preserve Session Cache
The system SHALL preserve backend session cache across normal operations for the selected token.

#### Scenario: PIN or UV permission was already granted
- **WHEN** a later operation can reuse cached session permission according to `ctapkit`
- **THEN** the app does not force a fresh PIN, biometric scan, or UV prompt merely because a new command started

### Requirement: Close Session On Token Change
The system SHALL close the current session when the active authenticator selection changes.

#### Scenario: User selects another token
- **WHEN** the user changes the active token in the top bar
- **THEN** the backend closes the previous token session and opens or prepares a session for the newly selected token

### Requirement: Invalidate Stale Sessions Safely
The system SHALL detect stale, invalid, disconnected, reset, or mismatched sessions and recover without running operations against the wrong token.

#### Scenario: Selected token is unplugged
- **WHEN** the selected authenticator disappears from discovery or a run returns invalid session/state
- **THEN** the system marks session state as stale or closed, clears the selected session handle, and prompts the user to refresh or reconnect

#### Scenario: Factory reset completes
- **WHEN** a confirmed factory reset succeeds
- **THEN** the system closes the existing session and requires rediscovery before further operations

### Requirement: Expose Session State And Lock Action
The system SHALL show selected-token session state and allow the user to explicitly close the current session.

#### Scenario: Session is ready
- **WHEN** a selected-token session is open and healthy
- **THEN** the top bar or device strip displays a ready/cached session state and a lock/close-session action

#### Scenario: User locks session
- **WHEN** the user activates the lock/close-session action
- **THEN** the backend closes the current session, clears cached session state, and keeps the selected token visible

### Requirement: Serialize Operations Per Session
The system SHALL allow at most one running token operation per selected session.

#### Scenario: Operation is running
- **WHEN** an operation is already running on the selected session
- **THEN** additional token operation requests are disabled or rejected with a clear busy state until the current operation completes or is canceled

