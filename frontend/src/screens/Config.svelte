<script lang="ts">
  import { api, operationFailed } from "../lib/api";
  import { beginOperation, clearSharedCredentialInventory, selectedSelector, selectionVersion, pushToast, sessionBusy, summarizeEnvelope } from "../lib/stores";
  import { reportOf, stateLabel } from "../lib/format";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import MetaRow from "../components/MetaRow.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";
  import CopyableId from "../components/CopyableId.svelte";

  let loading = false;
  let envelope: any = null;
  let bioEnvelope: any = null;
  let preview: any = null;
  let newPin = "";
  let currentPin = "";
  let alwaysUv = "enable";
  let minPinLength = 8;
  let rpids = "";
  let bioName = "";

  $: selector = $selectedSelector;
  $: if ($selectionVersion) resetState();
  $: report = reportOf(envelope);
  $: bioReport = reportOf(bioEnvelope);
  $: bioState = report?.bio?.state ?? report?.bio?.uvBioEnroll?.state;
  $: bioSupported = ![false, "unsupported", "unavailable", "not_supported", undefined, null].includes(bioState);

  function failureEnvelope(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "Operation failed");
    return { error: { message } };
  }

  function resetState() {
    envelope = null;
    bioEnvelope = null;
    preview = null;
    newPin = "";
    currentPin = "";
    bioName = "";
  }

  function operationLabel(kind: string, previewing = false) {
    const labels: Record<string, string> = {
      setPin: "Set PIN",
      changePin: "Change PIN",
      alwaysUv: "Always UV",
      minPin: "Minimum PIN length",
      reset: "Factory reset",
    };
    const label = labels[kind] || "Configuration";
    return previewing ? `${label} preview` : label;
  }

  async function load() {
    if (!selector) return;
    loading = true;
    try {
      beginOperation("Configuration status");
      envelope = await api.configStatus(selector);
      summarizeEnvelope("Configuration status", envelope);
      beginOperation("Biometric list");
      bioEnvelope = await api.bioList(selector);
      summarizeEnvelope("Biometric list", bioEnvelope);
    } catch (error) {
      envelope = failureEnvelope(error);
      bioEnvelope = null;
      summarizeEnvelope("Configuration status", envelope);
    } finally {
      loading = false;
    }
  }

  async function runPreview(kind: string) {
    const common = { selector, dryRun: true };
    const label = operationLabel(kind, true);
    try {
      beginOperation(label);
      if (kind === "setPin") preview = await api.setPIN({ ...common, newPin });
      if (kind === "changePin") preview = await api.changePIN({ ...common, currentPin, newPin });
      if (kind === "alwaysUv") preview = await api.setAlwaysUV({ ...common, target: alwaysUv });
      if (kind === "minPin") {
        preview = await api.setMinPINLength({
          ...common,
          newMinPINLength: Number(minPinLength),
          minPinLengthRPIDs: rpids.split(",").map((item) => item.trim()).filter(Boolean),
        });
      }
      if (kind === "reset") preview = await api.resetFactory({ ...common });
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope(label, preview);
  }

  async function execute(kind: string) {
    const common = { selector, confirmed: true, confirmationMessage: kind };
    const label = operationLabel(kind);
    let result: any = null;
    try {
      beginOperation(label);
      if (kind === "setPin") result = await api.setPIN({ ...common, newPin });
      if (kind === "changePin") result = await api.changePIN({ ...common, currentPin, newPin });
      if (kind === "alwaysUv") result = await api.setAlwaysUV({ ...common, target: alwaysUv });
      if (kind === "minPin") {
        result = await api.setMinPINLength({
          ...common,
          newMinPINLength: Number(minPinLength),
          minPinLengthRPIDs: rpids.split(",").map((item) => item.trim()).filter(Boolean),
        });
      }
      if (kind === "reset") result = await api.resetFactory(common);
    } catch (error) {
      result = failureEnvelope(error);
    }
    preview = null;
    if (kind === "reset" && !operationFailed(result)) {
      clearSharedCredentialInventory(selector);
    }
    await load();
    summarizeEnvelope(label, result);
    if (!operationFailed(result)) {
      pushToast("Configuration updated");
    }
  }

  async function enrollBio() {
    try {
      beginOperation("Biometric enroll");
      preview = await api.bioEnroll({ selector, timeoutMilliseconds: 60000, confirmed: true, confirmationMessage: "enroll biometric" });
      await load();
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope("Biometric enroll", preview);
  }

  async function renameBio(templateIDHex: string) {
    try {
      beginOperation("Biometric rename preview");
      preview = await api.bioRename({ selector, templateIdHex: templateIDHex, friendlyName: bioName, dryRun: true });
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope("Biometric rename preview", preview);
  }

  async function removeBio(templateIDHex: string) {
    try {
      beginOperation("Biometric remove preview");
      preview = await api.bioRemove({ selector, templateIdHex: templateIDHex, dryRun: true });
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope("Biometric remove preview", preview);
  }

  function previewOnEnter(event: KeyboardEvent, kind: string) {
    if (event.key === "Enter") {
      event.preventDefault();
      runPreview(kind);
    }
  }
</script>

<section class="screen-band">
  <div>
    <p class="eyebrow">Configuration</p>
    <h1>Token switches and safety state</h1>
    <p class="lede">Inspect PIN, UV, biometric, reset, and authenticator configuration. Mutations stay behind previews and explicit confirmation.</p>
  </div>
  <button type="button" on:click={load} disabled={!selector || loading || $sessionBusy}>{loading ? "Reloading config" : "Reload config"}</button>
</section>

{#if !selector}
  <EmptyState eyebrow="No token" title="No token selected" message="Select an authenticator to manage configuration." />
{:else if operationFailed(envelope)}
  <div class="notice danger">{operationFailed(envelope)}</div>
{:else if !report}
  <EmptyState eyebrow="Ready to read" title="No config loaded" message="Reload config to read configuration status." />
{:else}
  <section class="details-grid">
    <div>
      <h2>PIN</h2>
      <div class="row-meta">
        <StatusBadge value={report.pin?.state} label={stateLabel(report.pin?.state)} />
        <span>Retries: {stateLabel(report.pin?.retries?.remaining)}</span>
      </div>
      <label>Current PIN <input bind:value={currentPin} type="password" autocomplete="off" on:keydown={(event) => previewOnEnter(event, "changePin")} /></label>
      <label>New PIN <input bind:value={newPin} type="password" autocomplete="off" on:keydown={(event) => previewOnEnter(event, "setPin")} /></label>
      <div class="actions">
        <button type="button" on:click={() => runPreview("setPin")} disabled={$sessionBusy}>Preview set</button>
        <button type="button" on:click={() => execute("setPin")} disabled={!preview || $sessionBusy}>Confirm set</button>
        <button type="button" on:click={() => runPreview("changePin")} disabled={$sessionBusy}>Preview change</button>
        <button type="button" on:click={() => execute("changePin")} disabled={!preview || $sessionBusy}>Confirm change</button>
      </div>
    </div>

    <div>
      <h2>Authenticator config</h2>
      <div class="row-meta">
        <span>Always UV</span>
        <StatusBadge value={report.authenticatorConfig?.alwaysUv?.state} label={stateLabel(report.authenticatorConfig?.alwaysUv?.state)} />
      </div>
      <label>Always UV target
        <select bind:value={alwaysUv}>
          <option value="enable">enable</option>
          <option value="disable">disable</option>
        </select>
      </label>
      <label>Minimum PIN length <input bind:value={minPinLength} type="number" min="4" on:keydown={(event) => previewOnEnter(event, "minPin")} /></label>
      <label>Allowed RP IDs <input bind:value={rpids} placeholder="example.com, admin.example.com" on:keydown={(event) => previewOnEnter(event, "minPin")} /></label>
      <div class="actions">
        <button type="button" on:click={() => runPreview("alwaysUv")} disabled={$sessionBusy}>Preview UV</button>
        <button type="button" on:click={() => execute("alwaysUv")} disabled={!preview || $sessionBusy}>Confirm UV</button>
        <button type="button" on:click={() => runPreview("minPin")} disabled={$sessionBusy}>Preview min PIN</button>
        <button type="button" on:click={() => execute("minPin")} disabled={!preview || $sessionBusy}>Confirm min PIN</button>
      </div>
    </div>
  </section>

  <section class="details-grid">
    <div>
      <h2>Biometrics</h2>
      <div class="row-meta">
        <StatusBadge value={bioState} label={stateLabel(bioState)} />
        <StatusBadge value={report.bio?.uvBioEnroll?.state} label={`enroll ${stateLabel(report.bio?.uvBioEnroll?.state)}`} />
      </div>
      {#if bioSupported}
        <label>Template friendly name <input bind:value={bioName} /></label>
        <button type="button" on:click={enrollBio} disabled={$sessionBusy}>Start enrollment</button>
        {#each bioReport?.enrollments || [] as enrollment}
          <article class="row compact">
            <div class="row-main">
              <strong>{enrollment.friendlyName || "Unnamed template"}</strong>
              <CopyableId label="Template ID" value={enrollment.templateIDHex} on:copied={() => pushToast("Template ID copied")} />
            </div>
            <div class="actions">
              <button type="button" on:click={() => renameBio(enrollment.templateIDHex)} disabled={$sessionBusy}>Preview rename</button>
              <button class="danger" type="button" on:click={() => removeBio(enrollment.templateIDHex)} disabled={$sessionBusy}>Preview remove</button>
            </div>
          </article>
        {/each}
      {:else}
        <p class="muted">This authenticator does not expose biometric management controls.</p>
      {/if}
    </div>
    <div>
      <h2>Factory reset</h2>
      <MetaRow label="Long touch reset" value={stateLabel(report.resetHints?.longTouchForReset)} />
      <MetaRow label="Reset transports" value={(report.resetHints?.transportsForReset || []).join(", ") || "not reported"} />
      <div class="actions">
        <button class="danger" type="button" on:click={() => runPreview("reset")} disabled={$sessionBusy}>Preview reset</button>
        <button class="danger" type="button" on:click={() => execute("reset")} disabled={!preview || $sessionBusy}>Confirm reset</button>
      </div>
    </div>
  </section>

  {#if preview}
    <JsonView value={preview.result || preview} title="Configuration preview/result" />
  {/if}
{/if}
