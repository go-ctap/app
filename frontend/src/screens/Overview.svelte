<script lang="ts">
  import { operationFailed } from "$lib/api";
  import { loadOverview } from "$lib/controller";
  import { overviewEnvelope, overviewLoading, selectedDevice, selectedSelector, sessionBusy, sessionStatus } from "$lib/stores";
  import { resultOf, sessionStateLabel, stateLabel } from "$lib/format";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import Notice from "../components/Notice.svelte";
  import ScreenHeader from "../components/ScreenHeader.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";

  const extensionCatalog = [
    { id: "credProtect", title: "Credential protection", text: "Stores a credential protection policy, such as requiring user verification for sensitive credentials." },
    { id: "credBlob", title: "Credential blob", text: "Lets an RP attach a small opaque blob when creating a credential." },
    { id: "largeBlobKey", title: "Large blob key", text: "Returns a per-credential key used by the client to read and write entries in the large-blob array." },
    { id: "largeBlob", title: "Large blob", text: "WebAuthn client extension for reading and writing larger per-credential blob data." },
    { id: "minPinLength", title: "Minimum PIN length", text: "Allows an RP to request the current minimum PIN length value when policy permits it." },
    { id: "pinComplexityPolicy", title: "PIN complexity policy", text: "Reports PIN policy requirements so clients can guide a user before setting a PIN." },
    { id: "hmac-secret", title: "HMAC secret", text: "Derives a symmetric secret scoped to a credential for protocols that need shared-key material." },
    { id: "hmac-secret-mc", title: "HMAC secret at creation", text: "Allows secret derivation during makeCredential when hmac-secret is also requested." },
    { id: "thirdPartyPayment", title: "Third-party payment", text: "Marks credentials that can be used for payment authentication initiated by another party." },
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
  let versions = $derived(info.versions || []);
  let extensionItems = $derived(extensionCatalog.map((item) => ({ ...item, state: extensionState(item.id), supported: extensions.includes(item.id) })));
  let capabilityGroups = $derived([
    {
      title: "Sign-in",
      items: [
        capability("Discoverable credentials", options.rk ?? options.residentKey, "Can keep passkeys on the authenticator."),
        capability("User presence", options.up ?? true, "Requires a local touch or presence check."),
        capability("Enterprise attestation", options.ep, "Can support managed attestation flows when enabled."),
      ],
    },
    {
      title: "Verification",
      items: [
        capability("User verification", options.uv, "Can verify the local user before releasing credentials."),
        capability("PIN", options.clientPin ?? Boolean(info.minPINLength || info.maxPINLength), "Supports PIN-backed permissions."),
        capability("Biometric modality", info.uvModality === undefined ? undefined : Boolean(info.uvModality), "Reports a platform verification sensor."),
      ],
    },
    {
      title: "Storage",
      items: [
        capability("Large blobs", extensions.includes("largeBlobKey") || Boolean(info.maxSerializedLargeBlobArray), "Can store app data beside credentials."),
        capability("Credential management", options.credMgmt ?? options.credentialMgmtPreview, "Can list or manage resident credentials."),
        capability("Maximum blob array", info.maxSerializedLargeBlobArray, "Reported large-blob storage ceiling."),
      ],
    },
    {
      title: "Administration",
      items: [
        capability("Authenticator config", extensions.includes("authenticatorConfig") || options.alwaysUv, "Supports policy configuration such as always-UV."),
        capability("Minimum PIN length", info.minPINLength || options.setMinPINLength, "Can report or enforce PIN policy."),
        capability("Authenticator reset", resetState(), "Reports reset hints independently from PIN or user verification support."),
      ],
    },
    {
      title: "Protocol",
      items: [
        capability("PIN/UV protocols", (info.pinUvAuthProtocols || []).length, "Advertises CTAP PIN/UV protocol versions."),
        capability("Extensions", extensionsKnown ? extensions.length : undefined, "Reports optional CTAP extension support."),
        capability("Algorithms", (info.algorithms || []).length, "Advertises public-key algorithm choices."),
      ],
    },
  ]);
  let flatCapabilities = $derived(capabilityGroups.flatMap((group) => group.items));
  let knownCapabilities = $derived(flatCapabilities.filter((item) => item.known));
  let supportedCapabilities = $derived(flatCapabilities.filter((item) => item.supported));
  let capabilitySummary = $derived(knownCapabilities.length ? `${supportedCapabilities.length}/${knownCapabilities.length}` : "unknown");
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
  let capabilityRows = $derived(capabilityGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title }))));

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
</script>

