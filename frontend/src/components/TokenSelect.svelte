<script lang="ts">
  import {
    CircleAlert,
    CircleCheck,
    CircleDashed,
    CircleOff,
    LoaderCircle,
  } from "@lucide/svelte";
  import { deviceDetail, deviceName, labelDevice } from "$lib/format";
  import { m } from "../paraglide/messages.js";

  type Props = {
    devices: any[];
    value: string;
    disabled?: boolean;
    sessionState?: string;
    sessionLabel?: string;
    onSelect: (selector: string) => void | Promise<void>;
  };

  let {
    devices,
    value,
    disabled = false,
    sessionState = "idle",
    sessionLabel = "",
    onSelect,
  }: Props = $props();

  let selectedDevice = $derived(devices.find((device) => matchesDevice(device, value)) || null);
  let selectedDetail = $derived(selectedDevice ? compactIdentifier(selectedDevice) : m.no_authenticator_selected());
  let selectedTransport = $derived(selectedDevice?.transport || m.state_unknown());
  let iconTone = $derived(sessionTone(sessionState));

  function matchesDevice(device: any, selector: string) {
    return deviceValue(device) === selector || device.deviceId === selector || device.ordinalAlias === selector;
  }

  function deviceValue(device: any) {
    return String(device?.deviceId || device?.ordinalAlias || "");
  }

  function sessionTone(state: string) {
    if (state === "ready") return "ok";
    if (state === "opening" || state === "running") return "busy";
    if (state === "stale" || state === "error") return "bad";
    return "muted";
  }

  function compactIdentifier(device: any) {
    const raw = deviceDetail(device) || deviceValue(device);
    if (!raw || raw.length <= 24) return raw;
    return `${raw.slice(0, 12)}...${raw.slice(-7)}`;
  }

  function handleChange(event: Event) {
    const nextValue = (event.currentTarget as HTMLSelectElement).value;
    if (!nextValue || nextValue === value) return;
    void onSelect(nextValue);
  }
</script>

<label class="token-select">
  <span class="session-icon" data-tone={iconTone} title={sessionLabel}>
    {#if sessionState === "ready"}
      <CircleCheck size={16} />
    {:else if sessionState === "opening" || sessionState === "running"}
      <LoaderCircle size={16} class="u-spin" />
    {:else if sessionState === "stale" || sessionState === "error"}
      <CircleAlert size={16} />
    {:else if sessionState === "closed"}
      <CircleOff size={16} />
    {:else}
      <CircleDashed size={16} />
    {/if}
  </span>

  <span class="token-copy">
    <span class="token-title">{selectedDevice ? deviceName(selectedDevice) : m.select_authenticator()}</span>
    <span class="token-detail">
      <span>{selectedDetail}</span>
      {#if selectedDevice}
        <span class="transport">{selectedTransport}</span>
      {/if}
    </span>
  </span>

  <select
    value={value}
    onchange={handleChange}
    disabled={disabled || devices.length === 0}
    aria-label={m.authenticator()}
  >
    <option value="">{m.select_authenticator()}</option>
    {#each devices as device (deviceValue(device))}
      <option value={deviceValue(device)}>
        {labelDevice(device)}
      </option>
    {/each}
  </select>
</label>

<style>
  .token-select {
    position: relative;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: var(--space-2);
    align-items: center;
    min-width: 0;
    height: 42px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-panel);
    padding: var(--space-1) 38px var(--space-1) var(--space-2);
  }

  .token-select:focus-within {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent);
  }

  .session-icon {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-control);
    background: var(--color-panel-soft);
    color: var(--color-text-muted);
  }

  .session-icon[data-tone="ok"] {
    color: var(--color-success);
  }

  .session-icon[data-tone="busy"] {
    color: var(--color-info);
  }

  .session-icon[data-tone="bad"] {
    color: var(--color-danger);
  }

  .token-copy {
    display: grid;
    min-width: 0;
    gap: 1px;
    line-height: 1.15;
  }

  .token-title,
  .token-detail span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .token-title {
    font-size: 0.875rem;
    font-weight: 700;
  }

  .token-detail {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }

  .transport {
    flex: 0 0 auto;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 1px 5px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
  }

  select {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  select:disabled {
    cursor: not-allowed;
  }

</style>
