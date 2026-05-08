<script lang="ts">
  import { operationFailed } from "$lib/api";
  import { loadOverview } from "$lib/controller";
  import { overviewEnvelope, overviewLoading, selectedDevice, selectedSelector, sessionBusy, sessionStatus } from "$lib/stores";
  import { resultOf, sessionStateLabel, stateLabel } from "$lib/format";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import Notice from "../components/Notice.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";

  const extensionCatalog = [
    { id: "credProtect", title: "Credential protection", text: "Credential protection policy" },
    { id: "credBlob", title: "Credential blob", text: "Small opaque blob at credential creation" },
    { id: "largeBlobKey", title: "Large blob key", text: "Per-credential key for large-blob entries" },
    { id: "largeBlob", title: "Large blob", text: "Read/write larger per-credential blob data" },
    { id: "minPinLength", title: "Minimum PIN length", text: "Minimum PIN length policy" },
    { id: "pinComplexityPolicy", title: "PIN complexity policy", text: "PIN policy requirements" },
    { id: "hmac-secret", title: "HMAC secret", text: "Credential-scoped symmetric secret" },
    { id: "hmac-secret-mc", title: "HMAC secret at creation", text: "Secret derivation during makeCredential" },
    { id: "thirdPartyPayment", title: "Third-party payment", text: "Payment authentication marker" },
  ];

  let selector = $derived($selectedSelector);
  let envelope = $derived($overviewEnvelope);
  let loading = $derived($overviewLoading);
  let report = $derived(resultOf(envelope));
  let device = $derived(report?.device || $selectedDevice || {});
  let info = $derived(report?.info || {});
  let options = $derived(info?.options || {});
  let extensions = $derived(Array.isArray(info?.extensions) ? info.extensions : []);
  let extensionsKnown = $derived(Array.isArray(info?.extensions));
  let productName = $derived([device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId || "Selected authenticator");
  let versions = $derived(Array.isArray(info.versions) ? info.versions : []);
  let extensionItems = $derived(extensionCatalog.map((item) => ({ ...item, state: extensionState(item.id), supported: extensions.includes(item.id) })));
  let capabilityGroups = $derived([
    {
      title: "Sign-in",
      items: [
        capability("Discoverable credentials", options.rk ?? options.residentKey, "Stored passkeys"),
        capability("User presence", options.up ?? true, "Touch or presence check"),
        capability("Enterprise attestation", options.ep, "Managed attestation"),
      ],
    },
    {
      title: "Verification",
      items: [
        capability("User verification", options.uv, "Local user verification"),
        capability("PIN", options.clientPin ?? Boolean(info.minPINLength || info.maxPINLength), "PIN-backed permissions"),
        capability("Biometric modality", info.uvModality === undefined ? undefined : Boolean(info.uvModality), "Verification sensor report"),
      ],
    },
    {
      title: "Storage",
      items: [
        capability("Large blobs", extensions.includes("largeBlobKey") || Boolean(info.maxSerializedLargeBlobArray), "Credential-adjacent app data"),
        capability("Credential management", options.credMgmt ?? options.credentialMgmtPreview, "Resident credential management"),
        capability("Maximum blob array", info.maxSerializedLargeBlobArray, "Large-blob array ceiling"),
      ],
    },
    {
      title: "Administration",
      items: [
        capability("Authenticator config", extensions.includes("authenticatorConfig") || options.alwaysUv, "Policy configuration"),
        capability("Minimum PIN length", info.minPINLength || options.setMinPINLength, "PIN length controls"),
        capability("Authenticator reset", resetState(), "Reset support hints"),
      ],
    },
    {
      title: "Protocol",
      items: [
        capability("PIN/UV protocols", (info.pinUvAuthProtocols || []).length, "PIN/UV protocol versions"),
        capability("Extensions", extensionsKnown ? extensions.length : undefined, "Optional CTAP extensions"),
        capability("Algorithms", (info.algorithms || []).length, "Public-key algorithms"),
      ],
    },
  ]);
  let capabilityRows = $derived(capabilityGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title }))));
  let knownCapabilities = $derived(capabilityRows.filter((item) => item.known));
  let supportedCapabilities = $derived(capabilityRows.filter((item) => item.supported));
  let identityRows = $derived([
    { label: "Authenticator", value: productName },
    { label: "AAGUID", value: info.aaguid || "not reported" },
    { label: "Transport", value: device.transport || "unknown" },
    { label: "Protocol", value: versions.join(", ") || "unknown" },
    { label: "User verification", value: stateLabel(options.uv) },
    { label: "Client PIN", value: stateLabel(options.clientPin ?? Boolean(info.minPINLength || info.maxPINLength)) },
    { label: "Resident keys", value: stateLabel(options.rk ?? options.residentKey) },
    { label: "Large blob storage", value: info.maxSerializedLargeBlobArray ? `${info.maxSerializedLargeBlobArray} bytes` : stateLabel(extensions.includes("largeBlobKey")) },
    { label: "Minimum PIN length", value: info.minPINLength ?? "not reported" },
    { label: "Maximum PIN length", value: info.maxPINLength ?? "not reported" },
  ]);
  let summaryItems = $derived([
    { label: "Capabilities", value: knownCapabilities.length ? `${supportedCapabilities.length}/${knownCapabilities.length}` : "unknown" },
    { label: "Extensions", value: extensionsKnown ? `${extensions.length}` : "unknown" },
    { label: "PIN/UV protocols", value: (info.pinUvAuthProtocols || []).length || "unknown" },
    { label: "Algorithms", value: (info.algorithms || []).length || "unknown" },
  ]);

  function capability(title: string, state: unknown, text: string) {
    const known = state !== null && state !== undefined && state !== "";
    const supported = state === true || (typeof state === "number" && state > 0) || (typeof state === "string" && !["false", "not reported", "unknown"].includes(state));
    return { title, state, text, known, supported };
  }

  function resetState() {
    if (info.longTouchForReset === true || (info.transportsForReset || []).length > 0) return true;
    if (info.longTouchForReset === false) return false;
    return "not reported";
  }

  function extensionState(id: string) {
    if (!extensionsKnown) return undefined;
    return extensions.includes(id);
  }

  function displayState(value: unknown) {
    if (typeof value === "number" && value > 0) return String(value);
    return stateLabel(value);
  }
