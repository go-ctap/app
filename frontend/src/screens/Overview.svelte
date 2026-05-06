<script lang="ts">
  import { api, operationFailed } from "../lib/api";
  import { selectedSelector } from "../lib/stores";
  import { resultOf, stateLabel } from "../lib/format";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";

  let loading = false;
  let envelope: any = null;
  let loadedFor = "";

  $: selector = $selectedSelector;
  $: if (selector && selector !== loadedFor) load(selector);
  $: report = resultOf(envelope);
  $: info = report?.info || {};
  $: options = info?.options || {};
  $: extensions = info?.extensions || [];
  $: capabilities = [
    {
      title: "Resident credentials",
      state: options.rk ?? options.clientPin,
      text: "The token can remember passkeys inside itself, like tiny named keys for websites and apps.",
    },
    {
      title: "Large blobs",
      state: extensions.includes("largeBlobKey") || Boolean(info.maxSerializedLargeBlobArray),
      text: "The token can keep small app-defined data next to a credential when the authenticator supports it.",
    },
    {
      title: "PIN",
      state: options.clientPin ?? Boolean(info.minPINLength || info.maxPINLength),
      text: "The token can ask for a secret number before it releases stronger permissions.",
    },
    {
      title: "User verification",
      state: options.uv,
      text: "The token can prove that a real local user approved the operation.",
    },
    {
      title: "Biometrics",
      state: Boolean(info.uvModality),
      text: "The token may have a fingerprint or biometric sensor for user verification.",
    },
    {
      title: "Authenticator config",
      state: extensions.includes("authenticatorConfig") || options.alwaysUv,
      text: "The token exposes switches such as always-UV or minimum PIN policy.",
    },
    {
      title: "Factory reset",
      state: info.longTouchForReset || (info.transportsForReset || []).length > 0,
      text: "The token can be wiped back to a clean state when its reset rules are followed.",
    },
  ];

  async function load(current: string) {
    loading = true;
    loadedFor = current;
    envelope = await api.inspect(current);
    loading = false;
  }
</script>

{#if !selector}
  <EmptyState title="Choose a token" message="Connect an authenticator and select it in the top bar to see what it can do." />
{:else}
  <section class="screen-band">
    <div>
      <p class="eyebrow">Overview</p>
      <h1>Your token, translated</h1>
      <p class="lede">This page reads the authenticator and explains its powers in plain language first, then leaves the raw CTAP facts one click away.</p>
    </div>
    <button type="button" on:click={() => load(selector)} disabled={loading}>{loading ? "Loading" : "Refresh"}</button>
  </section>

  {#if operationFailed(envelope)}
    <div class="notice danger">{operationFailed(envelope)}</div>
  {/if}

  {#if report}
    <section class="capability-grid">
      {#each capabilities as capability}
        <article class="capability">
          <div>
            <h2>{capability.title}</h2>
            <p>{capability.text}</p>
          </div>
          <span class:ok={capability.state === true} class:bad={capability.state === false}>
            {stateLabel(capability.state)}
          </span>
        </article>
      {/each}
    </section>

    <section class="details-grid">
      <div>
        <h2>Identity</h2>
        <dl>
          <dt>Product</dt><dd>{report.device?.product || "unknown"}</dd>
          <dt>Manufacturer</dt><dd>{report.device?.manufacturer || "unknown"}</dd>
          <dt>Transport</dt><dd>{report.device?.transport || "unknown"}</dd>
          <dt>AAGUID</dt><dd>{info.aaguid || "not reported"}</dd>
        </dl>
      </div>
      <div>
        <h2>Protocol</h2>
        <dl>
          <dt>Versions</dt><dd>{(info.versions || []).join(", ") || "unknown"}</dd>
          <dt>Extensions</dt><dd>{extensions.join(", ") || "none reported"}</dd>
          <dt>PIN/UV protocols</dt><dd>{(info.pinUvAuthProtocols || []).join(", ") || "unknown"}</dd>
        </dl>
      </div>
    </section>

    <details class="technical">
      <summary>Technical report</summary>
      <JsonView value={report} title="Inspection result" />
    </details>
  {:else if loading}
    <EmptyState title="Reading token" message="Waiting for the authenticator inspection result." />
  {/if}
{/if}
