## ADDED Requirements

### Requirement: Lab Steps Use Shadcn Svelte Workflow Components
The WebAuthn lab SHALL render makeCredential and getAssertion steps, forms, previews, warnings, actions, and result panels with shadcn-svelte-compatible cards, fields, tabs/toggles, alerts, badges, buttons, and disclosure components.

#### Scenario: User previews makeCredential after migration
- **WHEN** the user previews makeCredential
- **THEN** the makeCredential step displays preview result, normalized input summary, warnings, and next action inside the migrated step surface without requiring scrolling below the workflow.

#### Scenario: User runs getAssertion after migration
- **WHEN** getAssertion succeeds or fails
- **THEN** the getAssertion step displays assertion result, signature/client data/authenticator data summaries, copy actions, and raw details through the shared shadcn-svelte UI system.

### Requirement: Lab Result Details Remain Local And Secondary
The migrated lab SHALL keep raw normalized inputs and raw operation outputs available inside the step that produced them while keeping the primary workflow result scannable.

#### Scenario: User opens raw lab details after migration
- **WHEN** the user expands technical details in a lab step
- **THEN** raw JSON and hex artifacts associated with that step appear in a secondary disclosure surface rather than replacing the primary result summary.

#### Scenario: Created credential handoff occurs after migration
- **WHEN** makeCredential returns a credential ID and the user populates getAssertion from it
- **THEN** the migrated UI visibly updates the getAssertion allow list and confirms the handoff through the lab step or status bar.

