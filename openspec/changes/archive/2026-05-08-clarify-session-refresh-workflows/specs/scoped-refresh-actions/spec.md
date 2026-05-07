## ADDED Requirements

### Requirement: Refresh actions identify their data scope
The system SHALL label reload and refresh actions according to the data they update.

#### Scenario: Device discovery is refreshed
- **WHEN** the user sees the global token picker refresh action
- **THEN** the action label communicates device discovery, such as `Refresh devices`.

#### Scenario: Credentials are reloaded
- **WHEN** the user sees the resident credential inventory reload action
- **THEN** the action label communicates credential enumeration, such as `Reload credentials`.

#### Scenario: Large blobs are reloaded
- **WHEN** the user sees the large-blob workspace reload action
- **THEN** the action label communicates blob state reload, such as `Reload blobs`.

### Requirement: Duplicate visible reload buttons are avoided
The system SHALL avoid showing multiple visible controls that perform the same reload in the same screen context.

#### Scenario: Empty credentials inventory
- **WHEN** the Credentials screen has no loaded inventory and its header reload action is visible
- **THEN** the empty state does not add a second visible button that performs the same credential reload.

#### Scenario: Empty large-blob workspace
- **WHEN** the Large Blobs screen has no loaded blob state and its header reload action is visible
- **THEN** the empty state does not add a second visible button that performs the same blob reload.

#### Scenario: Status bar retry is available
- **WHEN** a screen operation fails and the status bar offers `Retry`
- **THEN** the retry action reruns the failed operation while retaining the screen's scoped reload label for manual reloads.

