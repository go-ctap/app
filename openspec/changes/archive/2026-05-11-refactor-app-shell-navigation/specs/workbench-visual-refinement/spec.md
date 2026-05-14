## ADDED Requirements

### Requirement: Full Width Primary Workspace
The system SHALL prioritize the active workbench screen as the primary workspace after removing the right activity rail.

#### Scenario: Desktop screen renders data-heavy content
- **WHEN** the user opens Credentials, Large Blobs, Config, Lab, Logs, or Overview on a desktop-sized Wails window
- **THEN** the active screen uses the width previously reserved for the activity rail for denser tables, forms, detail panels, or empty states.

#### Scenario: Activity updates occur
- **WHEN** current operation or session status changes while the user works in a screen
- **THEN** the update appears in the navigation footer without causing the active screen layout to resize horizontally.

### Requirement: Restrained Operational Shell
The system SHALL keep the app shell visually quiet, utility-first, and free of decorative panel chrome.

#### Scenario: Sidebar header aligns with top bar
- **WHEN** the shell renders the sidebar header and top app bar together
- **THEN** the two regions look like one continuous top surface with consistent height, border, background, and spacing.

#### Scenario: Top bar renders global controls
- **WHEN** the top app bar displays authenticator selection, language, refresh, and session controls
- **THEN** the selector carries token identity and session state while refresh, background-session count, close selected, and close all use compact shadcn-svelte/Tailwind composition with clear labels or tooltips and no oversized decorative containers.

#### Scenario: Navigation footer renders activity
- **WHEN** the navigation footer displays idle, running, success, warning, or error state
- **THEN** the footer uses a compact status treatment that supports scanning without card mosaics, right-side panels, or duplicate event feeds.
