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

## Linux x86_64 AppImage from macOS

The Linux binary and AppImage are built and packaged in `linux/amd64` stages,
so no Linux, Go, Node.js, or GTK tooling is required on the Mac. On Apple
Silicon the architecture-independent frontend is built in a native arm64 stage
to avoid running Node/Vite through QEMU. Podman and a running Podman machine are
required. For a new installation, initialize the machine once; otherwise just
start the existing one:

```sh
# Run only once for a new Podman installation (6 GiB avoids OOM during pnpm/Go builds):
podman machine init --memory 6144 --now

# For an existing stopped machine:
podman machine start
```

If an existing machine still has Podman's 2 GiB default, resize it once:

```sh
podman machine stop
podman machine set --memory 6144
podman machine start
```

From this directory, run:

```sh
wails3 task package:linux:amd64
```

The result is `bin/telesma-x86_64.AppImage`. On an Apple Silicon Mac the first
build is relatively slow because the amd64 compiler and packaging tools run
under translation or emulation; subsequent builds reuse Podman's cached layers.

The builder defaults to Wails' GTK3 compatibility path so the AppImage can run
on distributions such as Ubuntu 22.04 and Debian 12. Additional Go build tags
can be supplied with `APPIMAGE_TAGS`, for example:

```sh
wails3 task package:linux:amd64 APPIMAGE_TAGS=gtk3,mytag
```

The equivalent commands without a locally installed Wails CLI are:

```sh
podman build \
  --platform linux/amd64 \
  --file build/docker/Dockerfile.appimage \
  --ignorefile build/docker/Dockerfile.appimage.dockerignore \
  --target artifact \
  --tag localhost/telesma-appimage-builder:linux-amd64 \
  --build-arg TARGETARCH=amd64 \
  --build-arg WAILS_LINUX_TAGS=gtk3 \
  ..

mkdir -p bin
container_id="$(podman create \
  --platform linux/amd64 \
  localhost/telesma-appimage-builder:linux-amd64 \
  /bin/true)"
podman cp \
  "${container_id}:/bin/telesma-x86_64.AppImage" \
  bin/telesma-x86_64.AppImage
podman rm "$container_id"
```

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
