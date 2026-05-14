<script lang="ts">
  import { CircleAlert, CircleCheck, CircleDashed, CircleOff, LoaderCircle } from "@lucide/svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { deviceDetail, deviceName, labelDevice } from "$lib/format";
  import { m } from "../paraglide/messages.js";

  const TRANSPORT_BADGE_CLASS =
    "h-5 max-w-full rounded px-1.5 font-mono text-[0.65rem] font-semibold uppercase leading-none tracking-normal !border-border/80 !bg-background/80 !text-foreground/75";

  type Props = {
    devices: any[];
    sessions?: any[];
    value: string;
    disabled?: boolean;
    sessionState?: string;
    sessionLabel?: string;
    onSelect: (selector: string) => void | Promise<void>;
  };

  let { devices, sessions = [], value, disabled = false, sessionState = "idle", sessionLabel = "", onSelect }: Props = $props();

  let selectedDevice = $derived(devices.find((device) => matchesDevice(device, value)) || null);
  let selectedDetail = $derived(deviceDetail(selectedDevice));
  let selectedIconClass = $derived(sessionIconClass(sessionState));

  function matchesDevice(device: any, selector: string) {
    return deviceValue(device) === selector || device.deviceId === selector || device.ordinalAlias === selector;
  }

  function deviceValue(device: any) {
    return String(device?.deviceId || device?.ordinalAlias || "");
  }

  function sessionSelector(session: any) {
    const device = session?.selectedDevice || {};
    return session?.selectedSelector || session?.deviceId || device.deviceId || device.ordinalAlias || "";
  }

  function sessionMatchesDevice(session: any, device: any) {
    if (!session || !device) return false;
    const selector = sessionSelector(session);
    return Boolean(selector) && (matchesDevice(device, selector) || device.deviceId === selector || device.ordinalAlias === selector);
  }

  function sessionStateForDevice(device: any) {
    if (value && matchesDevice(device, value)) return sessionState;
    const session = sessions.find((candidate) => sessionMatchesDevice(candidate, device));
    return session?.state || "idle";
  }

  function transportLabel(device: any) {
    return device?.transport || m.state_unknown();
  }

  function compactIdentifier(device: any) {
    const value = deviceDetail(device) || deviceValue(device);
    if (!value || value.length <= 22) return value;
    return `${value.slice(0, 10)}...${value.slice(-6)}`;
  }

  function sessionIconClass(state: string) {
    if (state === "ready") return "text-emerald-600";
    if (state === "opening" || state === "running") return "text-sky-600";
    if (state === "stale" || state === "error") return "text-destructive";
    if (state === "closed") return "text-muted-foreground";
    return "text-muted-foreground";
  }

  function sessionIconTitle(state: string) {
    return state ? sessionStateText(state) : m.state_unknown();
  }

  function sessionStateText(state: string) {
    const labels: Record<string, string> = {
      idle: m.session_idle(),
      opening: m.session_opening(),
      ready: m.session_ready(),
      running: m.session_running(),
      stale: m.session_stale(),
      closed: m.session_closed(),
      error: m.session_error(),
    };
    return labels[state] || m.unknown_session_state({ state: state.replaceAll("_", " ") });
  }

  function handleValueChange(nextValue: string) {
    if (!nextValue || nextValue === value) return;
    void onSelect(nextValue);
  }
</script>

<Select.Root
  type="single"
  name="token-select"
  value={value}
  onValueChange={handleValueChange}
  disabled={disabled || devices.length === 0}
>
  <Select.Trigger class="!h-11 w-full min-w-0 justify-between rounded-md px-2.5 py-1.5" aria-label={m.authenticator()}>
    <span class="grid min-w-0 flex-1 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2.5 text-left">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/70" title={sessionLabel}>
        {#if sessionState === "ready"}
          <CircleCheck class={`size-4 ${selectedIconClass}`} />
        {:else if sessionState === "opening" || sessionState === "running"}
          <LoaderCircle class={`size-4 animate-spin ${selectedIconClass}`} />
        {:else if sessionState === "stale" || sessionState === "error"}
          <CircleAlert class={`size-4 ${selectedIconClass}`} />
        {:else if sessionState === "closed"}
          <CircleOff class={`size-4 ${selectedIconClass}`} />
        {:else}
          <CircleDashed class={`size-4 ${selectedIconClass}`} />
        {/if}
      </span>

      <span class="grid min-w-0 flex-1 gap-0.5 leading-tight">
        <span class="truncate text-sm font-semibold">{selectedDevice ? deviceName(selectedDevice) : m.select_authenticator()}</span>
        <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {#if selectedDevice}
            {#if selectedDetail}
              <span class="min-w-0 truncate font-mono">{compactIdentifier(selectedDevice)}</span>
            {/if}
            <Badge variant="outline" class={TRANSPORT_BADGE_CLASS}>{transportLabel(selectedDevice)}</Badge>
          {:else}
            <span class="truncate">{m.no_authenticator_selected()}</span>
          {/if}
        </span>
      </span>
    </span>
  </Select.Trigger>
  <Select.Content align="start" sideOffset={6} class="max-h-[18rem] w-[min(32rem,calc(100vw-1rem))] min-w-(--bits-select-anchor-width)">
    <Select.Group>
      {#each devices as device (deviceValue(device))}
        {@const rowSessionState = sessionStateForDevice(device)}
        {@const rowIconClass = sessionIconClass(rowSessionState)}
        <Select.Item value={deviceValue(device)} label={labelDevice(device)} class="items-center rounded-md py-2 pr-9 pl-2.5">
          <span class="grid min-w-0 flex-1 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2.5">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-background" title={sessionIconTitle(rowSessionState)}>
              {#if rowSessionState === "ready"}
                <CircleCheck class={`size-4 ${rowIconClass}`} />
              {:else if rowSessionState === "opening" || rowSessionState === "running"}
                <LoaderCircle class={`size-4 animate-spin ${rowIconClass}`} />
              {:else if rowSessionState === "stale" || rowSessionState === "error"}
                <CircleAlert class={`size-4 ${rowIconClass}`} />
              {:else if rowSessionState === "closed"}
                <CircleOff class={`size-4 ${rowIconClass}`} />
              {:else}
                <CircleDashed class={`size-4 ${rowIconClass}`} />
              {/if}
            </span>
            <span class="grid min-w-0 gap-0.5">
              <span class="truncate text-sm font-medium">{deviceName(device)}</span>
              <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <span class="min-w-0 truncate font-mono">{compactIdentifier(device) || deviceValue(device)}</span>
                <Badge variant="outline" class={TRANSPORT_BADGE_CLASS}>{transportLabel(device)}</Badge>
              </span>
            </span>
          </span>
        </Select.Item>
      {/each}
    </Select.Group>
  </Select.Content>
</Select.Root>
