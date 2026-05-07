# Agent Instructions

## Frontend / Wails Inspection

When inspecting frontend changes, prefer the full Wails dev runtime over a plain Vite preview.

1. Run `wails3 dev` from the repository root.
2. Read the command output and use the actual printed dev URL, such as `http://localhost:<port>` or `http://127.0.0.1:<port>`.
3. Do not guess the Vite port. If `wails3 dev` is already running, reuse the existing URL from the terminal output or logs instead of starting a second server.
4. Open that URL in the in-app browser through browser-use for UI inspection.
5. After frontend edits, reload the page and inspect the DOM or screenshot again.
6. Use `wails3 dev` for Wails-specific functionality because plain browser/Vite mode may not expose the full desktop runtime.
