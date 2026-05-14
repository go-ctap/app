# workbench-visual-refinement Specification

## Purpose
TBD - created by archiving change refine-workbench-ux-and-sessions. Update Purpose after archive.
## Requirements
### Requirement: Preserve Light Theme And Improve Polish
The system SHALL preserve the current light-theme direction while removing visible layout defects, oversized decorative status shapes, and unfinished raw state labels.

#### Scenario: Overview capability cards render on desktop
- **WHEN** the overview screen displays capability cards on a desktop viewport
- **THEN** each card uses stable spacing, readable copy, compact status treatment, and no large decorative pill that squeezes content

#### Scenario: Dark theme is unavailable
- **WHEN** the application renders after this change
- **THEN** it uses the refined light theme and does not expose a dark theme toggle

### Requirement: Use Polished Status Components
The system SHALL represent support/configuration state with reusable compact status components instead of raw text such as `State: configured`.

#### Scenario: Configured state is shown
- **WHEN** a token capability reports `configured`
- **THEN** the UI displays a compact configured status with consistent tone, label, and optional help text

#### Scenario: Unsupported state is shown
- **WHEN** a token capability reports unsupported or unavailable
- **THEN** the UI displays a compact unavailable status without rendering a large inactive management panel

### Requirement: Adapt Configuration Sections To Token Capabilities
The system SHALL show full configuration controls only for capabilities that are supported or actionable for the selected token.

#### Scenario: Non-biometric token opens config screen
- **WHEN** the selected token does not support biometric management
- **THEN** the config screen does not show a full biometric management area

#### Scenario: Biometric token opens config screen
- **WHEN** the selected token supports biometric management
- **THEN** the config screen shows biometric enrollment, rename, and removal controls with status and progress

### Requirement: Prevent Long Identifier Layout Breakage
The system SHALL prevent long credential IDs, user IDs, blob IDs, and hex artifacts from causing horizontal page scrolling or pushing action buttons out of alignment.

#### Scenario: Credential list contains long identifiers
- **WHEN** resident credentials include long credential IDs or user IDs
- **THEN** the list truncates or wraps identifiers within their column, offers copy/detail affordances, and keeps Edit/Delete actions aligned

#### Scenario: Large blob list contains long identifiers
- **WHEN** large-blob rows include long credential IDs
- **THEN** row content remains scannable without horizontal viewport scrolling

### Requirement: Keep JSON And Hex Inspectors Secondary
The system SHALL keep raw JSON and hex inspectors available but visually secondary to the primary workflow.

#### Scenario: Normalized JSON is large
- **WHEN** normalized input or result JSON contains long byte arrays
- **THEN** the screen summarizes the artifact and offers expanded/copyable raw detail without dominating the main form

### Requirement: Replace Bespoke Visual Primitives With Shadcn Svelte
The system SHALL preserve the refined light-theme workbench direction while replacing bespoke cards, buttons, badges, empty states, dialogs, tables, and layout primitives with shadcn-svelte components or app wrappers.

#### Scenario: A migrated screen renders primary content
- **WHEN** any main workbench screen is displayed after the migration
- **THEN** its primary surfaces use shadcn-svelte composition and no longer depend on the old custom `.capability`, `.list-section`, `.empty-state`, `.modal`, `.status-badge`, or equivalent bespoke styling as independent primitives.

#### Scenario: Unsupported or unavailable states render
- **WHEN** a token capability, credential feature, blob state, or lab result is unavailable
- **THEN** the UI presents the state with shadcn-svelte-compatible Badge, Alert, Empty, or muted content patterns without oversized decorative panels.

### Requirement: Preserve Dense Desktop Workbench Layout
The system SHALL keep a dense, scannable desktop workbench layout after the component migration.

#### Scenario: Desktop window displays repeated data
- **WHEN** credential rows, blob rows, logs, capability groups, or protocol details are shown on a desktop viewport
- **THEN** the layout supports scanning and comparison without marketing-style hero sections or decorative card-heavy spacing.

#### Scenario: Narrow window displays repeated data
- **WHEN** the Wails window is narrow
- **THEN** migrated shadcn-svelte surfaces wrap or stack without text overlap, clipped controls, or horizontal page scrolling.

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

