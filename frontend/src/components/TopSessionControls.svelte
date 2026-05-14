<script lang="ts">
  import { Ellipsis, LockKeyhole, LockKeyholeOpen, MailCheck } from "@lucide/svelte";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { closeAllSessions, closeSelectedSession, openSelectedSession } from "$lib/controller";
  import { selectedSelector, sessions, sessionBusy, sessionStatus } from "$lib/stores";
  import { m } from "../paraglide/messages.js";

  let openSessions = $derived($sessions.filter((session) => session && session.state !== "closed"));
  let backgroundSessions = $derived(openSessions.filter((session) => isBackgroundSession(session)));
  let canOpenSelected = $derived(Boolean($selectedSelector) && ["idle", "closed", "stale", "error"].includes($sessionStatus.state || ""));
  let canCloseSelected = $derived($sessionStatus.state === "ready");
  let hasOpenSessions = $derived(openSessions.length > 0 || canCloseSelected);

  function sessionSelector(session: any) {
    const device = session?.selectedDevice || {};
    return session?.selectedSelector || session?.deviceId || device.deviceId || device.ordinalAlias || "";
  }

  function isBackgroundSession(session: any) {
    if (!session || session.state === "closed") return false;
    const selector = sessionSelector(session);
    const device = session.selectedDevice || {};
    return Boolean(selector) && selector !== $selectedSelector && device.deviceId !== $selectedSelector && device.ordinalAlias !== $selectedSelector;
  }

  async function openSelected() {
    await openSelectedSession($selectedSelector);
  }
</script>

<div class="flex min-w-0 items-center justify-end gap-2">
  {#if backgroundSessions.length}
    <span
      class="hidden h-11 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/45 bg-background/70 text-sm font-semibold tabular-nums text-muted-foreground sm:inline-flex"
      title={m.background_sessions_description()}
      aria-label={m.background_sessions_count({ count: backgroundSessions.length })}
    >
      {m.background_sessions_count({ count: backgroundSessions.length })}
    </span>
  {/if}

  {#if canOpenSelected}
    <Button
      variant="outline"
      size="sm"
      type="button"
      onclick={openSelected}
      disabled={$sessionBusy}
      aria-label={m.open_session()}
      title={m.open_session()}
      class="h-11 shrink-0 px-3"
    >
      <LockKeyholeOpen />
      <span class="hidden sm:inline">{m.open()}</span>
    </Button>
  {/if}

  <ButtonGroup.Root class="shrink-0">
    <Button
      variant="outline"
      size="sm"
      type="button"
      onclick={closeSelectedSession}
      disabled={!canCloseSelected || $sessionBusy}
      aria-label={m.close_session()}
      title={m.close_session()}
      class="h-11 px-3"
    >
      <LockKeyhole />
      <span class="hidden lg:inline">{m.close_session()}</span>
      <span class="lg:hidden">{m.close_session()}</span>
    </Button>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="outline"
            size="icon-lg"
            class="size-11"
            aria-label={m.close_all_sessions()}
            title={m.close_all_sessions()}
          >
            <Ellipsis />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-max min-w-44">
        <DropdownMenu.Group>
          <DropdownMenu.Item
            onclick={closeAllSessions}
            disabled={!hasOpenSessions || $sessionBusy}
            variant="destructive"
            class="whitespace-nowrap"
          >
            <MailCheck />
            <span>{m.close_all_sessions()}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </ButtonGroup.Root>
</div>
