<script lang="ts">
  import { api, bytesFromJSON, parseHexLines, operationFailed } from "../lib/api";
  import { beginOperation, selectedSelector, pushToast, sessionBusy, sessionStatus, setStatusOutcome, summarizeEnvelope } from "../lib/stores";
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
  import { m } from "../paraglide/messages.js";

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
  let sessionReady = $derived($sessionStatus.state === "ready");
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
    const message = error instanceof Error ? error.message : String(error || m.operation_failed());
    return { error: { message } };
  }

  async function previewMake() {
    try {
      beginOperation(m.makecredential_preview(), "make-result");
      makeResult = await api.makeCredential({ selector, ...makeInput, dryRun: true });
      summarizeEnvelope(m.makecredential_preview(), makeResult, "make-result", previewMake);
    } catch (error) {
      makeResult = failureEnvelope(error);
      summarizeEnvelope(m.makecredential_preview(), makeResult, "make-result", previewMake);
    }
  }

  async function runMake() {
    try {
      beginOperation("makeCredential", "make-result");
      makeResult = await api.makeCredential({ selector, ...makeInput, confirmed: true, confirmationMessage: m.run_makecredential() });
      summarizeEnvelope("makeCredential", makeResult, "make-result", runMake);
    } catch (error) {
      makeResult = failureEnvelope(error);
      summarizeEnvelope("makeCredential", makeResult, "make-result", runMake);
    }
  }

  async function runGet() {
    try {
      beginOperation("getAssertion", "assertion-result");
      assertionResult = await api.getAssertion({ selector, ...getInput });
      summarizeEnvelope("getAssertion", assertionResult, "assertion-result", runGet);
    } catch (error) {
      assertionResult = failureEnvelope(error);
      summarizeEnvelope("getAssertion", assertionResult, "assertion-result", runGet);
    }
  }

  function useCreatedCredential() {
    if (!createdCredentialID) return;
    allowList = createdCredentialID;
    setStatusOutcome({ tone: "success", title: m.credential_added_to_allow_list(), message: m.getassertion_ready_for_new_credential(), detailId: "assertion-result" });
    pushToast(m.allow_list_populated());
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

{#if !selector}
  <EmptyState eyebrow={m.no_token()} title={m.no_token_selected()} message={m.select_authenticator_for_lab()} />
{:else if !sessionReady}
  <EmptyState eyebrow={m.webauthn_lab()} title={m.open_session()} message={m.open_session_or_refresh_devices()} />
{:else}
  <ScreenHeader eyebrow={m.webauthn_lab()} title={m.lab_title()} description={m.lab_description()} />
  <section class="my-4 grid grid-cols-[minmax(0,1fr)_minmax(320px,0.78fr)] items-start gap-4 max-md:grid-cols-1">
    <div class="grid gap-3">
      <StepPanel step="1" title="makeCredential" active>
        <Field.Group>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field.Field><Field.Label>RP ID</Field.Label><Input bind:value={rpID} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>{m.rp_name()}</Field.Label><Input bind:value={rpName} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>{m.challenge()}</Field.Label><Input bind:value={challenge} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>{m.user_id_hex()}</Field.Label><Input bind:value={userIDHex} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>{m.user_name()}</Field.Label><Input bind:value={userName} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>{m.display_name()}</Field.Label><Input bind:value={displayName} onkeydown={previewOnEnter} /></Field.Field>
            <Field.Field><Field.Label>{m.algorithms()}</Field.Label><Input bind:value={algorithms} onkeydown={previewOnEnter} /></Field.Field>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <Field.Field orientation="horizontal">
              <Checkbox bind:checked={residentKey} />
              <Field.Label>{m.resident_key()}</Field.Label>
            </Field.Field>
            <Field.Field orientation="horizontal">
              <Checkbox bind:checked={userVerification} />
              <Field.Label>{m.user_verification()}</Field.Label>
            </Field.Field>
          </div>
          <Field.Field>
            <Field.Label>{m.exclude_credential_ids()}</Field.Label>
            <Textarea bind:value={excludeList} rows={3} onkeydown={(event) => textareaPrimary(event, previewMake)} />
          </Field.Field>
        </Field.Group>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" onclick={previewMake} disabled={$sessionBusy}>{m.preview()}</Button>
          <Button onclick={runMake} disabled={$sessionBusy}>{m.run_makecredential()}</Button>
        </div>
        <div id="make-result" class="mt-4 grid gap-3 border-t pt-3">
          <div class="flex items-start justify-between gap-3">
            <h3>{m.makecredential_result()}</h3>
            <span class="text-sm text-muted-foreground">{m.client_data_bytes({ count: makeBytes })}</span>
          </div>
          {#if operationFailed(makeResult)}
            <Alert variant="destructive"><AlertDescription>{operationFailed(makeResult)}</AlertDescription></Alert>
          {:else if makeResult}
            <div class="flex flex-wrap gap-2">
              <Badge variant="secondary">{createdCredentialID ? m.credential_created() : m.preview_ready()}</Badge>
              <Badge variant="outline">{m.algorithms_count({ count: makeInput.pubKeyCredParams.length })}</Badge>
              <Badge variant="outline">{m.excluded_count({ count: makeInput.excludeList.length })}</Badge>
            </div>
            {#if createdCredentialID}
              <CopyableId label={m.credential_id()} value={createdCredentialID} copied={() => pushToast(m.credential_id_copied())} />
              <Button class="w-fit" variant="outline" onclick={useCreatedCredential}>{m.use_in_getassertion()}</Button>
            {/if}
            <details class="rounded-md border bg-card p-4">
              <summary>{m.raw_makecredential_output()}</summary>
              <JsonView value={makeReport} title={m.raw_makecredential_result()} variant="bare" />
            </details>
          {:else}
            <p class="text-sm text-muted-foreground">{m.makecredential_empty_hint()}</p>
          {/if}
        </div>
      </StepPanel>

      <StepPanel step="2" title="getAssertion" active={Boolean(createdCredentialID || allowList)}>
        {#if createdCredentialID}
          <Alert>
            <AlertDescription class="grid gap-2">
            <CopyableId label={m.created_credential()} value={createdCredentialID} copied={() => pushToast(m.credential_id_copied())} />
            <Button class="w-fit" variant="outline" onclick={useCreatedCredential}>{m.use_in_allow_list()}</Button>
            </AlertDescription>
          </Alert>
        {:else}
          <p class="text-sm text-muted-foreground">{m.allow_list_empty_hint()}</p>
        {/if}
        <Field.Field>
          <Field.Label>{m.allow_credential_ids()}</Field.Label>
          <Textarea bind:value={allowList} rows={6} onkeydown={(event) => textareaPrimary(event, runGet)} />
        </Field.Field>
        <Button class="w-fit" onclick={runGet} disabled={$sessionBusy}>{m.run_getassertion()}</Button>
        <div id="assertion-result" class="mt-4 grid gap-3 border-t pt-3">
          <div class="flex items-start justify-between gap-3">
            <h3>{m.getassertion_result()}</h3>
            <span class="text-sm text-muted-foreground">{m.client_data_bytes({ count: getBytes })}</span>
          </div>
          {#if operationFailed(assertionResult)}
            <Alert variant="destructive"><AlertDescription>{operationFailed(assertionResult)}</AlertDescription></Alert>
          {:else if assertionResult}
            <div class="flex flex-wrap gap-2">
              <Badge variant="secondary">{m.assertion_returned()}</Badge>
              <Badge variant="outline">{m.allow_list_items_count({ count: getInput.allowList.length })}</Badge>
              <Badge variant="outline">{userVerification ? m.uv_requested() : m.uv_optional()}</Badge>
            </div>
            {#if assertionReport?.credentialIDHex || assertionReport?.credentialIdHex}
              <CopyableId label={m.credential_id()} value={assertionReport?.credentialIDHex || assertionReport?.credentialIdHex} copied={() => pushToast(m.credential_id_copied())} />
            {/if}
            {#if assertionReport?.signatureHex}
              <CopyableId label={m.signature()} value={assertionReport.signatureHex} copied={() => pushToast(m.signature_copied())} />
            {/if}
            {#if assertionReport?.authenticatorDataHex}
              <CopyableId label={m.authenticator_data()} value={assertionReport.authenticatorDataHex} copied={() => pushToast(m.authenticator_data_copied())} />
            {/if}
            {#if assertionReport?.clientDataJSONHex}
              <CopyableId label={m.client_data()} value={assertionReport.clientDataJSONHex} copied={() => pushToast(m.client_data_copied())} />
            {/if}
            <details class="rounded-md border bg-card p-4">
              <summary>{m.raw_getassertion_output()}</summary>
              <JsonView value={assertionReport} title={m.raw_getassertion_result()} variant="bare" />
            </details>
          {:else}
            <p class="text-sm text-muted-foreground">{m.getassertion_empty_hint()}</p>
          {/if}
        </div>
      </StepPanel>
    </div>

    <aside class="grid gap-3">
      <Card.Root>
        <Card.Header>
          <Card.Title>{m.artifacts()}</Card.Title>
        </Card.Header>
        <Card.Content class="grid gap-2">
          <div class="flex items-center justify-between gap-3 rounded-md border border-border p-2"><span>{m.makecredential_client_data()}</span><strong>{m.bytes_count({ count: makeBytes })}</strong></div>
          <div class="flex items-center justify-between gap-3 rounded-md border border-border p-2"><span>{m.getassertion_client_data()}</span><strong>{m.bytes_count({ count: getBytes })}</strong></div>
          <div class="flex items-center justify-between gap-3 rounded-md border border-border p-2"><span>{m.allow_list()}</span><strong>{m.items_count({ count: getInput.allowList.length })}</strong></div>
        </Card.Content>
      </Card.Root>
      <details class="rounded-md border bg-card p-4" open>
        <summary>{m.normalized_inputs()}</summary>
        <JsonView value={makeInput} title={m.makecredential_input()} />
        <JsonView value={getInput} title={m.getassertion_input()} />
      </details>
    </aside>
  </section>

{/if}
