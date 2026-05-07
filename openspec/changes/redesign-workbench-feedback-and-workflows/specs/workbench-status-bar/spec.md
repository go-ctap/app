## ADDED Requirements

### Requirement: Sticky Bottom Feedback Bar
The system SHALL provide a sticky bottom status bar for global operation feedback, session state, and recent operation outcomes.

#### Scenario: Operation is running
- **WHEN** a backend token operation emits progress for an active operation ID
- **THEN** the bottom status bar displays the current stage, optional progress counts, selected token context, and a Cancel action.

#### Scenario: Operation completes
- **WHEN** a backend token operation completes, fails, or is canceled
- **THEN** the bottom status bar displays a concise outcome summary and keeps it visible long enough for the user to understand what happened.

#### Scenario: No active operation
- **WHEN** there is no active operation and no recent important outcome
- **THEN** the bottom status bar displays compact session/token state or collapses to a low-emphasis idle state without occupying task content.

### Requirement: Status Bar Recovery Actions
The system SHALL expose recovery actions in the bottom status bar when session or operation state requires user action.

#### Scenario: Session becomes stale or errored
- **WHEN** session status changes to stale or error
- **THEN** the bottom status bar displays the recovery message and offers Refresh or Clear session when applicable.

#### Scenario: Operation can be retried
- **WHEN** an operation fails from a recoverable runtime category
- **THEN** the bottom status bar provides a Retry or View details action when the current screen can safely support it.

### Requirement: Separate Summary From Details
The system SHALL keep the status bar as a summary surface and preserve detailed results in the relevant screen workflow.

#### Scenario: Detailed result exists
- **WHEN** a screen operation produces structured JSON, hex, preview, or read data
- **THEN** the bottom status bar summarizes the result and the active screen displays the detailed result near the initiating item or step.
