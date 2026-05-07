<script lang="ts">
  import { operationFailed } from "../lib/api";
  import { loadOverview } from "../lib/controller";
  import { overviewEnvelope, overviewLoading, selectedDevice, selectedSelector, sessionBusy, sessionStatus } from "../lib/stores";
  import { resultOf, sessionStateLabel, stateLabel } from "../lib/format";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
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

  $: selector = $selectedSelector;
  $: envelope = $overviewEnvelope;
  $: loading = $overviewLoading;
  $: report = resultOf(envelope);
  $: device = report?.device || $selectedDevice || {};
  $: info = report?.info || {};
  $: options = info?.options || {};
  $: extensions = Array.isArray(info?.extensions) ? info.extensions : [];
  $: extensionsKnown = Array.isArray(info?.extensions);
  $: productName = [device.manufacturer, device.product].filter(Boolean).join(" ") || device.product || device.deviceId || "Selected authenticator";
  $: versions = info.versions || [];
  $: identityMetrics = [
    { label: "Transport", value: device.transport || "unknown" },
    { label: "Session", value: sessionStateLabel($sessionStatus.state) },
    { label: "AAGUID", value: info.aaguid || "not reported" },
    { label: "Versions", value: versions.join(", ") || "unknown" },
  ];
  $: extensionItems = extensionCatalog.map((item) => ({ ...item, state: extensionState(item.id), supported: extensions.includes(item.id) }));
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
  ];
  $: flatCapabilities = capabilityGroups.flatMap((group) => group.items);
  $: knownCapabilities = flatCapabilities.filter((item) => item.known);
  $: supportedCapabilities = flatCapabilities.filter((item) => item.supported);
  $: capabilitySummary = knownCapabilities.length ? `${supportedCapabilities.length}/${knownCapabilities.length}` : "unknown";

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
  <section id="overview-dashboard" class="token-dashboard">
    <div class="token-identity">
      <p class="eyebrow">Overview</p>
      <h1>{productName}</h1>
      <p>{device.deviceId || "Device identity reported by the current transport."}</p>
      <div class="actions">
        <button type="button" on:click={() => loadOverview(selector)} disabled={loading || $sessionBusy}>{loading ? "Reloading overview" : "Reload overview"}</button>
      </div>
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

  {#if operationFailed(envelope)}
    <div class="notice danger">{operationFailed(envelope)}</div>
  {/if}

  <section class="overview-flow">
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

    <section class="extensions-section">
      <div class="section-heading">
        <div>
          <h2>Extensions</h2>
          <p class="muted">CTAP 2.2 defined extension identifiers and support reported by this authenticator.</p>
        </div>
        <span class="muted">{extensionItems.filter((item) => item.supported).length} supported</span>
      </div>
      <div class="extension-table">
        {#each extensionItems as item}
          <article class:supported={item.supported} class="extension-row">
            <div class="extension-id">
              <strong>{item.id}</strong>
              <span>{item.title}</span>
            </div>
            <p>{item.text}</p>
            <StatusBadge value={item.state} label={stateLabel(item.state)} />
          </article>
        {/each}
      </div>
    </section>

    <details class="technical raw-report">
      <summary>Raw technical report</summary>
      <JsonView value={report} title="Inspection result" variant="bare" />
    </details>
  </section>
{:else}
  <section class="screen-band">
    <div>
      <p class="eyebrow">Overview</p>
      <h1>Token dashboard</h1>
      <p class="lede">Identity, session state, capabilities, and raw CTAP inspection in one scan-friendly view.</p>
    </div>
    <button type="button" on:click={() => loadOverview(selector)} disabled={loading || $sessionBusy}>{loading ? "Reloading overview" : "Reload overview"}</button>
  </section>

  {#if operationFailed(envelope)}
    <div class="notice danger">{operationFailed(envelope)}</div>
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
    <EmptyState eyebrow="Ready to inspect" title="Overview not loaded" message="Reload overview to inspect the selected authenticator." />
  {/if}
{/if}
