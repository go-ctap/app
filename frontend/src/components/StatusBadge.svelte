<script lang="ts">
  import { stateLabel } from "$lib/format";
  import { m } from "../paraglide/messages.js";

  type Props = {
    value?: unknown;
    label?: string;
    help?: string;
    tone?: "auto" | "ok" | "bad" | "warn" | "neutral";
  };

  let { value = "unknown", label = "", help = "", tone = "auto" }: Props = $props();
  let normalized = $derived(stateLabel(value));
  let text = $derived(label || normalized);
  let resolvedTone = $derived.by(() => {
    if (tone !== "auto") return tone;

    const raw = String(value ?? "").toLowerCase();
    const readable = normalized.toLowerCase();
    if (value === true || ["supported", "configured", "enabled", "available", "ready"].includes(raw) || readable === m.state_available().toLowerCase()) return "ok";
    if (value === false || ["unsupported", "unavailable", "not_supported", "closed"].includes(raw) || readable === m.state_not_available().toLowerCase()) return "bad";
    if (["warning", "preview_only", "preview only", "opening", "running"].includes(raw) || [m.status_warning(), m.preview_only(), m.session_opening(), m.session_running()].map((item) => item.toLowerCase()).includes(readable)) return "warn";
    if (["stale", "error", "invalid-session"].includes(raw)) return "bad";
    return "neutral";
  });
</script>

<span class="status-badge" data-tone={resolvedTone} title={help || text}>
  <span class="dot" aria-hidden="true"></span>
  <span>{text}</span>
</span>

<style>
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-panel-soft);
    color: var(--color-text-muted);
    padding: 3px 8px;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: currentColor;
  }

  .status-badge[data-tone="ok"] {
    border-color: color-mix(in srgb, var(--color-success) 30%, var(--color-border));
    background: color-mix(in srgb, var(--color-success) 10%, white);
    color: var(--color-success);
  }

  .status-badge[data-tone="bad"] {
    border-color: var(--color-danger-border);
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }

  .status-badge[data-tone="warn"] {
    border-color: color-mix(in srgb, var(--color-warning) 28%, var(--color-border));
    background: var(--color-warning-bg);
    color: var(--color-warning);
  }
</style>
