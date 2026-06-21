<script lang="ts">
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";
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
  let badgeVariant: BadgeVariant = $derived.by(() => {
    if (resolvedTone === "bad") return "destructive";
    if (resolvedTone === "warn") return "secondary";
    if (resolvedTone === "ok") return "default";
    return "outline";
  });
</script>

<Badge variant={badgeVariant} data-tone={resolvedTone} title={help || text}>
  <span class="dot" aria-hidden="true"></span>
  <span>{text}</span>
</Badge>

<style>
@layer blocks {
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: currentColor;
    }
}
</style>
