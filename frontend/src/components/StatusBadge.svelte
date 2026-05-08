<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { stateLabel } from "../lib/format";

  type Props = {
    value?: unknown;
    label?: string;
    help?: string;
  };

  let { value = "unknown", label = "", help = "" }: Props = $props();
  let normalized = $derived(stateLabel(value));
  let text = $derived(label || normalized);
  let tone = $derived.by(() => {
    const raw = String(value ?? "").toLowerCase();
    const readable = normalized.toLowerCase();
    if (value === true || ["supported", "configured", "available", "ready"].includes(raw) || readable === "available") return "ok";
    if (value === false || ["unsupported", "unavailable", "not_supported", "closed"].includes(raw) || readable === "not available") return "bad";
    if (["preview_only", "preview only", "opening", "running"].includes(raw) || ["preview only", "opening", "running"].includes(readable)) return "warn";
    if (["stale", "error", "invalid-session"].includes(raw)) return "bad";
    return "neutral";
  });
</script>

<Badge
  class={`${tone === "ok" ? "bg-success text-success-foreground" : tone === "warn" ? "bg-warning text-warning-foreground" : ""} gap-1`}
  variant={tone === "bad" ? "destructive" : tone === "neutral" ? "outline" : "secondary"}
  title={help || text}
>
  <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
  <span>{text}</span>
</Badge>
