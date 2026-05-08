<script lang="ts">
  import { api, bytesFromJSON, parseHexLines, operationFailed } from "../lib/api";
  import { beginOperation, selectedSelector, pushToast, sessionBusy, setStatusOutcome, summarizeEnvelope } from "../lib/stores";
  import { Alert, AlertDescription } from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import CopyableId from "../components/CopyableId.svelte";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import ScreenHeader from "../components/ScreenHeader.svelte";
  import StepPanel from "../components/StepPanel.svelte";

  let rpID = $state("example.com");
  let rpName = $state("Example");
  let userIDHex = $state("01");
  let userName = $state("alice");
  let displayName = $state("Alice");
  let challenge = $state("manual-lab-challenge");
  let algorithms = $state("-7,-257");
  let excludeList = $state("");
  let allowList = $state("");
  let residentKey = $state(true);
  let userVerification = $state(true);
  let makeResult: any = $state(null);
  let assertionResult: any = $state(null);

  let selector = $derived($selectedSelector);
  let clientData = $derived({ type: "webauthn.create", challenge, origin: `https://${rpID}` });
  let getClientData = $derived({ type: "webauthn.get", challenge, origin: `https://${rpID}` });
  let makeInput = $derived({
    rp: { id: rpID, name: rpName },
    user: { userIDHex, name: userName, displayName },
    clientDataJSON: bytesFromJSON(clientData),
    pubKeyCredParams: algorithms.split(",").map((alg) => ({ type: "public-key", alg: Number(alg.trim()) })).filter((item) => item.alg),
    excludeList: parseHexLines(excludeList),
    options: { residentKey, userPresence: true, userVerification },
  });
  let getInput = $derived({
    rpID,
    clientDataJSON: bytesFromJSON(getClientData),
    allowList: parseHexLines(allowList),
    options: { userPresence: true, userVerification },
  });
  let createdCredentialID = $derived(findCredentialID(makeResult?.result || makeResult));
  let makeReport = $derived(makeResult?.result || makeResult);
  let assertionReport = $derived(assertionResult?.result || assertionResult);
  let makeBytes = $derived(makeInput.clientDataJSON?.length || 0);
  let getBytes = $derived(getInput.clientDataJSON?.length || 0);

  function failureEnvelope(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "Operation failed");
    return { error: { message } };
  }

  async function previewMake() {
    try {
      beginOperation("makeCredential preview", "make-result");
      makeResult = await api.makeCredential({ selector, input: makeInput, dryRun: true });
      summarizeEnvelope("makeCredential preview", makeResult, "make-result", previewMake);
    } catch (error) {
      makeResult = failureEnvelope(error);
      summarizeEnvelope("makeCredential preview", makeResult, "make-result", previewMake);
    }
  }

  async function runMake() {
    try {
      beginOperation("makeCredential", "make-result");
      makeResult = await api.makeCredential({ selector, input: makeInput, confirmed: true, confirmationMessage: "make credential" });
      summarizeEnvelope("makeCredential", makeResult, "make-result", runMake);
    } catch (error) {
      makeResult = failureEnvelope(error);
      summarizeEnvelope("makeCredential", makeResult, "make-result", runMake);
    }
  }

  async function runGet() {
    try {
      beginOperation("getAssertion", "assertion-result");
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

<ScreenHeader eyebrow="WebAuthn lab" title="Build CTAP WebAuthn operations by hand" description="Create raw makeCredential and getAssertion requests with visible normalized JSON before they touch the authenticator." />

{#if !selector}
  <EmptyState eyebrow="No token" title="No token selected" message="Select an authenticator before running the lab." />
{:else}
  <section class="my-4 grid grid-cols-[minmax(0,1fr)_minmax(320px,0.78fr)] items-start gap-4 max-md:grid-cols-1">
    <div class="grid gap-3">
      <StepPanel step="1" title="makeCredential" active>
        <Field.Group>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field.Field><Field.Label>RP ID</Field.Label><Input bind:value={rpID} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>RP name</Field.Label><Input bind:value={rpName} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>Challenge</Field.Label><Input bind:value={challenge} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>User ID hex</Field.Label><Input bind:value={userIDHex} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>User name</Field.Label><Input bind:value={userName} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>Display name</Field.Label><Input bind:value={displayName} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>Algorithms</Field.Label><Input bind:value={algorithms} onkeydown={previewOnEnter} /></Field.Field>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <Field.Field orientation="horizontal">
              <Checkbox bind:checked={residentKey} />
              <Field.Label>Resident key</Field.Label>
            </Field.Field>
            <Field.Field orientation="horizontal">
              <Checkbox bind:checked={userVerification} />
              <Field.Label>User verification</Field.Label>
            </Field.Field>
          </div>
          <Field.Field>
            <Field.Label>Exclude credential IDs, one per line</Field.Label>
            <Textarea bind:value={excludeList} rows={3} onkeydown={(event) => textareaPrimary(event, previewMake)} />
          </Field.Field>
        </Field.Group>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" onclick={previewMake} disabled={$sessionBusy}>Preview</Button>
          <Button onclick={runMake} disabled={$sessionBusy}>Run makeCredential</Button>
        </div>
        <div id="make-result" class="mt-4 grid gap-3 border-t pt-3">
          <div class="flex items-start justify-between gap-3">
            <h3>makeCredential result</h3>
            <span class="text-sm text-muted-foreground">{makeBytes} client-data bytes</span>
          </div>
          {#if operationFailed(makeResult)}
            <Alert variant="destructive"><AlertDescription>{operationFailed(makeResult)}</AlertDescription></Alert>
          {:else if makeResult}
            <div class="flex flex-wrap gap-2">
              <Badge variant="secondary">{createdCredentialID ? "Credential created" : "Preview ready"}</Badge>
              <Badge variant="outline">{makeInput.pubKeyCredParams.length} algorithm(s)</Badge>
              <Badge variant="outline">{makeInput.excludeList.length} excluded</Badge>
            </div>
            {#if createdCredentialID}
              <CopyableId label="Credential ID" value={createdCredentialID} copied={() => pushToast("Credential ID copied")} />
              <Button class="w-fit" variant="outline" onclick={useCreatedCredential}>Use in getAssertion</Button>
            {/if}
            <details class="rounded-md border bg-card p-4">
              <summary>Raw makeCredential output</summary>
              <JsonView value={makeReport} title="Raw makeCredential result" variant="bare" />
            </details>
          {:else}
            <p class="text-sm text-muted-foreground">Preview or run makeCredential to see normalized input, warnings, credential ID, and raw output here.</p>
          {/if}
        </div>
      </StepPanel>

      <StepPanel step="2" title="getAssertion" active={Boolean(createdCredentialID || allowList)}>
        {#if createdCredentialID}
          <Alert>
            <AlertDescription class="grid gap-2">
            <CopyableId label="Created credential" value={createdCredentialID} copied={() => pushToast("Credential ID copied")} />
            <Button class="w-fit" variant="outline" onclick={useCreatedCredential}>Use in allow list</Button>
            </AlertDescription>
          </Alert>
        {:else}
          <p class="text-sm text-muted-foreground">Leave the allow list empty to ask the authenticator to choose a matching credential for the RP ID.</p>
        {/if}
        <Field.Field>
          <Field.Label>Allow credential IDs, one per line</Field.Label>
          <Textarea bind:value={allowList} rows={6} onkeydown={(event) => textareaPrimary(event, runGet)} />
        </Field.Field>
        <Button class="w-fit" onclick={runGet} disabled={$sessionBusy}>Run getAssertion</Button>
        <div id="assertion-result" class="mt-4 grid gap-3 border-t pt-3">
          <div class="flex items-start justify-between gap-3">
            <h3>getAssertion result</h3>
            <span class="text-sm text-muted-foreground">{getBytes} client-data bytes</span>
          </div>
          {#if operationFailed(assertionResult)}
            <Alert variant="destructive"><AlertDescription>{operationFailed(assertionResult)}</AlertDescription></Alert>
          {:else if assertionResult}
            <div class="flex flex-wrap gap-2">
              <Badge variant="secondary">Assertion returned</Badge>
              <Badge variant="outline">{getInput.allowList.length} allow-list item(s)</Badge>
              <Badge variant="outline">{userVerification ? "UV requested" : "UV optional"}</Badge>
            </div>
            {#if assertionReport?.credentialIDHex || assertionReport?.credentialIdHex}
              <CopyableId label="Credential ID" value={assertionReport?.credentialIDHex || assertionReport?.credentialIdHex} copied={() => pushToast("Credential ID copied")} />
            {/if}
            {#if assertionReport?.signatureHex}
              <CopyableId label="Signature" value={assertionReport.signatureHex} copied={() => pushToast("Signature copied")} />
            {/if}
            {#if assertionReport?.authenticatorDataHex}
              <CopyableId label="Authenticator data" value={assertionReport.authenticatorDataHex} copied={() => pushToast("Authenticator data copied")} />
            {/if}
            {#if assertionReport?.clientDataJSONHex}
              <CopyableId label="Client data" value={assertionReport.clientDataJSONHex} copied={() => pushToast("Client data copied")} />
            {/if}
            <details class="rounded-md border bg-card p-4">
              <summary>Raw getAssertion output</summary>
              <JsonView value={assertionReport} title="Raw getAssertion result" variant="bare" />
            </details>
          {:else}
            <p class="text-sm text-muted-foreground">Run getAssertion to see assertion artifacts, copy actions, and raw output in this step.</p>
          {/if}
        </div>
      </StepPanel>
    </div>

    <aside class="grid gap-3">
      <Card.Root>
        <Card.Header>
          <Card.Title>Artifacts</Card.Title>
        </Card.Header>
        <Card.Content class="grid gap-2">
          <div class="flex items-center justify-between gap-3 rounded-md border border-border p-2"><span>makeCredential client data</span><strong>{makeBytes} bytes</strong></div>
          <div class="flex items-center justify-between gap-3 rounded-md border border-border p-2"><span>getAssertion client data</span><strong>{getBytes} bytes</strong></div>
          <div class="flex items-center justify-between gap-3 rounded-md border border-border p-2"><span>Allow list</span><strong>{getInput.allowList.length} item(s)</strong></div>
        </Card.Content>
      </Card.Root>
      <details class="rounded-md border bg-card p-4" open>
        <summary>Normalized inputs</summary>
        <JsonView value={makeInput} title="makeCredential input" />
        <JsonView value={getInput} title="getAssertion input" />
      </details>
    </aside>
  </section>

{/if}
