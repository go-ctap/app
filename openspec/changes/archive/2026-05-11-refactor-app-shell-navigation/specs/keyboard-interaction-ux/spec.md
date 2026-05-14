## ADDED Requirements

### Requirement: Route Navigation Preserves Keyboard Access
The system SHALL keep route-backed navigation and global session controls accessible from the keyboard.

#### Scenario: User tabs through navigation
- **WHEN** the user tabs through the sidebar navigation after route-backed navigation is introduced
- **THEN** each route item receives a visible focus state and can be activated with keyboard interaction.

#### Scenario: User tabs through top bar controls
- **WHEN** the user tabs through the authenticator selector, refresh action, and session lifecycle controls
- **THEN** focus order follows the visual order and every icon-only action exposes an accessible name.

#### Scenario: Route changes from keyboard activation
- **WHEN** the user activates a navigation item with the keyboard
- **THEN** the route changes and focus remains in a stable workbench area without opening an activity sheet or losing the active route indication.

### Requirement: Activity Footer Actions Preserve Focus
The system SHALL keep compact navigation footer actions keyboard-accessible without stealing focus during passive status updates.

#### Scenario: Activity status updates passively
- **WHEN** an operation progress event updates the navigation footer while focus is elsewhere
- **THEN** focus remains on the user's current control.

#### Scenario: User activates activity action
- **WHEN** the user focuses and activates a Retry, Cancel, or View Logs action in the navigation footer
- **THEN** the action runs through the existing controller path and focus moves only as required by the resulting workflow or route change.
