<script lang="ts">
  import { api, bytesFromJSON, parseHexLines, operationFailed } from "../lib/api";
  import { selectedSelector, selectionVersion, pushToast, sessionBusy, setStatusOutcome, summarizeEnvelope } from "../lib/stores";
  import CopyableId from "../components/CopyableId.svelte";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import StepPanel from "../components/StepPanel.svelte";

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
  $: if ($selectionVersion) resetResults();
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
  $: createdCredentialID = findCredentialID(makeResult?.result || makeResult);
  $: makeReport = makeResult?.result || makeResult;
  $: assertionReport = assertionResult?.result || assertionResult;
  $: makeBytes = makeInput.clientDataJSON?.length || 0;
  $: getBytes = getInput.clientDataJSON?.length || 0;

  function failureEnvelope(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "Operation failed");
    return { error: { message } };
  }

  function resetResults() {
    makeResult = null;
    assertionResult = null;
    allowList = "";
  }

  async function previewMake() {
    try {
      makeResult = await api.makeCredential({ selector, input: makeInput, dryRun: true });
      summarizeEnvelope("makeCredential preview", makeResult, "make-result", previewMake);
    } catch (error) {
      makeResult = failureEnvelope(error);
      summarizeEnvelope("makeCredential preview", makeResult, "make-result", previewMake);
    }
  }

  async function runMake() {
    try {
      makeResult = await api.makeCredential({ selector, input: makeInput, confirmed: true, confirmationMessage: "make credential" });
      summarizeEnvelope("makeCredential", makeResult, "make-result", runMake);
    } catch (error) {
      makeResult = failureEnvelope(error);
      summarizeEnvelope("makeCredential", makeResult, "make-result", runMake);
    }
  }

  async function runGet() {
    try {
      assertionResult = await api.getAssertion({ selector, input: getInput });
      summarizeEnvelope("getAssertion", assertionResult, "assertion-result", runGet);
    } catch (error) {
      assertionResult = failureEnvelope(error);
      summarizeEnvelope("getAssertion", assertionResult, "assertion-result", runGet);
    }
  }

  function useCreatedCredential() {
    if (!createdCredentialID) return;
    allowList = createdCredentialID;
    setStatusOutcome({ tone: "success", title: "Credential added to allow list", message: "getAssertion is ready to use the new credential.", detailId: "assertion-result" });
    pushToast("Allow list populated from makeCredential");
  }

  function findCredentialID(value: any): string {
    if (!value || typeof value !== "object") return "";
    for (const key of ["credentialIDHex", "credentialIdHex", "rawIDHex", "idHex"]) {
      if (typeof value[key] === "string" && value[key].length > 0) return value[key];
    }
    for (const item of Object.values(value)) {
      const found = findCredentialID(item);
      if (found) return found;
    }
    return "";
  }

  function previewOnEnter(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      previewMake();
    }
  }

  function textareaPrimary(event: KeyboardEvent, action: () => void) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      action();
    }
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
  <section class="step-workflow">
    <div class="step-stack">
      <StepPanel step="1" title="makeCredential" active>
        <div class="form-grid">
          <label>RP ID <input bind:value={rpID} on:keydown={previewOnEnter} /></label>
          <label>RP name <input bind:value={rpName} on:keydown={previewOnEnter} /></label>
          <label>Challenge <input bind:value={challenge} on:keydown={previewOnEnter} /></label>
          <label>User ID hex <input bind:value={userIDHex} on:keydown={previewOnEnter} /></label>
          <label>User name <input bind:value={userName} on:keydown={previewOnEnter} /></label>
          <label>Display name <input bind:value={displayName} on:keydown={previewOnEnter} /></label>
          <label>Algorithms <input bind:value={algorithms} on:keydown={previewOnEnter} /></label>
        </div>
        <div class="row-meta">
          <label><input type="checkbox" bind:checked={residentKey} /> Resident key</label>
          <label><input type="checkbox" bind:checked={userVerification} /> User verification</label>
        </div>
        <label>Exclude credential IDs, one per line
          <textarea bind:value={excludeList} rows="3" on:keydown={(event) => textareaPrimary(event, previewMake)}></textarea>
        </label>
        <div class="actions">
          <button type="button" on:click={previewMake} disabled={$sessionBusy}>Preview</button>
          <button type="button" on:click={runMake} disabled={$sessionBusy}>Run makeCredential</button>
        </div>
        <div id="make-result" class="step-result">
          <div class="section-heading">
            <h3>makeCredential result</h3>
            <span class="muted">{makeBytes} client-data bytes</span>
          </div>
          {#if operationFailed(makeResult)}
            <div class="notice danger">{operationFailed(makeResult)}</div>
          {:else if makeResult}
            <div class="metric-band">
              <span>{createdCredentialID ? "Credential created" : "Preview ready"}</span>
              <span>{makeInput.pubKeyCredParams.length} algorithm(s)</span>
              <span>{makeInput.excludeList.length} excluded</span>
            </div>
            {#if createdCredentialID}
              <CopyableId label="Credential ID" value={createdCredentialID} on:copied={() => pushToast("Credential ID copied")} />
              <button type="button" on:click={useCreatedCredential}>Use in getAssertion</button>
            {/if}
            <details class="technical">
              <summary>Raw makeCredential output</summary>
              <JsonView value={makeReport} title="Raw makeCredential result" variant="bare" />
            </details>
          {:else}
            <p class="muted">Preview or run makeCredential to see normalized input, warnings, credential ID, and raw output here.</p>
          {/if}
        </div>
      </StepPanel>

      <StepPanel step="2" title="getAssertion" active={Boolean(createdCredentialID || allowList)}>
        {#if createdCredentialID}
          <div class="notice">
            <CopyableId label="Created credential" value={createdCredentialID} on:copied={() => pushToast("Credential ID copied")} />
            <button type="button" on:click={useCreatedCredential}>Use in allow list</button>
          </div>
        {:else}
          <p class="muted">Leave the allow list empty to ask the authenticator to choose a matching credential for the RP ID.</p>
        {/if}
        <label>Allow credential IDs, one per line
          <textarea bind:value={allowList} rows="6" on:keydown={(event) => textareaPrimary(event, runGet)}></textarea>
        </label>
        <button type="button" on:click={runGet} disabled={$sessionBusy}>Run getAssertion</button>
        <div id="assertion-result" class="step-result">
          <div class="section-heading">
            <h3>getAssertion result</h3>
            <span class="muted">{getBytes} client-data bytes</span>
          </div>
          {#if operationFailed(assertionResult)}
            <div class="notice danger">{operationFailed(assertionResult)}</div>
          {:else if assertionResult}
            <div class="metric-band">
              <span>Assertion returned</span>
              <span>{getInput.allowList.length} allow-list item(s)</span>
              <span>{userVerification ? "UV requested" : "UV optional"}</span>
            </div>
            {#if assertionReport?.credentialIDHex || assertionReport?.credentialIdHex}
              <CopyableId label="Credential ID" value={assertionReport?.credentialIDHex || assertionReport?.credentialIdHex} on:copied={() => pushToast("Credential ID copied")} />
            {/if}
            {#if assertionReport?.signatureHex}
              <CopyableId label="Signature" value={assertionReport.signatureHex} on:copied={() => pushToast("Signature copied")} />
            {/if}
            {#if assertionReport?.authenticatorDataHex}
              <CopyableId label="Authenticator data" value={assertionReport.authenticatorDataHex} on:copied={() => pushToast("Authenticator data copied")} />
            {/if}
            {#if assertionReport?.clientDataJSONHex}
              <CopyableId label="Client data" value={assertionReport.clientDataJSONHex} on:copied={() => pushToast("Client data copied")} />
            {/if}
            <details class="technical">
              <summary>Raw getAssertion output</summary>
              <JsonView value={assertionReport} title="Raw getAssertion result" variant="bare" />
            </details>
          {:else}
            <p class="muted">Run getAssertion to see assertion artifacts, copy actions, and raw output in this step.</p>
          {/if}
        </div>
      </StepPanel>
    </div>

    <aside class="inspector-rail">
      <section class="json-view">
        <div class="section-heading">
          <h3>Artifacts</h3>
        </div>
        <div class="artifact-list">
          <div class="artifact-row"><span>makeCredential client data</span><strong>{makeBytes} bytes</strong></div>
          <div class="artifact-row"><span>getAssertion client data</span><strong>{getBytes} bytes</strong></div>
          <div class="artifact-row"><span>Allow list</span><strong>{getInput.allowList.length} item(s)</strong></div>
        </div>
      </section>
      <details class="technical" open>
        <summary>Normalized inputs</summary>
        <JsonView value={makeInput} title="makeCredential input" />
        <JsonView value={getInput} title="getAssertion input" />
      </details>
    </aside>
  </section>

{/if}
