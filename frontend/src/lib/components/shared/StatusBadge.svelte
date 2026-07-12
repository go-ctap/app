<script lang="ts">
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";

  type Props = {
    label: string;
    help?: string;
    tone: "ok" | "bad" | "warn" | "neutral";
  };

  let { label, help = "", tone }: Props = $props();

  let badgeVariant: BadgeVariant = $derived.by(() => {
    if (tone === "bad") return "destructive";
    if (tone === "warn") return "warning";
    if (tone === "ok") return "default";
    return "outline";
  });
</script>

<Badge variant={badgeVariant} data-tone={tone} title={help || label}>
  <span class="dot" aria-hidden="true"></span>
  <span>{label}</span>
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
