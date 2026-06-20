<script lang="ts">
  import { LockKeyhole, LockKeyholeOpen, MailCheck } from "@lucide/svelte";
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

<div class="session-controls cluster">
  {#if backgroundSessions.length}
    <span
      class="background-count"
      title={m.background_sessions_description()}
      aria-label={m.background_sessions_count({ count: backgroundSessions.length })}
    >
      {m.background_sessions_count({ count: backgroundSessions.length })}
    </span>
  {/if}

  {#if canOpenSelected}
    <button type="button" onclick={openSelected} disabled={$sessionBusy} title={m.open_session()}>
      <LockKeyholeOpen size={15} />
      <span>{m.open()}</span>
    </button>
  {/if}

  <button
    type="button"
    onclick={closeSelectedSession}
    disabled={!canCloseSelected || $sessionBusy}
    title={m.close_session()}
  >
    <LockKeyhole size={15} />
    <span>{m.close_session()}</span>
  </button>

  <button
    type="button"
    onclick={closeAllSessions}
    disabled={!hasOpenSessions || $sessionBusy}
    title={m.close_all_sessions()}
  >
    <MailCheck size={15} />
    <span>{m.close_all_sessions()}</span>
  </button>
</div>

<style>
  .session-controls {
    min-width: 0;
    --cluster-justify: flex-end;
  }

  .background-count {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    border: 1px dashed var(--color-border-strong);
    border-radius: var(--radius-control);
    color: var(--color-text-muted);
    padding: 0 var(--space-2);
    font-size: 0.8rem;
    font-weight: 700;
  }

  @media (max-width: 1100px) {
    button span,
    .background-count {
      display: none;
    }

    button {
      width: 36px;
      padding: 0;
    }
  }
</style>
