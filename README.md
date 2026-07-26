# Telesma

Telesma is a Wails 3 desktop workbench for inspecting and managing local FIDO2/CTAP authenticators. The application uses `github.com/go-ctap/kit` as its authenticator runtime and keeps product UI and Wails wiring in this repository.

Created by Savely Krasovsky.

## Development

The project requires Go, Wails 3, Node.js, pnpm, and a platform-supported FIDO transport.

```sh
pnpm --dir frontend install
task dev
```

`task dev` starts the real Wails window. A browser-only preview is not a reliable smoke test for the Wails 3 runtime.

### Dev Container (Fedora/Podman)

The checked-in Dev Container targets the Linux desktop development workflow:

- Ubuntu 24.04 with Go, Node.js, pnpm, Task, and Delve.
- Wails' GTK4/WebKitGTK 6.0 desktop stack.
- The host Wayland session and D-Bus session for the real Wails window.
- The host PC/SC socket plus dynamic HID raw devices and kernel uevents for
  authenticator hot-plug.

The app depends on sibling repositories through `go.work`, `replace`
directives, and a local frontend package. The configuration therefore mounts the
parent `go-ctap` directory and opens `/workspaces/go-ctap/app`; cloning only this
repository into a container volume is not supported by this workspace layout.

The configuration is editor-independent. Point any Dev Container client at
`.devcontainer/devcontainer.json`. For clients using Podman's API, enable its
user socket and configure the system service without an idle timeout:

```sh
systemctl --user enable --now podman.socket
```

```toml
# ~/.config/containers/containers.conf
[engine]
service_timeout = 0
```

After the post-create hook completes:

```sh
wails3 doctor
task dev
```

The host PC/SC daemon must be running for NFC/smart-card readers. Rootless
Podman also cannot grant more device access than the host user already has, so
the host's FIDO udev rules must allow that user to open `/dev/hidraw*`.

> **Trust boundary:** this development container is intentionally privileged
> and uses host networking. It mounts the host `/dev`, `/sys`, Wayland socket,
> D-Bus session, PC/SC socket, and the complete local `go-ctap` workspace.
> Run it only for trusted source code and dependencies.

## Verification

```sh
go test ./... -count=1
pnpm --dir frontend check
pnpm --dir frontend test
pnpm --dir frontend build
```

For changes to authenticator lifecycle, locking, interaction, or cancellation behavior, also run:

```sh
go test -race ./... -count=1
```

## Project map

- `main.go` — desktop entrypoint and Wails window setup.
- `service/` — application-owned discovery, selection, interaction, logging, and operation envelopes over the `ctapkit` runtime.
- `ctapkit_service.go` — Wails lifecycle wiring around the application service.
- `ctapkit_operations.go` — the Wails-facing `ctapkit` operation facade.
- `frontend/src/App.svelte` — desktop shell.
- `frontend/src/screens/` — product screens.
- `frontend/src/lib/` — controllers, stores, typed result extraction, and presentation builders.
- `frontend/bindings/` — generated Wails bindings; do not edit by hand.
- `build/` — Wails-owned build and packaging assets.
