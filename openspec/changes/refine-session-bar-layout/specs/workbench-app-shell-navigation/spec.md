## MODIFIED Requirements

### Requirement: Unified Top Chrome
The system SHALL align the sidebar header and top app bar so they read as a single continuous top chrome with enough vertical space for the rich authenticator selector and adjacent controls.

#### Scenario: Desktop shell renders top regions
- **WHEN** the sidebar header and workspace top bar are visible
- **THEN** they share matching height, compatible background tone, border treatment, and vertical alignment.

#### Scenario: Sidebar is collapsed
- **WHEN** the sidebar is collapsed to icon width
- **THEN** the collapsed sidebar header remains height-aligned with the top app bar and does not create a visual step or misaligned border.

#### Scenario: Header content is too long
- **WHEN** app title, subtitle, selected token name, selector metadata, or locale text is too long for the available top chrome width
- **THEN** text truncates or hides according to responsive rules without changing the shared top chrome height.

#### Scenario: Workspace content scrolls under the top bar
- **WHEN** the main workspace content is scrolled beneath the sticky top app bar
- **THEN** the workspace top bar uses a subtle glass treatment with translucent background, backdrop blur when supported, and enough boundary contrast to separate chrome from content.

#### Scenario: Workspace content is at the top
- **WHEN** no workspace content has scrolled beneath the sticky top app bar
- **THEN** the workspace top bar keeps the calm base background and does not show unnecessary glass emphasis.

#### Scenario: Top bar controls render together
- **WHEN** the authenticator selector, refresh action, session controls, background-session indicator, and locale selector are visible
- **THEN** each control uses a consistent control height, aligned centerline, and matching horizontal inset from the top bar edges.

### Requirement: Top Bar Session Controls
The system SHALL place selected-authenticator persistent session lifecycle controls in the top app bar near the authenticator selector using a compact grouped action pattern.

#### Scenario: Rich selector displays selected token identity
- **WHEN** an authenticator is selected
- **THEN** the top bar selector displays the token display name, serial number or selector, transport as a compact pill, and a session-state icon before the token name.

#### Scenario: Authenticator selection owns a persistent session
- **WHEN** the user selects an authenticator under the current workbench session model
- **THEN** the top bar represents the selected authenticator as having persistent session ownership that can hold the device descriptor until released.

#### Scenario: Selected session can be opened or recovered
- **WHEN** the selected authenticator has a closed, stale, or errored session state
- **THEN** the top bar offers an open or recover session action with an accessible label and disabled state that reflects current operation busy state.

#### Scenario: Selected session can be closed
- **WHEN** the selected authenticator has a ready session
- **THEN** the right side of the top bar offers a close selected session action as the primary button in a grouped session control without requiring the user to open a secondary activity panel.

#### Scenario: All sessions can be released
- **WHEN** selected or background authenticator sessions are open
- **THEN** the grouped session control exposes close all sessions as a dropdown menu item with an accessible label and disabled state that reflects current operation busy state.

#### Scenario: Background sessions exist
- **WHEN** sessions for non-selected authenticators are open or recoverable
- **THEN** the right side of the top bar displays the background open-session count as a compact rounded-square dashed outline indicator and exposes a close all sessions action without making background sessions part of the primary workspace.

#### Scenario: User refreshes discovery
- **WHEN** the user needs to refresh authenticator discovery
- **THEN** the top bar provides a Refresh action immediately next to the selector.

### Requirement: Background Session Ownership
The system SHALL treat multiple open authenticator sessions as intentional background resource ownership that remains visible and releasable from the shell.

#### Scenario: Multiple sessions are open
- **WHEN** the selected authenticator has a session and one or more non-selected authenticators also have sessions
- **THEN** the shell distinguishes the selected session from background sessions and shows a compact dashed-outline background-session count on the right side of the top bar.

#### Scenario: User releases background sessions
- **WHEN** the user activates close all sessions from the grouped session menu
- **THEN** the app closes selected and background sessions through the existing controller path and updates the shell status without requiring navigation to a specific screen.

#### Scenario: Background session monopolizes an authenticator
- **WHEN** an authenticator is held by a background session and cannot be used elsewhere until released
- **THEN** the shell provides enough context for the user to identify the open background ownership and release it.
