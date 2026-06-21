<script lang="ts">
    import {Activity, Gauge, Settings, ShieldCheck} from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Card } from "$lib/components/ui/card/index.js";
  import type { ActiveScreen, StatusBarState } from "$lib/stores";
  import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
  import type { SessionStatus } from "$lib/api";
  import { deviceName, sessionStateLabel } from "$lib/format";
  import { m } from "../paraglide/messages.js";
  import {type Component} from "svelte";

  type Props = {
    activeScreen: ActiveScreen;
    sessionStatus: SessionStatus;
    selectedDevice: DeviceReport | null;
    statusBar: StatusBarState;
    onNavigate: (screen: ActiveScreen) => void;
  };

  let { activeScreen, sessionStatus, selectedDevice, statusBar, onNavigate }: Props = $props();

  const navItems: { id: ActiveScreen; label: string; icon: Component }[] = [
    { id: "overview", label: m.overview(), icon: Gauge },
    { id: "settings", label: m.settings(), icon: Settings },
  ];

  let statusTone = $derived(statusToneFor(sessionStatus.state, statusBar.lastOutcome?.tone));
  let statusTitle = $derived(statusBar.activeOperation?.label || statusBar.lastOutcome?.title || sessionStateLabel(sessionStatus.state));
  let statusDetail = $derived.by(() => {
    if (statusBar.activeOperation?.event?.message) return statusBar.activeOperation.event.message;
    if (statusBar.lastOutcome?.message) return statusBar.lastOutcome.message;
    if (selectedDevice) return deviceName(selectedDevice);
    return m.no_token_selected();
  });

  function statusToneFor(state: string, outcomeTone?: string) {
    if (state === "opening" || state === "running") return "busy";
    if (state === "stale" || state === "error" || outcomeTone === "error") return "bad";
    if (state === "ready" || outcomeTone === "success") return "ok";
    if (outcomeTone === "warning") return "warn";
    return "neutral";
  }
</script>

<aside class="app-sidebar" aria-label={m.main_navigation()}>
  <div class="app-sidebar__brand" aria-label={m.app_title()}>
    <span class="app-sidebar__mark" aria-hidden="true">
      <ShieldCheck size={20} strokeWidth={2.25} />
    </span>
    <span class="app-sidebar__brand-copy">
      <span class="app-sidebar__title">{m.app_title()}</span>
      <span class="app-sidebar__subtitle">{m.app_subtitle()}</span>
    </span>
  </div>

  <nav class="app-sidebar__nav" aria-label={m.screen()}>
    {#each navItems as item (item.id)}
      <Button
        type="button"
        variant={activeScreen === item.id ? "secondary" : "ghost"}
        class="app-sidebar__nav-item"
        data-active={activeScreen === item.id ? "true" : undefined}
        aria-current={activeScreen === item.id ? "page" : undefined}
        aria-label={item.label}
        onclick={() => onNavigate(item.id)}
      >
        <item.icon size={17} strokeWidth={2}/>
        <span>{item.label}</span>
      </Button>
    {/each}
  </nav>

  <Card class="app-sidebar__status" data-tone={statusTone} aria-label={m.current_activity()}>
    <div class="app-sidebar__status-header">
      <Activity size={15} strokeWidth={2} />
      <span>{sessionStateLabel(sessionStatus.state)}</span>
    </div>
    <p class="app-sidebar__status-title">{statusTitle}</p>
    <p class="app-sidebar__status-detail">{statusDetail}</p>
  </Card>
</aside>

<style>
@layer blocks {
    .app-sidebar {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: var(--space-5);
      min-width: 0;
      height: 100vh;
      border-right: 1px solid var(--border);
      background: color-mix(in srgb, var(--card) 86%, var(--background));
      padding: var(--space-4);
    }

    .app-sidebar__brand {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr);
      gap: var(--space-3);
      align-items: center;
      min-width: 0;
    }

    .app-sidebar__mark {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 1px solid color-mix(in srgb, var(--foreground) 18%, var(--border));
      border-radius: var(--radius);
      background: var(--foreground);
      color: var(--card);
    }

    .app-sidebar__brand-copy {
      display: grid;
      min-width: 0;
      gap: 2px;
      line-height: 1.15;
    }

    .app-sidebar__title,
    .app-sidebar__subtitle,
    .app-sidebar__status-title,
    .app-sidebar__status-detail {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .app-sidebar__title,
    .app-sidebar__status-title {
      color: var(--foreground);
      font-weight: 700;
    }

    .app-sidebar__title {
      font-size: 0.92rem;
    }

    .app-sidebar__subtitle {
      color: var(--muted-foreground);
      font-size: 0.72rem;
      white-space: nowrap;
    }

    .app-sidebar__nav {
      display: grid;
      align-content: start;
      gap: var(--space-1);
      min-width: 0;
    }

    :global(.app-sidebar__nav-item) {
      justify-content: flex-start;
      width: 100%;
      min-height: 38px;
      border-color: transparent;
      background: transparent;
      color: var(--muted-foreground);
      padding: 0 var(--space-3);
      text-align: left;
    }

    :global(.app-sidebar__nav-item[data-active="true"]) {
      font-weight: 700;
    }

    :global(.app-sidebar__status) {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--card);
      padding: var(--space-3);
    }

    .app-sidebar__status-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--muted-foreground);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .app-sidebar__status-title,
    .app-sidebar__status-detail {
      margin: 0;
    }

    .app-sidebar__status-title {
      font-size: 0.84rem;
      line-height: 1.25;
      white-space: nowrap;
    }

    .app-sidebar__status-detail {
      display: -webkit-box;
      color: var(--muted-foreground);
      font-size: 0.76rem;
      line-height: 1.35;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    @media (max-width: 900px) {
      .app-sidebar {
        gap: var(--space-4);
        padding: var(--space-3);
      }

      .app-sidebar__brand {
        grid-template-columns: 1fr;
        justify-items: center;
      }

      .app-sidebar__brand-copy,
      :global(.app-sidebar__nav-item span),
      .app-sidebar__status-title,
      .app-sidebar__status-detail,
      .app-sidebar__status-header span {
        display: none;
      }

      :global(.app-sidebar__nav-item) {
        justify-content: center;
        padding: 0;
      }

      :global(.app-sidebar__status) {
        place-items: center;
        padding: var(--space-2);
      }
    }
}
</style>
