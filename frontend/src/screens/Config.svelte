<script lang="ts">
  import { api, operationFailed } from "../lib/api";
  import { selectedSelector, pushToast } from "../lib/stores";
  import { reportOf, stateLabel } from "../lib/format";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";

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
  $: report = reportOf(envelope);
  $: bioReport = reportOf(bioEnvelope);

  async function load() {
    if (!selector) return;
    envelope = await api.configStatus(selector);
    bioEnvelope = await api.bioList(selector);
  }

  async function runPreview(kind: string) {
    const common = { selector, dryRun: true };
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
  }

  async function execute(kind: string) {
    const common = { selector, confirmed: true, confirmationMessage: kind };
    if (kind === "setPin") await api.setPIN({ ...common, newPin });
    if (kind === "changePin") await api.changePIN({ ...common, currentPin, newPin });
    if (kind === "alwaysUv") await api.setAlwaysUV({ ...common, target: alwaysUv });
    if (kind === "minPin") {
      await api.setMinPINLength({
        ...common,
        newMinPINLength: Number(minPinLength),
        minPinLengthRPIDs: rpids.split(",").map((item) => item.trim()).filter(Boolean),
      });
    }
    if (kind === "reset") await api.resetFactory(common);
    preview = null;
    await load();
    pushToast("Configuration updated");
  }

  async function enrollBio() {
    preview = await api.bioEnroll({ selector, timeoutMilliseconds: 60000, confirmed: true, confirmationMessage: "enroll biometric" });
    await load();
  }

  async function renameBio(templateIDHex: string) {
    preview = await api.bioRename({ selector, templateIdHex: templateIDHex, friendlyName: bioName, dryRun: true });
  }

  async function removeBio(templateIDHex: string) {
    preview = await api.bioRemove({ selector, templateIdHex: templateIDHex, dryRun: true });
  }
</script>

<section class="screen-band">
  <div>
    <p class="eyebrow">Configuration</p>
    <h1>Token switches and safety state</h1>
    <p class="lede">Inspect PIN, UV, biometric, reset, and authenticator configuration. Mutations stay behind previews and explicit confirmation.</p>
  </div>
  <button type="button" on:click={load} disabled={!selector}>Refresh</button>
</section>

{#if !selector}
  <EmptyState title="No token selected" message="Select an authenticator to manage configuration." />
{:else if operationFailed(envelope)}
  <div class="notice danger">{operationFailed(envelope)}</div>
{:else if !report}
  <EmptyState title="No config loaded" message="Refresh to read configuration status." />
{:else}
  <section class="details-grid">
    <div>
      <h2>PIN</h2>
      <p>State: {stateLabel(report.pin?.state)} · retries: {stateLabel(report.pin?.retries?.remaining)}</p>
      <label>Current PIN <input bind:value={currentPin} type="password" autocomplete="off" /></label>
      <label>New PIN <input bind:value={newPin} type="password" autocomplete="off" /></label>
      <div class="actions">
        <button type="button" on:click={() => runPreview("setPin")}>Preview set</button>
        <button type="button" on:click={() => execute("setPin")} disabled={!preview}>Confirm set</button>
        <button type="button" on:click={() => runPreview("changePin")}>Preview change</button>
        <button type="button" on:click={() => execute("changePin")} disabled={!preview}>Confirm change</button>
      </div>
    </div>

    <div>
      <h2>Authenticator config</h2>
      <p>Always UV: {stateLabel(report.authenticatorConfig?.alwaysUv?.state)}</p>
      <label>Always UV target
        <select bind:value={alwaysUv}>
          <option value="enable">enable</option>
          <option value="disable">disable</option>
        </select>
      </label>
      <label>Minimum PIN length <input bind:value={minPinLength} type="number" min="4" /></label>
      <label>Allowed RP IDs <input bind:value={rpids} placeholder="example.com, admin.example.com" /></label>
      <div class="actions">
        <button type="button" on:click={() => runPreview("alwaysUv")}>Preview UV</button>
        <button type="button" on:click={() => execute("alwaysUv")} disabled={!preview}>Confirm UV</button>
        <button type="button" on:click={() => runPreview("minPin")}>Preview min PIN</button>
        <button type="button" on:click={() => execute("minPin")} disabled={!preview}>Confirm min PIN</button>
      </div>
    </div>
  </section>

  <section class="details-grid">
    <div>
      <h2>Biometrics</h2>
      <p>State: {stateLabel(report.bio?.state)} · enroll: {stateLabel(report.bio?.uvBioEnroll?.state)}</p>
      <label>Template friendly name <input bind:value={bioName} /></label>
      <button type="button" on:click={enrollBio}>Start enrollment</button>
      {#each bioReport?.enrollments || [] as enrollment}
        <article class="row compact">
          <div>
            <strong>{enrollment.friendlyName || "Unnamed template"}</strong>
            <code>{enrollment.templateIDHex}</code>
          </div>
          <div class="actions">
            <button type="button" on:click={() => renameBio(enrollment.templateIDHex)}>Preview rename</button>
            <button class="danger" type="button" on:click={() => removeBio(enrollment.templateIDHex)}>Preview remove</button>
          </div>
        </article>
      {/each}
    </div>
    <div>
      <h2>Factory reset</h2>
      <p>Long touch reset: {stateLabel(report.resetHints?.longTouchForReset)}</p>
      <p>Reset transports: {(report.resetHints?.transportsForReset || []).join(", ") || "not reported"}</p>
      <div class="actions">
        <button class="danger" type="button" on:click={() => runPreview("reset")}>Preview reset</button>
        <button class="danger" type="button" on:click={() => execute("reset")} disabled={!preview}>Confirm reset</button>
      </div>
    </div>
  </section>

  {#if preview}
    <JsonView value={preview.result || preview} title="Configuration preview/result" />
  {/if}
{/if}