{#if !selector}
  <EmptyState eyebrow="No token" title="Choose a token" message="Connect an authenticator and select it in the top bar to see what it can do." />
{:else if report}
  <ScreenHeader eyebrow="Overview" title={productName} description={device.deviceId || "Device identity reported by the current transport."}>
    {#snippet actions()}
      <Button onclick={() => loadOverview(selector)} disabled={loading || $sessionBusy}>{loading ? "Reloading overview" : "Reload overview"}</Button>
    {/snippet}
  </ScreenHeader>

  {#if operationFailed(envelope)}
    <Notice variant="destructive">{operationFailed(envelope)}</Notice>
  {/if}

  <section class="grid gap-4">
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Card.Root>
        <Card.Header class="flex-row items-start justify-between gap-3">
          <div class="grid gap-1">
            <Card.Title>Authenticator Identity</Card.Title>
            <Card.Description>Transport and protocol values reported by the selected token.</Card.Description>
          </div>
          <StatusBadge value={$sessionStatus.state} label={sessionStateLabel($sessionStatus.state)} />
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Body>
              {#each identityRows as row (row.label)}
                <Table.Row>
                  <Table.Cell class="w-[190px] text-muted-foreground">{row.label}</Table.Cell>
                  <Table.Cell class="break-words font-medium">{row.value}</Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="flex-row items-start justify-between gap-3">
          <div class="grid gap-1">
            <Card.Title>Capabilities</Card.Title>
            <Card.Description>{capabilitySummary} known capabilities supported.</Card.Description>
          </div>
          <span class="text-sm text-muted-foreground">{extensions.length} extension(s)</span>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Body>
              {#each capabilityRows as item (`${item.group}:${item.title}`)}
                <Table.Row>
                  <Table.Cell class="w-[110px] text-muted-foreground">{item.group}</Table.Cell>
                  <Table.Cell>
                    <div class="grid gap-1">
                      <span class="font-medium">{item.title}</span>
                      <span class="text-xs text-muted-foreground">{item.text}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell class="w-[120px] text-right">
                    <StatusBadge value={item.state} label={stateLabel(item.state)} />
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>
    </div>

    <Card.Root>
      <Card.Header class="flex-row items-start justify-between gap-3">
        <div class="grid gap-1">
          <Card.Title>Extensions</Card.Title>
          <Card.Description>CTAP 2.2 defined extension identifiers and support reported by this authenticator.</Card.Description>
        </div>
        <span class="text-sm text-muted-foreground">{extensionItems.filter((item) => item.supported).length} supported</span>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Extension</Table.Head>
              <Table.Head>Description</Table.Head>
              <Table.Head class="text-right">State</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each extensionItems as item (item.id)}
              <Table.Row>
                <Table.Cell>
                  <div class="grid gap-1">
                    <strong class="break-all font-medium">{item.id}</strong>
                    <span class="text-xs text-muted-foreground">{item.title}</span>
                  </div>
                </Table.Cell>
                <Table.Cell class="text-muted-foreground">{item.text}</Table.Cell>
                <Table.Cell class="text-right"><StatusBadge value={item.state} label={stateLabel(item.state)} /></Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>

    <details class="rounded-md border bg-card p-4">
      <summary>Raw technical report</summary>
      <JsonView value={report} title="Inspection result" variant="bare" />
    </details>
  </section>
{:else}
  <ScreenHeader eyebrow="Overview" title="Token dashboard" description="Identity, session state, capabilities, and raw CTAP inspection in one scan-friendly view.">
    {#snippet actions()}
      <Button onclick={() => loadOverview(selector)} disabled={loading || $sessionBusy}>{loading ? "Reloading overview" : "Reload overview"}</Button>
    {/snippet}
  </ScreenHeader>

  {#if operationFailed(envelope)}
    <Notice variant="destructive">{operationFailed(envelope)}</Notice>
  {:else if loading}
    <Card.Root>
      <Card.Header>
        <Card.Description>Reading token</Card.Description>
        <Card.Title>Inspection in progress</Card.Title>
        <Card.Description>The workbench is opening a session and collecting authenticator metadata.</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {#each ["Transport", "Session", "AAGUID", "Versions", "Capability summary"] as label (label)}
          <div class="grid gap-2 rounded-md border border-border p-3">
            <span class="text-sm text-muted-foreground">{label}</span>
            <Skeleton class="h-5 w-24" />
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  {:else}
    <EmptyState eyebrow="Ready to inspect" title="Overview not loaded" message="Reload overview to inspect the selected authenticator." />
  {/if}
{/if}
