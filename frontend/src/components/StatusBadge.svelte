<script lang="ts">
  import { stateLabel } from "../lib/format";

  export let value: unknown = "unknown";
  export let label = "";
  export let help = "";

  $: normalized = stateLabel(value);
  $: text = label || normalized;
  $: tone = (() => {
    const raw = String(value ?? "").toLowerCase();
    const readable = normalized.toLowerCase();
    if (value === true || ["supported", "configured", "available", "ready"].includes(raw) || readable === "available") return "ok";
    if (value === false || ["unsupported", "unavailable", "not_supported", "closed"].includes(raw) || readable === "not available") return "bad";
    if (["preview_only", "preview only", "opening", "running"].includes(raw) || ["preview only", "opening", "running"].includes(readable)) return "warn";
    if (["stale", "error", "invalid-session"].includes(raw)) return "bad";
    return "neutral";
  })();
</script>

<span class="status-badge {tone}" title={help || text}>
  <span class="status-dot" aria-hidden="true"></span>
  <span>{text}</span>
</span>
