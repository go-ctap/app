<script lang="ts">
  import { Database, Gauge, KeyRound, Settings, Shield, ShieldCheck } from "@lucide/svelte";
  import {type Component} from "svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import type { SidebarPresentation } from "$lib/shell-presentation";
  import type { ActiveScreen } from "$lib/stores";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    presentation: SidebarPresentation;
    nativeWindowTitlebar?: boolean;
    onNavigate: (screen: ActiveScreen) => void;
  };

  let { presentation, nativeWindowTitlebar = false, onNavigate }: Props = $props();

  const navItems: { id: ActiveScreen; label: string; icon: Component }[] = [
    { id: "overview", label: m.overview(), icon: Gauge },
    { id: "passkeys", label: m.passkeys(), icon: KeyRound },
    { id: "large-blobs", label: m.nav_large_blobs(), icon: Database },
    { id: "security", label: m.security(), icon: Shield },
    { id: "settings", label: m.settings(), icon: Settings },
  ];

</script>

<aside
  class="app-sidebar"
  data-native-titlebar={nativeWindowTitlebar ? "true" : undefined}
  aria-label={m.main_navigation()}
>
  {#if nativeWindowTitlebar}
    <div class="sidebar-titlebar-space" data-window-titlebar-region="true" aria-hidden="true"></div>
  {/if}

  <div class="sidebar-brand" aria-label={m.app_title()}>
    <span class="sidebar-mark" aria-hidden="true">
      <ShieldCheck size={22} strokeWidth={2} />
    </span>
    <span class="sidebar-brand-copy">
      <span class="sidebar-title">{m.app_title()}</span>
    </span>
  </div>

  <nav class="sidebar-nav" aria-label={m.screen()}>
    {#each navItems as item (item.id)}
      <Button
        type="button"
        variant={presentation.activeScreen === item.id ? "secondary" : "ghost"}
        class="sidebar-nav-button"
        data-active={presentation.activeScreen === item.id ? "true" : undefined}
        aria-current={presentation.activeScreen === item.id ? "page" : undefined}
        aria-label={item.label}
        onclick={() => onNavigate(item.id)}
      >
        <item.icon data-icon="inline-start" />
        <span class="sidebar-nav-label">{item.label}</span>
      </Button>
    {/each}
  </nav>

</aside>

<style>
@layer blocks {
    .app-sidebar {
      container: sidebar / inline-size;
      display: grid;
      grid-template-rows: var(--shell-titlebar-block-size) minmax(0, 1fr);
      min-width: 0;
      height: 100dvh;
      border-right: 1px solid var(--window-border);
      background: var(--sidebar-background, var(--sidebar));
    }

    .sidebar-titlebar-space {
      min-width: 0;
      background: var(--sidebar-background, var(--sidebar));
      --wails-non-client-region: caption;
      --wails-draggable: drag;
    }

    .sidebar-brand {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr);
      gap: var(--space-2);
      align-items: center;
      min-width: 0;
      border-bottom: 1px solid var(--topbar-border, var(--border));
      background: var(--sidebar-background, var(--sidebar));
      padding: 0 var(--space-4);
      --wails-non-client-region: caption;
      --wails-draggable: drag;
    }

    .sidebar-mark {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      color: color-mix(in srgb, var(--foreground) 96%, var(--muted-foreground));
    }

    .sidebar-brand-copy {
      display: grid;
      min-width: 0;
      line-height: 1.1;
    }

    .sidebar-title {
      overflow: hidden;
      color: color-mix(in srgb, var(--foreground) 88%, var(--muted-foreground));
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.88rem;
    }

    .sidebar-nav {
      display: grid;
      align-content: start;
      gap: var(--space-1);
      min-width: 0;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
      padding: var(--space-4);
      background: var(--sidebar-background, var(--sidebar));
    }

    .sidebar-nav :global(.sidebar-nav-button) {
      width: 100%;
      justify-content: flex-start;
      text-align: left;
    }

    @container sidebar (max-width: 11rem) {
      .sidebar-brand {
        grid-template-columns: 1fr;
        justify-items: center;
        padding: 0 var(--space-3);
      }

      .sidebar-nav {
        padding: var(--space-3);
      }

      .sidebar-brand-copy,
      .sidebar-nav-label {
        display: none;
      }

      .sidebar-nav :global(.sidebar-nav-button) {
        justify-content: center;
        padding-inline: 0;
      }
    }
}

@layer exceptions {
    .app-sidebar[data-native-titlebar="true"] {
      grid-template-rows: 36px auto minmax(0, 1fr);
    }

    .app-sidebar[data-native-titlebar="true"] .sidebar-brand {
      min-height: 2.5rem;
      border-bottom: 0;
      background: var(--sidebar-background, var(--sidebar));
      padding-block: var(--space-1);
      --wails-non-client-region: initial;
      --wails-draggable: no-drag;
    }

    .app-sidebar[data-native-titlebar="true"] .sidebar-titlebar-space {
      background: var(--sidebar-background, var(--sidebar));
    }

    .app-sidebar[data-native-titlebar="true"] .sidebar-nav {
      padding-block-start: 0;
    }
}
</style>
