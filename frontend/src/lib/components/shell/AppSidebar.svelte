<script lang="ts">
  import { Database, Gauge, KeyRound, Settings, ShieldCheck } from "@lucide/svelte";
  import {type Component} from "svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import type { SidebarPresentation } from "$lib/shell-presentation";
  import type { ActiveScreen } from "$lib/stores";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    presentation: SidebarPresentation;
    onNavigate: (screen: ActiveScreen) => void;
  };

  let { presentation, onNavigate }: Props = $props();

  const navItems: { id: ActiveScreen; label: string; icon: Component }[] = [
    { id: "overview", label: m.overview(), icon: Gauge },
    { id: "passkeys", label: m.passkeys(), icon: KeyRound },
    { id: "large-blobs", label: m.nav_large_blobs(), icon: Database },
    { id: "settings", label: m.settings(), icon: Settings },
  ];

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
      grid-template-rows: 58px minmax(0, 1fr);
      min-width: 0;
      height: 100dvh;
      border-right: 1px solid var(--window-border);
      background: transparent;
    }

    .sidebar-brand {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr);
      gap: var(--space-3);
      align-items: center;
      min-width: 0;
      border-bottom: 1px solid var(--topbar-border, var(--border));
      background: var(--topbar-background, var(--card));
      padding: 0 var(--space-4);
      --wails-non-client-region: caption;
      --wails-draggable: drag;
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
    .sidebar-subtitle {
      overflow: hidden;
      color: var(--foreground);
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-title {
      font-size: 0.92rem;
    }

    .sidebar-subtitle {
      color: var(--muted-foreground);
      font-size: 0.72rem;
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
</style>
