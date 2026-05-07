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

