## ADDED Requirements

### Requirement: Credential inventory is shared by selected token
The system SHALL keep shared selected-token credential inventory metadata that Credentials and Large Blobs can both read and update.

#### Scenario: Credentials loads inventory first
- **WHEN** the Credentials screen successfully reloads resident credentials
- **THEN** the shared selected-token inventory cache is updated with management-quality credential data.

#### Scenario: Large Blobs loads blob state first
- **WHEN** the Large Blobs screen successfully reloads blob state and credential mapping
- **THEN** the shared selected-token inventory cache is updated with blob-quality credential data.

#### Scenario: Token selection changes
- **WHEN** the selected token changes
- **THEN** cached credential inventory for the previous selected token is not rendered as current-token data.

### Requirement: Screens hydrate from shared inventory
The system SHALL let Credentials and Large Blobs hydrate visible state from shared selected-token inventory before requiring another full token operation when the cached data is suitable.

#### Scenario: Credentials opens after Large Blobs
- **WHEN** Large Blobs has warmed the selected session and populated shared credential inventory
- **THEN** Credentials can show cached credential context immediately and may start a cache-aware `Reload credentials` operation without requiring the user to visit Overview.

#### Scenario: Large Blobs opens after Credentials
- **WHEN** Credentials has populated shared management-quality inventory for the selected token
- **THEN** Large Blobs can show credential rows immediately and use `Reload blobs` to complete blob-specific state.

#### Scenario: Cache is invalidated by session boundary
- **WHEN** the user locks the session, the session becomes stale, the selected token disappears, or factory reset succeeds
- **THEN** dependent shared inventory is invalidated or marked unusable for automatic hydration.

### Requirement: Warm loads remain visible and cancelable
The system SHALL keep cache-aware token operations visible to the user.

#### Scenario: Warm credential reload starts
- **WHEN** the system starts a cache-aware credential reload from a ready selected session
- **THEN** the status bar shows operation progress and offers cancellation while the operation is running.

#### Scenario: Cold screen has no suitable cache
- **WHEN** the user opens Credentials or Large Blobs with no suitable selected-token inventory cache
- **THEN** the screen presents an explicit scoped reload action instead of silently starting slow token I/O.
