<script lang="ts">
  import { operationFailed } from "../lib/api";
  import { loadOverview } from "../lib/controller";
  import { overviewEnvelope, overviewLoading, selectedDevice, selectedSelector, sessionBusy, sessionStatus } from "../lib/stores";
  import { resultOf, stateLabel } from "../lib/format";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";
  import MetaRow from "../components/MetaRow.svelte";

  $: selector = $selectedSelector;
  $: envelope = $overviewEnvelope;
  $: loading = $overviewLoading;
  $: report = resultOf(envelope);
  $: device = report?.device || $selectedDevice || {};
  $: info = report?.info || {};
  $: options = info?.options || {};
  $: extensions = info?.extensions || [];
  $: productName = [device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId || "Selected authenticator";
  $: versions = info.versions || [];
  $: identityMetrics = [
    { label: "Transport", value: device.transport || "unknown" },
    { label: "Session", value: stateLabel($sessionStatus.state) },
    { label: "AAGUID", value: info.aaguid || "not reported" },
    { label: "Versions", value: versions.join(", ") || "unknown" },
  ];
  $: capabilityGroups = [
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
        capability("Biometric modality", Boolean(info.uvModality), "Reports a platform verification sensor."),
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
        capability("Factory reset hints", info.longTouchForReset || (info.transportsForReset || []).length > 0, "Reports reset availability or transport hints."),
      ],
    },
    {
      title: "Protocol",
      items: [
        capability("PIN/UV protocols", (info.pinUvAuthProtocols || []).length, "Advertises CTAP PIN/UV protocol versions."),
        capability("Extensions", extensions.length, "Reports optional CTAP extension support."),
        capability("Algorithms", (info.algorithms || []).length, "Advertises public-key algorithm choices."),
      ],
    },
  ];
  $: flatCapabilities = capabilityGroups.flatMap((group) => group.items);
  $: knownCapabilities = flatCapabilities.filter((item) => item.known);
  $: supportedCapabilities = flatCapabilities.filter((item) => item.supported);
  $: capabilitySummary = knownCapabilities.length ? `${supportedCapabilities.length}/${knownCapabilities.length}` : "unknown";

  function capability(title: string, state: unknown, text: string) {
    const known = state !== null && state !== undefined && state !== "";
    const supported = state === true || (typeof state === "number" && state > 0) || (typeof state === "string" && state.length > 0 && state !== "false");
    return { title, state, text, known, supported };
  }
</script>

{#if !selector}
  <EmptyState title="Choose a token" message="Connect an authenticator and select it in the top bar to see what it can do." />
{:else}
  <section class="screen-band">
    <div>
      <p class="eyebrow">Overview</p>
      <h1>Token dashboard</h1>
      <p class="lede">Identity, session state, capabilities, and raw CTAP inspection in one scan-friendly view.</p>
    </div>
    <button type="button" on:click={() => loadOverview(selector)} disabled={loading || $sessionBusy}>{loading ? "Loading" : "Refresh"}</button>
  </section>

  {#if operationFailed(envelope)}
    <div class="notice danger">{operationFailed(envelope)}</div>
  {/if}

  {#if report}
    <section id="overview-dashboard" class="token-dashboard">
      <div class="token-identity">
        <p class="eyebrow">Selected token</p>
        <h2>{productName}</h2>
        <p>{device.deviceId || "Device identity reported by the current transport."}</p>
      </div>
      <div class="metric-strip">
        {#each identityMetrics as metric}
          <div class="identity-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        {/each}
        <div class="identity-metric strong">
          <span>Capability summary</span>
          <strong>{capabilitySummary}</strong>
        </div>
      </div>
    </section>

    <section class="overview-columns">
      <div class="capability-story">
        {#each capabilityGroups as group}
          <section class="capability-group">
            <div class="section-heading">
              <h2>{group.title}</h2>
              <span class="muted">{group.items.filter((item) => item.supported).length} supported</span>
            </div>
            {#each group.items as item}
              <article class:supported={item.supported} class:unknown={!item.known} class="capability-line">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
                <StatusBadge value={item.state} label={stateLabel(item.state)} />
              </article>
            {/each}
          </section>
        {/each}
      </div>

      <aside class="overview-inspector">
        <section class="technical">
          <h2>Identity details</h2>
          <MetaRow label="Product" value={device.product || "unknown"} />
          <MetaRow label="Manufacturer" value={device.manufacturer || "unknown"} />
          <MetaRow label="Transport" value={device.transport || "unknown"} />
          <MetaRow label="AAGUID" value={info.aaguid || "not reported"} />
          <MetaRow label="Extensions" value={extensions.join(", ") || "none reported"} />
          <MetaRow label="PIN/UV protocols" value={(info.pinUvAuthProtocols || []).join(", ") || "unknown"} />
        </section>
        <details class="technical">
          <summary>Raw technical report</summary>
          <JsonView value={report} title="Inspection result" />
        </details>
      </aside>
    </section>
  {:else if loading}
    <section class="token-dashboard loading">
      <div class="token-identity">
        <p class="eyebrow">Reading token</p>
        <h2>Inspection in progress</h2>
        <p>The workbench is opening a session and collecting authenticator metadata.</p>
      </div>
      <div class="metric-strip">
        {#each ["Transport", "Session", "AAGUID", "Versions", "Capability summary"] as label}
          <div class="identity-metric skeleton">
            <span>{label}</span>
            <strong>Reading</strong>
          </div>
        {/each}
      </div>
    </section>
  {:else}
    <EmptyState title="Overview not loaded" message="Refresh to inspect the selected authenticator." />
  {/if}
{/if}
