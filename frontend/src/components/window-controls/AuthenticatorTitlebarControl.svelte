<script lang="ts">
  import { Check, ChevronDown, RefreshCw, ShieldCheck, X } from "@lucide/svelte";
  import { Select, Tooltip } from "bits-ui";
  import type { DeviceReport } from "../../../bindings/github.com/go-ctap/kit/model/report";
  import { refreshDiscovery, selectToken } from "$lib/controller";
  import { devices, selectedDevice, selectedSelector, sessionBusy, sessionStatus } from "$lib/stores";
  import { deviceDetail, deviceName, labelDevice, sessionStateLabel } from "$lib/format";
  import { selectorFromDevice } from "$lib/api";
  import { m } from "../../paraglide/messages.js";

  type Props = {
    refreshing?: boolean;
  };

  let { refreshing = false }: Props = $props();
  let localRefreshing = $state(false);

  let disabled = $derived(refreshing || localRefreshing || $sessionBusy);
  let selectedName = $derived($selectedDevice ? deviceName($selectedDevice) : m.no_token_selected());
  let selectedDetail = $derived.by(() => {
    if ($selectedDevice) return deviceDetail($selectedDevice);
    return $devices.length ? m.select_authenticator() : m.no_authenticators_connected();
  });
  let selectedTransport = $derived($selectedDevice ? transportLabel($selectedDevice.transport) : m.transport());
  let sessionText = $derived(sessionStateLabel($sessionStatus.state));
  let selectItems = $derived($devices.map((device) => ({ value: selectorFromDevice(device), label: labelDevice(device) })));

  async function handleSelect(value: string | string[]) {
    if (Array.isArray(value)) return;
    if (value === $selectedSelector || disabled) return;
    await selectToken(value);
  }

  async function handleClear() {
    if (!$selectedSelector || disabled) return;
    await selectToken("");
  }

  async function handleRefresh() {
    if (disabled) return;
    localRefreshing = true;
    try {
      await refreshDiscovery();
    } finally {
      localRefreshing = false;
    }
  }

  function transportLabel(value: DeviceReport["transport"]) {
    return String(value || m.state_unknown()).replaceAll("-", " ");
  }
</script>

<Tooltip.Provider delayDuration={450} skipDelayDuration={80}>
  <div class="auth-titlebar" data-window-drag-exclude data-busy={disabled ? "true" : undefined}>
    <Select.Root type="single" value={$selectedSelector} onValueChange={handleSelect} disabled={disabled} items={selectItems}>
      <Select.Trigger aria-label={m.select_authenticator()} data-window-drag-exclude>
        {selectedName}
      </Select.Trigger>

      <Select.Portal>
        <Select.Content side="bottom" align="start" sideOffset={6}>
          <Select.Viewport>
            {#each $devices as device (selectorFromDevice(device))}
              {@const selector = selectorFromDevice(device)}
              <Select.Item value={selector} label={labelDevice(device)}>
                {#snippet children({ selected })}
                  {deviceName(device)}{transportLabel(device.transport)} - {deviceDetail(device) || selector}
                  {#if selected}
                    <Check size={15} strokeWidth={2.2} aria-hidden="true" />
                  {/if}
                {/snippet}
              </Select.Item>
            {:else}
              {m.no_authenticators_connected()}
            {/each}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>

    <Tooltip.Root>
      <Tooltip.Trigger type="button" aria-label={m.refresh_devices()} disabled={disabled} onclick={handleRefresh}>
        <RefreshCw size={15} strokeWidth={2} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" sideOffset={7}>
          {m.refresh_devices()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger type="button" aria-label={m.clear_selection()} disabled={!$selectedSelector || disabled} onclick={handleClear}>
        <X size={15} strokeWidth={2} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" sideOffset={7}>
          {m.clear_selection()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </div>
</Tooltip.Provider>

<style>

</style>
