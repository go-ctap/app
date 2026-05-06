<script lang="ts">
  import { api, bytesFromJSON, parseHexLines, operationFailed } from "../lib/api";
  import { selectedSelector } from "../lib/stores";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";

  let rpID = "example.com";
  let rpName = "Example";
  let userIDHex = "01";
  let userName = "alice";
  let displayName = "Alice";
  let challenge = "manual-lab-challenge";
  let algorithms = "-7,-257";
  let excludeList = "";
  let allowList = "";
  let residentKey = true;
  let userVerification = true;
  let makeResult: any = null;
  let assertionResult: any = null;

  $: selector = $selectedSelector;
  $: clientData = { type: "webauthn.create", challenge, origin: `https://${rpID}` };
  $: getClientData = { type: "webauthn.get", challenge, origin: `https://${rpID}` };
  $: makeInput = {
    rp: { id: rpID, name: rpName },
    user: { userIDHex, name: userName, displayName },
    clientDataJSON: bytesFromJSON(clientData),
    pubKeyCredParams: algorithms.split(",").map((alg) => ({ type: "public-key", alg: Number(alg.trim()) })).filter((item) => item.alg),
    excludeList: parseHexLines(excludeList),
    options: { residentKey, userPresence: true, userVerification },
  };
  $: getInput = {
    rpID,
    clientDataJSON: bytesFromJSON(getClientData),
    allowList: parseHexLines(allowList),
    options: { userPresence: true, userVerification },
  };

  async function previewMake() {
    makeResult = await api.makeCredential({ selector, input: makeInput, dryRun: true });
  }

  async function runMake() {
    makeResult = await api.makeCredential({ selector, input: makeInput, confirmed: true, confirmationMessage: "make credential" });
  }

  async function runGet() {
    assertionResult = await api.getAssertion({ selector, input: getInput });
  }
</script>

<section class="screen-band">
  <div>
    <p class="eyebrow">WebAuthn lab</p>
    <h1>Build CTAP WebAuthn operations by hand</h1>
    <p class="lede">Create raw makeCredential and getAssertion requests with visible normalized JSON before they touch the authenticator.</p>
  </div>
</section>

{#if !selector}
  <EmptyState title="No token selected" message="Select an authenticator before running the lab." />
{:else}
  <section class="details-grid">
    <div>
      <h2>Shared request fields</h2>
      <label>RP ID <input bind:value={rpID} /></label>
      <label>RP name <input bind:value={rpName} /></label>
      <label>Challenge <input bind:value={challenge} /></label>
      <label><input type="checkbox" bind:checked={residentKey} /> Resident key</label>
      <label><input type="checkbox" bind:checked={userVerification} /> User verification</label>
    </div>
    <div>
      <h2>MakeCredential</h2>
      <label>User ID hex <input bind:value={userIDHex} /></label>
      <label>User name <input bind:value={userName} /></label>
      <label>Display name <input bind:value={displayName} /></label>
      <label>Algorithms <input bind:value={algorithms} /></label>
      <label>Exclude credential IDs, one per line <textarea bind:value={excludeList} rows="3"></textarea></label>
      <div class="actions">
        <button type="button" on:click={previewMake}>Preview</button>
        <button type="button" on:click={runMake}>Run makeCredential</button>
      </div>
    </div>
  </section>

  <section class="details-grid">
    <JsonView value={makeInput} title="Normalized makeCredential input" />
    <div>
      <h2>GetAssertion</h2>
      <label>Allow credential IDs, one per line <textarea bind:value={allowList} rows="6"></textarea></label>
      <button type="button" on:click={runGet}>Run getAssertion</button>
      <JsonView value={getInput} title="Normalized getAssertion input" />
    </div>
  </section>

  {#if operationFailed(makeResult)}
    <div class="notice danger">{operationFailed(makeResult)}</div>
  {/if}
  {#if makeResult}
    <JsonView value={makeResult.result || makeResult} title="makeCredential result" />
  {/if}

  {#if operationFailed(assertionResult)}
    <div class="notice danger">{operationFailed(assertionResult)}</div>
  {/if}
  {#if assertionResult}
    <JsonView value={assertionResult.result || assertionResult} title="getAssertion result" />
  {/if}
{/if}
