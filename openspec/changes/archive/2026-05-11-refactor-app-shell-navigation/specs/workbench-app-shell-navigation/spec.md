## ADDED Requirements

### Requirement: Rail Free Workbench Shell
The system SHALL provide a workbench shell without a persistent right activity rail or mobile activity sheet.

#### Scenario: Desktop workbench renders a selected authenticator
- **WHEN** a user opens the workbench with at least one authenticator available
- **THEN** the main screen uses the available width for the active workspace and does not reserve a right-side activity column.

#### Scenario: Narrow workbench renders a selected authenticator
- **WHEN** the Wails window is narrow or mobile-width
- **THEN** the shell does not expose an activity sheet trigger and keeps global status/actions in the top bar and navigation footer.

### Requirement: Unified Top Chrome
The system SHALL align the sidebar header and top app bar so they read as a single continuous top chrome.

#### Scenario: Desktop shell renders top regions
- **WHEN** the sidebar header and workspace top bar are visible
- **THEN** they share matching height, background tone, border treatment, and vertical alignment.

#### Scenario: Sidebar is collapsed
- **WHEN** the sidebar is collapsed to icon width
- **THEN** the collapsed sidebar header remains height-aligned with the top app bar and does not create a visual step or misaligned border.

#### Scenario: Header content is too long
- **WHEN** app title, subtitle, selected token name, or selector metadata is too long for the available top chrome width
- **THEN** text truncates or hides according to responsive rules without changing the shared top chrome height.

### Requirement: Top Bar Session Controls
The system SHALL place selected-authenticator persistent session lifecycle controls in the top app bar near the authenticator selector.

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
- **THEN** the right side of the top bar offers a close selected session action without requiring the user to open a secondary activity panel.

#### Scenario: Background sessions exist
- **WHEN** sessions for non-selected authenticators are open or recoverable
- **THEN** the right side of the top bar displays the background open-session count and exposes a close all sessions action without making background sessions part of the primary workspace.

#### Scenario: User refreshes discovery
- **WHEN** the user needs to refresh authenticator discovery
- **THEN** the top bar provides a Refresh action immediately next to the selector.

### Requirement: Background Session Ownership
The system SHALL treat multiple open authenticator sessions as intentional background resource ownership that remains visible and releasable from the shell.

#### Scenario: Multiple sessions are open
- **WHEN** the selected authenticator has a session and one or more non-selected authenticators also have sessions
- **THEN** the shell distinguishes the selected session from background sessions and shows a compact background-session count on the right side of the top bar.

#### Scenario: User releases background sessions
- **WHEN** the user activates close all sessions
- **THEN** the app closes selected and background sessions through the existing controller path and updates the shell status without requiring navigation to a specific screen.

#### Scenario: Background session monopolizes an authenticator
- **WHEN** an authenticator is held by a background session and cannot be used elsewhere until released
- **THEN** the shell provides enough context for the user to identify the open background ownership and release it.

### Requirement: Navigation Footer Activity
The system SHALL present current operation, latest important outcome, and session recovery status in a compact navigation footer activity surface.

#### Scenario: Operation is running
- **WHEN** a backend operation emits progress for the current operation
- **THEN** the navigation footer displays the operation title, current stage or concise message, selected authenticator context when available, and a cancel action when cancellation is supported.

#### Scenario: Operation completes
- **WHEN** an operation completes, fails, or is canceled
- **THEN** the navigation footer displays a concise outcome summary and any safe retry or view-log action associated with the outcome.

#### Scenario: No important activity exists
- **WHEN** there is no running operation and no recent important outcome or recovery state
- **THEN** the navigation footer renders a low-emphasis idle/session summary without expanding the navigation width or main workspace layout.

### Requirement: Logs Own Event History
The system SHALL keep event history in the Logs screen rather than rendering Recent Events in the app shell.

#### Scenario: Recent events would previously render in the shell
- **WHEN** workbench log entries exist
- **THEN** the app shell does not render a Recent Events list, and the Logs navigation destination remains the place to inspect event history.

#### Scenario: Activity outcome has detailed log context
- **WHEN** a current activity or outcome references a log entry
- **THEN** the navigation footer may offer an action that navigates to Logs and focuses the relevant entry.

### Requirement: Route Backed Screen Navigation
The system SHALL use `svelte-spa-router` routes as the primary navigation mechanism for main workbench screens.

#### Scenario: User selects a navigation item
- **WHEN** the user activates Overview, Credentials, Large Blobs, Config, Lab, or Logs in the navigation
- **THEN** the route changes to that screen and the main workspace renders the routed screen.

#### Scenario: App opens without a known route
- **WHEN** the workbench starts at an empty or unknown route
- **THEN** the router redirects to a valid default workbench screen without showing a blank workspace.

#### Scenario: Route changes to Overview
- **WHEN** the route becomes Overview and an authenticator is selected
- **THEN** the app triggers the existing overview load behavior through the controller layer rather than calling generated bindings directly from the shell.
