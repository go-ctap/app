<script lang="ts">
  import { RefreshCw, X } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import type { DeviceReport } from "../../../bindings/github.com/go-ctap/kit/model/report";
  import { refreshDiscovery, selectToken } from "$lib/controller";
  import { devices, selectedDevice, selectedSelector, sessionBusy } from "$lib/stores";
  import { deviceDetail, deviceName, labelDevice } from "$lib/format";
  import { selectorFromDevice } from "$lib/api";
  import { m } from "../../paraglide/messages.js";

  type Props = {
    refreshing?: boolean;
  };

  let { refreshing = false }: Props = $props();
  let localRefreshing = $state(false);

  let disabled = $derived(refreshing || localRefreshing || $sessionBusy);
  let selectedName = $derived($selectedDevice ? deviceName($selectedDevice) : m.no_token_selected());
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
  <div class="auth-titlebar" data-busy={disabled ? "true" : undefined}>
    <Select.Root type="single" value={$selectedSelector} onValueChange={handleSelect} disabled={disabled} items={selectItems}>
      <Select.Trigger aria-label={m.select_authenticator()}>
        {selectedName}
      </Select.Trigger>

      <Select.Portal>
        <Select.Content side="bottom" align="start" sideOffset={6}>
          <Select.Group>
            {#each $devices as device (selectorFromDevice(device))}
              {@const selector = selectorFromDevice(device)}
              <Select.Item value={selector} label={labelDevice(device)}>
                <span>{deviceName(device)}</span>
                <span class="auth-item-detail">{transportLabel(device.transport)} - {deviceDetail(device) || selector}</span>
              </Select.Item>
            {:else}
              <Select.Label>{m.no_authenticators_connected()}</Select.Label>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Portal>
    </Select.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon-sm" type="button" aria-label={m.refresh_devices()} disabled={disabled} onclick={handleRefresh}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
          </Button>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="bottom" sideOffset={7}>
          {m.refresh_devices()}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" size="icon-sm" type="button" aria-label={m.clear_selection()} disabled={!$selectedSelector || disabled} onclick={handleClear}>
            <X data-icon="inline-start" aria-hidden="true" />
          </Button>
        {/snippet}
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
@layer blocks {
    .auth-titlebar {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      height: 100%;
      min-width: 0;
    }

    .auth-titlebar :global(button),
    .auth-titlebar :global([role="button"]) {
      --wails-draggable: no-drag;
    }

    .auth-titlebar[data-busy="true"] {
      opacity: 0.76;
    }

    .auth-item-detail {
      color: var(--muted-foreground);
    }
}
</style>
