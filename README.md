# Telesma

Telesma is a Wails 3 desktop workbench for inspecting and managing local FIDO2/CTAP authenticators. The application uses `github.com/telesma-app/kit` as its authenticator runtime and keeps product UI and Wails wiring in this repository.

Created by Savely Krasovsky.

## Development

The project requires Go, Wails 3, Node.js, pnpm, and a platform-supported FIDO transport.

```sh
pnpm --dir frontend install
task dev
```

`task dev` starts the real Wails window. A browser-only preview is not a reliable smoke test for the Wails 3 runtime.

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