</script>

{#if !selector}
  <EmptyState title="Choose an authenticator" message="Connect a token and select it in the top bar." />
{:else if report}
  <section class="grid gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="grid gap-1">
        <h1 class="text-2xl font-semibold tracking-normal">{productName}</h1>
        <p class="m-0 text-sm text-muted-foreground">{device.deviceId || "Current authenticator overview"}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge value={$sessionStatus.state} label={sessionStateLabel($sessionStatus.state)} />
        <Button onclick={() => loadOverview(selector)} disabled={loading || $sessionBusy}>{loading ? "Reloading" : "Reload overview"}</Button>
      </div>
    </div>

    {#if operationFailed(envelope)}
      <Notice variant="destructive">{operationFailed(envelope)}</Notice>
    {/if}

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {#each summaryItems as item (item.label)}
        <Card.Root size="sm">
          <Card.Header>
            <Card.Description>{item.label}</Card.Description>
            <Card.Title class="text-2xl">{item.value}</Card.Title>
          </Card.Header>
        </Card.Root>
      {/each}
    </div>

    <div class="grid gap-4 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Card.Root>
        <Card.Header class="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <Card.Title>Authenticator Identity</Card.Title>
          <Card.Description>Transport and protocol fields</Card.Description>
          <Card.Action>
            <StatusBadge value={$sessionStatus.state} label={$sessionStatus.state === "ready" ? "open" : sessionStateLabel($sessionStatus.state)} />
          </Card.Action>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Body>
              {#each identityRows as row (row.label)}
                <Table.Row>
                  <Table.Cell class="w-[180px] text-muted-foreground">{row.label}</Table.Cell>
                  <Table.Cell class="whitespace-normal break-words font-medium">{row.value}</Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Capabilities</Card.Title>
          <Card.Description>{knownCapabilities.length ? `${supportedCapabilities.length} supported, ${knownCapabilities.length - supportedCapabilities.length} unavailable or unknown` : "No capability report"}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head class="w-[120px]">Group</Table.Head>
                <Table.Head>Capability</Table.Head>
                <Table.Head class="w-[126px] text-right">State</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each capabilityRows as item (`${item.group}:${item.title}`)}
                <Table.Row>
                  <Table.Cell class="text-muted-foreground">{item.group}</Table.Cell>
                  <Table.Cell class="whitespace-normal">
                    <div class="grid gap-1">
                      <span class="font-medium">{item.title}</span>
                      <span class="text-xs text-muted-foreground">{item.text}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell class="text-right">
                    <StatusBadge value={item.state} label={displayState(item.state)} />
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>
    </div>

    <Card.Root>
      <Card.Header class="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <Card.Title>Extensions</Card.Title>
        <Card.Description>CTAP extension identifiers</Card.Description>
        <Card.Action>
          <span class="text-sm text-muted-foreground">{extensionItems.filter((item) => item.supported).length} supported</span>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Extension</Table.Head>
              <Table.Head>Description</Table.Head>
              <Table.Head class="w-[120px] text-right">State</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each extensionItems as item (item.id)}
              <Table.Row>
                <Table.Cell>
                  <div class="grid gap-1">
                    <span class="break-all font-medium">{item.id}</span>
                    <span class="text-xs text-muted-foreground">{item.title}</span>
                  </div>
                </Table.Cell>
                <Table.Cell class="whitespace-normal text-muted-foreground">{item.text}</Table.Cell>
                <Table.Cell class="text-right"><StatusBadge value={item.state} label={stateLabel(item.state)} /></Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>

    <details class="rounded-xl border bg-card p-4 text-sm shadow-xs">
      <summary class="cursor-pointer font-medium">Raw technical report</summary>
      <Separator class="my-4" />
      <JsonView value={report} title="Inspection result" variant="bare" />
    </details>
  </section>
{:else}
  <section class="grid gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="grid gap-1">
        <h1 class="text-2xl font-semibold tracking-normal">Overview</h1>
        <p class="m-0 text-sm text-muted-foreground">Authenticator identity and CTAP capabilities.</p>
      </div>
      <Button onclick={() => loadOverview(selector)} disabled={loading || $sessionBusy}>{loading ? "Reloading" : "Reload overview"}</Button>
    </div>

    {#if operationFailed(envelope)}
      <Notice variant="destructive">{operationFailed(envelope)}</Notice>
    {:else if loading}
      <Card.Root>
        <Card.Header>
          <Card.Title>Inspection in progress</Card.Title>
          <Card.Description>Reading authenticator metadata</Card.Description>
        </Card.Header>
        <Card.Content class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {#each ["Transport", "Session", "AAGUID", "Versions"] as label (label)}
            <div class="grid gap-2 rounded-md border p-3">
              <span class="text-sm text-muted-foreground">{label}</span>
              <Skeleton class="h-5 w-24" />
            </div>
          {/each}
        </Card.Content>
      </Card.Root>
    {:else}
      <EmptyState title="Overview not loaded" message="Reload overview to inspect the selected authenticator.">
        {#snippet actions()}
          <Button onclick={() => loadOverview(selector)} disabled={loading || $sessionBusy}>Reload overview</Button>
        {/snippet}
      </EmptyState>
    {/if}
  </section>
{/if}
