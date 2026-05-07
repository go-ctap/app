## ADDED Requirements

### Requirement: Shadcn Svelte Status Bar Composition
The sticky bottom feedback bar SHALL be implemented with shadcn-svelte-compatible surfaces, actions, badges, progress, alerts, and tooltips while preserving its global operation and session feedback role.

#### Scenario: Operation is running after migration
- **WHEN** a backend token operation emits progress for an active operation ID
- **THEN** the bottom status bar renders the stage, progress counts, selected token context, and Cancel action using the shared shadcn-svelte UI system.

#### Scenario: Recoverable session state appears after migration
- **WHEN** session status becomes closed, stale, or error
- **THEN** the bottom status bar presents recovery copy and actions with shadcn-svelte-compatible Button, Badge, Alert, or Tooltip composition.

### Requirement: Status Details Use Shared Disclosure Patterns
The system SHALL use shared shadcn-svelte-compatible disclosure or dialog patterns for status details rather than bespoke modal markup.

#### Scenario: User opens operation details
- **WHEN** a status summary offers detailed operation, error, JSON, or recovery information
- **THEN** the detail surface opens in an accessible shadcn-svelte Dialog, Sheet, Popover, or Collapsible pattern with an appropriate title and focus behavior.

