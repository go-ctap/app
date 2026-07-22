<script lang="ts">
  import { ExtensionIdentifier } from "../../../../bindings/github.com/go-ctap/ctap/extension";
  import type { InspectEnvelope } from "../../../../bindings/telesma/service";
  import { Plus, Trash2 } from "@lucide/svelte";

  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import { inspectResult } from "$lib/ctapkit-results";
  import type { GetAssertionExtensionsDraft, LabDescriptorDraft, LabPRFValuesDraft } from "$lib/features/lab/state";
  import { authenticatorSupportsLabExtension } from "$lib/lab-extension-support";
  import type { LabValidationIssue } from "$lib/lab-input";
  import type { LoadState } from "$lib/load-state";

  import { m } from "../../../paraglide/messages.js";

  import LabExtensionItem, { type ExtensionStatus } from "./LabExtensionItem.svelte";
  import LabBinaryEditor from "./LabBinaryEditor.svelte";
  import LabFieldLabel from "./LabFieldLabel.svelte";
  import LabHMACEditor from "./LabHMACEditor.svelte";
  import LabPRFValuesEditor from "./LabPRFValuesEditor.svelte";

  type Props = {
    value: GetAssertionExtensionsDraft;
    allowList: LabDescriptorDraft[];
    disabled?: boolean;
    inspection: LoadState<InspectEnvelope>;
    errors: LabValidationIssue[];
    onChange: (value: GetAssertionExtensionsDraft) => void;
    onRetryInspection: () => void;
  };

  let {
    value,
    allowList,
    disabled = false,
    inspection,
    errors,
    onChange,
    onRetryInspection,
  }: Props = $props();

  let openExtension = $state("");
  let nextOverrideDescriptor = $derived.by(() => {
    const overridden = new Set(
      value.prf.evalByCredential.map((entry) => entry.credentialIDHex.toLowerCase()),
    );
    return allowList.find((descriptor) => !overridden.has(descriptor.credentialIDHex.toLowerCase()));
  });

  function status(identifier: ExtensionIdentifier): ExtensionStatus {
    if (inspection.state !== "ready") return "unknown";
    const info = inspectResult(inspection.data)?.info;
    return info && authenticatorSupportsLabExtension(info, identifier) ? "supported" : "not-reported";
  }

  function hasError(prefix: string) {
    return errors.some((error) => error.field.startsWith(prefix));
  }

  function update<K extends keyof GetAssertionExtensionsDraft>(
    key: K,
    next: GetAssertionExtensionsDraft[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  function include<K extends keyof GetAssertionExtensionsDraft>(
    key: K,
    included: boolean,
    next: GetAssertionExtensionsDraft[K],
  ) {
    update(key, { ...next, included });
    if (included) openExtension = key;
  }

  function emptyPRFValues(): LabPRFValuesDraft {
    return {
      first: { mode: "utf8", value: "" },
      secondEnabled: false,
      second: { mode: "utf8", value: "" },
    };
  }

  function addOverride() {
    const descriptor = nextOverrideDescriptor;
    if (!descriptor) return;
    update("prf", {
      ...value.prf,
      evalByCredential: [
        ...value.prf.evalByCredential,
        { credentialIDHex: descriptor.credentialIDHex, values: emptyPRFValues() },
      ],
    });
  }

  function updateOverride(index: number, values: LabPRFValuesDraft) {
    update("prf", {
      ...value.prf,
      evalByCredential: value.prf.evalByCredential.map((entry, itemIndex) => (
        itemIndex === index ? { ...entry, values } : entry
      )),
    });
  }

  function removeOverride(index: number) {
    update("prf", {
      ...value.prf,
      evalByCredential: value.prf.evalByCredential.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function changeLargeBlobMode(next: string | string[]) {
    if (Array.isArray(next) || (next !== "read" && next !== "write")) return;
    update("largeBlob", { ...value.largeBlob, mode: next });
  }
</script>

{#if inspection.state === "error"}
  <Alert.Root variant="warning" role="status">
    <Alert.Title>{m.lab_unknown()}</Alert.Title>
    <Alert.Description>{m.lab_inspection_failed()}</Alert.Description>
    <Alert.Action>
      <Button type="button" size="sm" variant="outline" onclick={onRetryInspection}>
        {m.lab_inspection_retry()}
      </Button>
    </Alert.Action>
  </Alert.Root>
{/if}

<Accordion.Root type="single" value={openExtension} onValueChange={(next) => { openExtension = next ?? ""; }}>
  <section class="lab-extension-group" aria-labelledby="lab-get-webauthn-extensions-title">
    <header class="lab-extension-group-header">
      <h3 id="lab-get-webauthn-extensions-title">{m.lab_webauthn_client_extensions()}</h3>
      <p>{m.lab_webauthn_client_extensions_description()}</p>
    </header>

    <LabExtensionItem
      value="largeBlob"
      title="largeBlob"
      description={m.lab_extension_large_blob_get_description()}
      included={value.largeBlob.included}
      {disabled}
      status={status(ExtensionIdentifier.ExtensionIdentifierLargeBlob)}
      onInclude={(included) => include("largeBlob", included, value.largeBlob)}
    >
      <Field.Field>
        <LabFieldLabel
          forId="lab-ext-get-large-blob-mode"
          label={m.lab_large_blob_mode()}
          helpText={m.lab_large_blob_mode_tooltip()}
          helpLabel={m.lab_option_help({ label: `largeBlob: ${m.lab_large_blob_mode()}` })}
        />
        <ToggleGroup.Root
          id="lab-ext-get-large-blob-mode"
          type="single"
          value={value.largeBlob.mode}
          onValueChange={changeLargeBlobMode}
          variant="outline"
          size="sm"
          {disabled}
        >
          <ToggleGroup.Item value="read">{m.lab_large_blob_read()}</ToggleGroup.Item>
          <ToggleGroup.Item value="write">{m.lab_large_blob_write()}</ToggleGroup.Item>
        </ToggleGroup.Root>
      </Field.Field>
      {#if value.largeBlob.mode === "write"}
        <LabBinaryEditor
          id="lab-ext-get-large-blob-payload"
          label={m.lab_binary_value()}
          draft={value.largeBlob.payload}
          {disabled}
          invalid={hasError("get.extensions.largeBlob.payload")}
          onChange={(payload) => update("largeBlob", { ...value.largeBlob, payload })}
        />
      {/if}
    </LabExtensionItem>

    <LabExtensionItem
      value="payment"
      title="payment"
      description={m.lab_extension_payment_description()}
      included={value.payment.included}
      {disabled}
      status={status(ExtensionIdentifier.ExtensionIdentifierThirdPartyPayment)}
      onInclude={(included) => include("payment", included, value.payment)}
    />

    <LabExtensionItem
      value="prf"
      title="prf"
      description={m.lab_extension_prf_description()}
      included={value.prf.included}
      {disabled}
      status={status(ExtensionIdentifier.ExtensionIdentifierHMACSecret)}
      onInclude={(included) => include("prf", included, value.prf)}
    >
      <Field.Field orientation="horizontal">
        <LabFieldLabel
          forId="lab-ext-get-prf-global"
          label={m.lab_global_evaluation()}
          helpText={m.lab_prf_global_evaluation_tooltip()}
          helpLabel={m.lab_option_help({ label: `prf: ${m.lab_global_evaluation()}` })}
        />
        <Switch
          id="lab-ext-get-prf-global"
          checked={value.prf.useGlobalEval}
          {disabled}
          onCheckedChange={(useGlobalEval) => update("prf", { ...value.prf, useGlobalEval })}
        />
      </Field.Field>
      {#if value.prf.useGlobalEval}
        <LabPRFValuesEditor
          id="lab-ext-get-prf-global-values"
          value={value.prf.eval}
          {disabled}
          invalidFirst={hasError("get.extensions.prf.eval.first")}
          invalidSecond={hasError("get.extensions.prf.eval.second")}
          onChange={(evalValue) => update("prf", { ...value.prf, eval: evalValue })}
        />
      {/if}

      <Field.Field>
        <div class="lab-prf-overrides-heading">
          <Field.Label>{m.lab_credential_id()}</Field.Label>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={disabled || !nextOverrideDescriptor}
            onclick={addOverride}
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            {m.lab_add_override()}
          </Button>
        </div>
        <Field.Description>{m.lab_prf_credential_overrides_description()}</Field.Description>
        {#each value.prf.evalByCredential as entry, index (entry)}
          <section class="lab-prf-override" aria-label={`${m.lab_credential_id()} ${index + 1}`}>
            <div class="lab-prf-override-heading">
              <code>{entry.credentialIDHex}</code>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                {disabled}
                aria-label={m.lab_remove()}
                onclick={() => removeOverride(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <LabPRFValuesEditor
              id={`lab-ext-get-prf-override-${index}`}
              value={entry.values}
              {disabled}
              invalidFirst={hasError(`get.extensions.prf.evalByCredential.${index}.first`)}
              invalidSecond={hasError(`get.extensions.prf.evalByCredential.${index}.second`)}
              onChange={(values) => updateOverride(index, values)}
            />
          </section>
        {/each}
      </Field.Field>
    </LabExtensionItem>

  </section>

  <section class="lab-extension-group" aria-labelledby="lab-get-ctap-extensions-title">
    <header class="lab-extension-group-header">
      <h3 id="lab-get-ctap-extensions-title">{m.lab_ctap_extensions()}</h3>
      <p>{m.lab_ctap_extensions_description()}</p>
    </header>

    <LabExtensionItem
      value="getCredentialBlob"
      title="credBlob"
      description={m.lab_extension_cred_blob_get_description()}
      included={value.getCredentialBlob.included}
      {disabled}
      status={status(ExtensionIdentifier.ExtensionIdentifierCredentialBlob)}
      onInclude={(included) => include("getCredentialBlob", included, value.getCredentialBlob)}
    >
      <Field.Field orientation="horizontal">
        <LabFieldLabel
          forId="lab-ext-get-cred-blob-requested"
          label={m.lab_enabled()}
          helpText={m.lab_cred_blob_get_tooltip()}
          helpLabel={m.lab_option_help({ label: `credBlob: ${m.lab_enabled()}` })}
        />
        <Switch
          id="lab-ext-get-cred-blob-requested"
          checked={value.getCredentialBlob.value}
          {disabled}
          onCheckedChange={(requested) => update("getCredentialBlob", {
            ...value.getCredentialBlob,
            value: requested,
          })}
        />
      </Field.Field>
    </LabExtensionItem>

    <LabExtensionItem
      value="hmacSecret"
      title="hmac-secret"
      description={m.lab_extension_hmac_secret_get_description()}
      included={value.hmacSecret.included}
      {disabled}
      status={status(ExtensionIdentifier.ExtensionIdentifierHMACSecret)}
      onInclude={(included) => include("hmacSecret", included, value.hmacSecret)}
    >
      <LabHMACEditor
        id="lab-ext-get-hmac"
        value={value.hmacSecret}
        {disabled}
        invalidSalt1={hasError("get.extensions.hmacSecret.salt1")}
        invalidSalt2={hasError("get.extensions.hmacSecret.salt2")}
        onChange={(next) => update("hmacSecret", next)}
      />
    </LabExtensionItem>
  </section>
</Accordion.Root>

<style>
@layer blocks {
  .lab-extension-group {
    display: grid;
  }

  .lab-extension-group + .lab-extension-group {
    margin-top: var(--space-5);
  }

  .lab-extension-group-header {
    display: grid;
    gap: var(--space-1);
    padding-block: var(--space-2);
    border-bottom: 1px solid var(--border);
  }

  .lab-extension-group-header h3,
  .lab-extension-group-header p {
    margin: 0;
  }

  .lab-extension-group-header h3 {
    font-size: 0.8rem;
  }

  .lab-extension-group-header p {
    color: var(--muted-foreground);
    font-size: 0.7rem;
  }

  .lab-prf-overrides-heading,
  .lab-prf-override-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .lab-prf-override {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border);
  }

  .lab-prf-override + .lab-prf-override {
    margin-top: var(--space-2);
  }
}
</style>
