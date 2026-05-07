## ADDED Requirements

### Requirement: Overview Uses Shadcn Svelte Dashboard Surfaces
The overview dashboard SHALL use shadcn-svelte-compatible Card, Badge, Separator, Skeleton, Alert, Table/list, and disclosure patterns for token identity, capabilities, loading states, and technical details.

#### Scenario: Overview loads for selected token after migration
- **WHEN** overview inspection succeeds
- **THEN** token product identity, transport, session state, AAGUID or equivalent detail, protocol versions, and capability summary render through shared shadcn-svelte dashboard surfaces.

#### Scenario: Overview is loading after migration
- **WHEN** overview inspection is running
- **THEN** the screen displays shadcn-svelte-compatible skeleton or progress treatment that preserves layout and clearly indicates the token is being read.

### Requirement: Overview Technical Details Use Shared Disclosure
The overview SHALL keep expert inspection data secondary through shadcn-svelte-compatible disclosure or dialog components.

#### Scenario: User opens raw report after migration
- **WHEN** the user expands technical details
- **THEN** the system displays structured inspection report and raw protocol data in a secondary disclosure surface without overwhelming the default overview.

