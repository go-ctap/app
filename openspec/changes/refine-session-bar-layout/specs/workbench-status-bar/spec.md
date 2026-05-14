## MODIFIED Requirements

### Requirement: Sticky Bottom Feedback Bar
The system SHALL provide a compact navigation footer feedback surface for global operation feedback, session state, and recent important operation outcomes instead of a dedicated sticky bottom bar or right activity panel.

#### Scenario: Operation is running
- **WHEN** a backend token operation emits progress for an active operation ID
- **THEN** the navigation footer displays the current stage, optional progress counts, selected token context, and a Cancel action.

#### Scenario: Operation completes
- **WHEN** a backend token operation completes, fails, or is canceled
- **THEN** the navigation footer displays a concise outcome summary and keeps it visible long enough for the user to understand what happened.

#### Scenario: No active operation
- **WHEN** there is no active operation and no recent important outcome
- **THEN** the navigation footer displays compact session/token state or collapses to a low-emphasis idle state without occupying task content.

#### Scenario: Footer renders in constrained sidebar space
- **WHEN** the navigation footer is visible in the sidebar
- **THEN** it avoids a card-like bordered wrapper and prioritizes dense title and message text within the existing sidebar footer area.

#### Scenario: Detailed log context exists
- **WHEN** a current activity or outcome references a log entry
- **THEN** the navigation footer does not add a generic details button solely for that reference, and the Logs screen remains the detailed inspection surface.

### Requirement: Status Bar Recovery Actions
The system SHALL expose recovery and release actions in the top app bar or navigation footer when session or operation state requires user action.

#### Scenario: Session becomes stale or errored
- **WHEN** session status changes to stale or error
- **THEN** the shell displays the recovery message and offers Refresh or open/recover session when applicable.

#### Scenario: Persistent session should be released
- **WHEN** a selected or background session is open and holding an authenticator device descriptor
- **THEN** the top app bar exposes a close selected action and a grouped close all sessions menu action as applicable.

#### Scenario: Operation can be retried
- **WHEN** an operation fails from a recoverable runtime category
- **THEN** the navigation footer provides a Retry or View details action when the current screen can safely support it.
