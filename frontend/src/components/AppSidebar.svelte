<script lang="ts">
  import { Activity, Gauge, Settings, ShieldCheck } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
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

  let statusTitle = $derived(statusBar.activeOperation?.label || statusBar.lastOutcome?.title || sessionStateLabel(sessionStatus.state));
  let statusDetail = $derived.by(() => {
    if (statusBar.activeOperation?.event?.message) return statusBar.activeOperation.event.message;
    if (statusBar.lastOutcome?.message) return statusBar.lastOutcome.message;
    if (selectedDevice) return deviceName(selectedDevice);
    return m.no_token_selected();
  });

</script>

<aside class="app-sidebar" aria-label={m.main_navigation()}>
  <div class="sidebar-brand" aria-label={m.app_title()}>
    <span class="sidebar-mark" aria-hidden="true">
      <ShieldCheck size={20} strokeWidth={2.25} />
    </span>
    <span class="sidebar-brand-copy">
      <span class="sidebar-title">{m.app_title()}</span>
      <span class="sidebar-subtitle">{m.app_subtitle()}</span>
    </span>
  </div>

  <nav class="sidebar-nav" aria-label={m.screen()}>
    {#each navItems as item (item.id)}
      <Button
        type="button"
        variant={activeScreen === item.id ? "secondary" : "ghost"}
        class="w-full justify-start text-left max-[900px]:justify-center max-[900px]:px-0"
        data-active={activeScreen === item.id ? "true" : undefined}
        aria-current={activeScreen === item.id ? "page" : undefined}
        aria-label={item.label}
        onclick={() => onNavigate(item.id)}
      >
        <item.icon data-icon="inline-start" />
        <span class="sidebar-nav-label">{item.label}</span>
      </Button>
    {/each}
  </nav>

  <Card.Root size="sm" class="min-w-0 max-[900px]:place-items-center" aria-label={m.current_activity()}>
    <Card.Header class="flex items-center gap-2 text-muted-foreground text-[0.72rem] font-bold uppercase">
      <Activity />
      <span class="max-[900px]:hidden">{sessionStateLabel(sessionStatus.state)}</span>
    </Card.Header>
    <Card.Content>
      <Card.Title class="truncate text-[0.84rem] leading-tight max-[900px]:hidden">{statusTitle}</Card.Title>
      <Card.Description class="line-clamp-2 text-[0.76rem] leading-snug max-[900px]:hidden">{statusDetail}</Card.Description>
    </Card.Content>
  </Card.Root>
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

    .sidebar-brand {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr);
      gap: var(--space-3);
      align-items: center;
      min-width: 0;
    }

    .sidebar-mark {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 1px solid color-mix(in srgb, var(--foreground) 18%, var(--border));
      border-radius: var(--radius);
      background: var(--foreground);
      color: var(--card);
    }

    .sidebar-brand-copy {
      display: grid;
      min-width: 0;
      gap: 2px;
      line-height: 1.15;
    }

    .sidebar-title,
    .sidebar-subtitle,
    .sidebar-title {
      color: var(--foreground);
      font-weight: 700;
    }

    .sidebar-title {
      font-size: 0.92rem;
    }

    .sidebar-subtitle {
      color: var(--muted-foreground);
      font-size: 0.72rem;
      white-space: nowrap;
    }

    .sidebar-nav {
      display: grid;
      align-content: start;
      gap: var(--space-1);
      min-width: 0;
    }

    @media (max-width: 900px) {
      .app-sidebar {
        gap: var(--space-4);
        padding: var(--space-3);
      }

      .sidebar-brand {
        grid-template-columns: 1fr;
        justify-items: center;
      }

      .sidebar-brand-copy,
      .sidebar-nav-label {
        display: none;
      }
    }
}
</style>
