## ADDED Requirements

### Requirement: Selected session recovery is explicit
The system SHALL provide explicit selected-token session recovery actions without requiring navigation to a particular screen.

#### Scenario: Session is closed after locking
- **WHEN** a token remains selected and the user locks the session
- **THEN** the global shell shows the session as closed and offers an `Open session` action.

#### Scenario: User opens a closed session
- **WHEN** the user activates `Open session` for a selected token whose session is closed
- **THEN** the system opens or warms the selected-token session and updates global session state without switching screens.

#### Scenario: Session is stale or errored
- **WHEN** the selected-token session becomes stale or errored
- **THEN** the status bar shows the recovery message and offers the most relevant `Open session`, `Retry session`, or `Refresh devices` action.

### Requirement: Session lock wording is consistent
The system SHALL use `Lock session` as the user-facing action for closing the cached selected-token session.

#### Scenario: Ready session can be locked
- **WHEN** the selected-token session is ready and no operation is running
- **THEN** the device strip or status bar offers `Lock session` and does not show a separate `Clear session` action.

#### Scenario: Running session cannot be locked directly
- **WHEN** an operation is opening or running
- **THEN** the global session actions prioritize `Cancel` and do not offer `Lock session` until the operation completes or is canceled.

