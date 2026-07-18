<script lang="ts">
  import { Database, FlaskConical, Gauge, KeyRound, ScrollText, Settings, Shield, ShieldCheck, Usb } from "@lucide/svelte";
  import {type Component} from "svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import type { SidebarPresentation } from "$lib/shell-presentation";
  import type { ActiveScreen } from "$lib/stores";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    presentation: SidebarPresentation;
    nativeWindowTitlebar?: boolean;
    onNavigate: (screen: ActiveScreen) => void;
    onSelectToken: (selector: string) => void;
  };

  let { presentation, nativeWindowTitlebar = false, onNavigate, onSelectToken }: Props = $props();

  const navItems: { id: ActiveScreen; label: string; icon: Component }[] = [
    { id: "overview", label: m.overview(), icon: Gauge },
    { id: "passkeys", label: m.passkeys(), icon: KeyRound },
    { id: "large-blobs", label: m.nav_large_blobs(), icon: Database },
    { id: "security", label: m.security(), icon: Shield },
    { id: "lab", label: m.webauthn_lab(), icon: FlaskConical },
    { id: "logs", label: m.logs(), icon: ScrollText },
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

  <section class="sidebar-tokens" aria-labelledby="sidebar-tokens-title">
    <h2 id="sidebar-tokens-title" class="sidebar-section-title">{m.tokens()}</h2>
    <div class="sidebar-token-list">
      {#each presentation.tokens as token (token.value)}
        <Button
          type="button"
          variant={presentation.selectedValue === token.value ? "secondary" : "ghost"}
          class="sidebar-token-button"
          data-selected={presentation.selectedValue === token.value ? "true" : undefined}
          aria-pressed={presentation.selectedValue === token.value}
          aria-label={token.label}
          disabled={presentation.busy}
          onclick={() => onSelectToken(token.value)}
        >
          {#if presentation.busy && presentation.selectedValue === token.value}
            <Spinner data-icon="inline-start" />
          {:else}
            <Usb data-icon="inline-start" aria-hidden="true" />
          {/if}
          <span class="sidebar-token-copy">
            <span class="sidebar-token-name" title={token.name}>{token.name}</span>
            <span class="sidebar-token-detail">{token.detail}</span>
          </span>
        </Button>
      {:else}
        <p class="sidebar-token-empty">{m.no_authenticators_connected()}</p>
      {/each}
    </div>
  </section>

</aside>

<style>
@layer blocks {
    .app-sidebar {
      container: sidebar / inline-size;
      display: grid;
      grid-template-rows: var(--shell-titlebar-block-size) minmax(0, 1fr) auto;
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
      grid-template-columns: 16px minmax(0, 1fr);
      gap: var(--space-3);
      align-items: center;
      min-width: 0;
      border-bottom: 1px solid var(--topbar-border, var(--border));
      background: var(--sidebar-background, var(--sidebar));
      padding: 0 var(--space-4) 0 var(--space-5);
      --wails-non-client-region: caption;
      --wails-draggable: drag;
    }

    .sidebar-mark {
      display: grid;
      place-items: center;
      width: 16px;
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
      padding: var(--space-4);
      background: var(--sidebar-background, var(--sidebar));
    }

    .sidebar-nav :global(.sidebar-nav-button) {
      width: 100%;
      justify-content: flex-start;
      text-align: left;
    }

    .sidebar-tokens {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
      border-top: 1px solid var(--window-border);
      padding: var(--space-3) var(--space-4) var(--space-4);
    }

    .sidebar-section-title {
      color: var(--muted-foreground);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .sidebar-token-list {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
      max-height: 13rem;
      overflow-y: auto;
    }

    .sidebar-token-list :global(.sidebar-token-button) {
      justify-content: flex-start;
      width: 100%;
      height: auto;
      min-width: 0;
      padding-block: var(--space-2);
      text-align: left;
    }

    .sidebar-token-copy {
      display: grid;
      flex: 1 1 auto;
      min-width: 0;
      line-height: 1.15;
    }

    .sidebar-token-name,
    .sidebar-token-detail {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-token-name {
      font-weight: 500;
    }

    .sidebar-token-detail,
    .sidebar-token-empty {
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .sidebar-token-empty {
      margin: 0;
      line-height: 1.35;
    }

}

@layer exceptions {
    .app-sidebar[data-native-titlebar="true"] {
      grid-template-rows: 36px auto minmax(0, 1fr) auto;
    }

    .app-sidebar[data-native-titlebar="true"] .sidebar-brand {
      min-height: var(--shell-titlebar-block-size);
      border-bottom: 0;
      background: var(--sidebar-background, var(--sidebar));
      --wails-non-client-region: initial;
      --wails-draggable: no-drag;
    }

    .app-sidebar[data-native-titlebar="true"] .sidebar-titlebar-space {
      background: var(--sidebar-background, var(--sidebar));
    }

    .app-sidebar[data-native-titlebar="true"] .sidebar-nav {
      padding-block-start: var(--space-2);
    }
}
</style>
