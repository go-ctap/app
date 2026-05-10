<script module lang="ts">
  import { FingerprintPattern, Info, KeyRound, ShieldCheck } from "@lucide/svelte";

  const ICONS: Record<string, typeof ShieldCheck> = {
    authentication: FingerprintPattern,
    "credentials-management": KeyRound,
  };
</script>

<script lang="ts">
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import type { OverviewHeroSignal, OverviewHeroSignalGroup } from "$lib/overview-rules";
  import { m } from "../paraglide/messages.js";

  export let group: OverviewHeroSignalGroup;

  let Icon = Info;
  $: Icon = ICONS[group.id] || Info;

  function signalToneClass(status: OverviewHeroSignal["status"]) {
    if (status === "supported" || status === "configured" || status === "enabled") return "text-emerald-700 dark:text-emerald-400";
    if (status === "warning" || status === "not configured" || status === "disabled") return "text-amber-700 dark:text-amber-400";
    if (status === "informational") return "text-sky-700 dark:text-sky-400";
    return "text-muted-foreground";
  }

  function signalDotClass(status: OverviewHeroSignal["status"]) {
    if (status === "supported" || status === "configured" || status === "enabled") return "bg-emerald-500";
    if (status === "warning" || status === "not configured" || status === "disabled") return "bg-amber-500";
    if (status === "informational") return "bg-sky-500";
    return "bg-muted-foreground/40";
  }
</script>

{#snippet infoTooltip(label: string, text: string)}
  <Tooltip.Root>
    <Tooltip.Trigger
      class={buttonVariants({ variant: "ghost", size: "icon-xs" })}
      type="button"
      aria-label={m.about_label({ label })}
    >
      <Info size={12} />
    </Tooltip.Trigger>
    <Tooltip.Content side="top" sideOffset={6} class="max-w-96 leading-5">
      <p>{text}</p>
    </Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet signalRow(signal: OverviewHeroSignal)}
  <div class="grid min-w-0 gap-1.5 border-t py-2.5 first:border-t-0">
    <div class="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div class="grid min-w-0 gap-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <span class="min-w-0 text-sm font-medium leading-5">{signal.title}</span>
          {@render infoTooltip(signal.title, signal.tooltip)}
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground">
          <code class="inline-flex max-w-full items-center gap-1 overflow-hidden truncate whitespace-nowrap rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] leading-4 text-muted-foreground" title={`${signal.flag} = ${signal.value}`}>
            <span class="truncate">{signal.flag}</span>
            <span class="text-muted-foreground/60">=</span>
            <span class="text-foreground/80">{signal.value}</span>
          </code>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-1.5 pt-0.5 sm:justify-end" title={signal.tooltip}>
        <span class={`size-1.5 rounded-full ${signalDotClass(signal.status)}`} aria-hidden="true"></span>
        <span class={`text-right text-xs font-semibold ${signalToneClass(signal.status)}`}>{signal.statusLabel}</span>
      </div>
    </div>
  </div>
{/snippet}

<section class="grid min-w-0 content-start">
  <div class="flex items-center gap-2 border-b pb-2">
    <Icon class="size-4 text-muted-foreground" strokeWidth={2.1} />
    <h3 class="truncate text-sm font-semibold">{group.title}</h3>
  </div>
  <div class="grid min-w-0">
    {#each group.signals as signal (signal.id)}
      {@render signalRow(signal)}
    {/each}
  </div>
</section>
