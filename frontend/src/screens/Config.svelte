<script lang="ts">
  import { Download } from "@lucide/svelte";
  import { api, operationFailed } from "$lib/api";
  import { beginOperation, clearSharedCredentialInventory, selectedSelector, selectionVersion, pushToast, sessionBusy, summarizeEnvelope } from "../lib/stores";
  import { reportOf, stateLabel } from "$lib/format";
  import { Alert, AlertDescription } from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { NativeSelect } from "$lib/components/ui/native-select/index.js";
  import EmptyState from "../components/EmptyState.svelte";
  import JsonView from "../components/JsonView.svelte";
  import MetaRow from "../components/MetaRow.svelte";
  import ScreenHeader from "../components/ScreenHeader.svelte";
  import StatusBadge from "../components/StatusBadge.svelte";
  import CopyableId from "../components/CopyableId.svelte";
  import { m } from "../paraglide/messages.js";

  let loading = $state(false);
  let envelope: any = $state(null);
  let bioEnvelope: any = $state(null);
  let preview: any = $state(null);
  let newPin = $state("");
  let currentPin = $state("");
  let alwaysUv = $state("enable");
  let minPinLength = $state(8);
  let rpids = $state("");
  let bioName = $state("");
  let lastSelectionVersion = $selectionVersion;

  let selector = $derived($selectedSelector);
  let report = $derived(reportOf(envelope));
  let bioReport = $derived(reportOf(bioEnvelope));
  let bioState = $derived(report?.bio?.state ?? report?.bio?.uvBioEnroll?.state);
  let bioSupported = $derived(![false, "unsupported", "unavailable", "not_supported", undefined, null].includes(bioState));

  $effect(() => {
    if ($selectionVersion === lastSelectionVersion) return;
    lastSelectionVersion = $selectionVersion;
    resetState();
  });

  function failureEnvelope(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || m.operation_failed());
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
      setPin: m.set_pin(),
      changePin: m.change_pin(),
      alwaysUv: m.always_uv(),
      minPin: m.minimum_pin_length(),
      reset: m.factory_reset(),
    };
    const label = labels[kind] || m.configuration();
    return previewing ? `${label} preview` : label;
  }

  async function load() {
    if (!selector) return;
    loading = true;
    try {
      beginOperation(m.configuration_status());
      envelope = await api.configStatus(selector);
      summarizeEnvelope(m.configuration_status(), envelope);
      beginOperation(m.biometric_list());
      bioEnvelope = await api.bioList(selector);
      summarizeEnvelope(m.biometric_list(), bioEnvelope);
    } catch (error) {
      envelope = failureEnvelope(error);
      bioEnvelope = null;
      summarizeEnvelope(m.configuration_status(), envelope);
    } finally {
      loading = false;
    }
  }

  async function runPreview(kind: string) {
    const common = { selector, dryRun: true };
    const label = operationLabel(kind, true);
    try {
      beginOperation(label);
      if (kind === "setPin") preview = await api.setPIN({ ...common, newPIN: newPin });
      if (kind === "changePin") preview = await api.changePIN({ ...common, currentPIN: currentPin, newPIN: newPin });
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
      if (kind === "setPin") result = await api.setPIN({ ...common, newPIN: newPin });
      if (kind === "changePin") result = await api.changePIN({ ...common, currentPIN: currentPin, newPIN: newPin });
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
      pushToast(m.configuration_updated());
    }
  }

  async function enrollBio() {
    try {
      beginOperation(m.biometric_enroll());
      preview = await api.bioEnroll({ selector, timeoutMilliseconds: 60000, confirmed: true, confirmationMessage: m.biometric_enroll() });
      await load();
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope(m.biometric_enroll(), preview);
  }

  async function renameBio(templateIDHex: string) {
    try {
      beginOperation(m.biometric_rename_preview());
      preview = await api.bioRename({ selector, templateIdHex: templateIDHex, friendlyName: bioName, dryRun: true });
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope(m.biometric_rename_preview(), preview);
  }

  async function removeBio(templateIDHex: string) {
    try {
      beginOperation(m.biometric_remove_preview());
      preview = await api.bioRemove({ selector, templateIdHex: templateIDHex, dryRun: true });
    } catch (error) {
      preview = failureEnvelope(error);
    }
    summarizeEnvelope(m.biometric_remove_preview(), preview);
  }

  function previewOnEnter(event: KeyboardEvent, kind: string) {
    if (event.key === "Enter") {
      event.preventDefault();
      runPreview(kind);
    }
  }
</script>

{#if !selector}
  <EmptyState eyebrow={m.no_token()} title={m.no_token_selected()} message={m.select_authenticator_for_config()} />
{:else if operationFailed(envelope)}
  <ScreenHeader eyebrow={m.configuration()} title={m.token_switches_title()} description={m.config_description()}>
    {#snippet actions()}
      <Button onclick={load} disabled={!selector || loading || $sessionBusy}>{loading ? m.reloading_config() : m.reload_config()}</Button>
    {/snippet}
  </ScreenHeader>
  <Alert variant="destructive"><AlertDescription>{operationFailed(envelope)}</AlertDescription></Alert>
{:else if !report}
  <EmptyState eyebrow={m.ready_to_read()} title={m.no_config_loaded()} message={m.no_config_loaded_message()}>
    {#snippet actions()}
      <Button onclick={load} disabled={!selector || loading || $sessionBusy}>
        <Download />
        {loading ? m.reloading_config() : m.load_config()}
      </Button>
    {/snippet}
  </EmptyState>
{:else}
  <ScreenHeader eyebrow={m.configuration()} title={m.token_switches_title()} description={m.config_description()}>
    {#snippet actions()}
      <Button onclick={load} disabled={!selector || loading || $sessionBusy}>{loading ? m.reloading_config() : m.reload_config()}</Button>
    {/snippet}
  </ScreenHeader>
  <section class="grid gap-4 xl:grid-cols-2">
    <Card.Root>
      <Card.Header>
        <Card.Title>{m.pin()}</Card.Title>
        <Card.Description class="flex flex-wrap items-center gap-2">
        <StatusBadge value={report.pin?.state} label={stateLabel(report.pin?.state)} />
        <span>Retries: {stateLabel(report.pin?.retries?.remaining)}</span>
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <Field.Group>
        <Field.Field>
          <Field.Label>{m.current_pin()}</Field.Label>
          <Input bind:value={currentPin} type="password" autocomplete="off" onkeydown={(event) => previewOnEnter(event, "changePin")} />
        </Field.Field>
        <Field.Field>
          <Field.Label>{m.new_pin()}</Field.Label>
          <Input bind:value={newPin} type="password" autocomplete="off" onkeydown={(event) => previewOnEnter(event, "setPin")} />
        </Field.Field>
      </Field.Group>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" onclick={() => runPreview("setPin")} disabled={$sessionBusy}>{m.preview_set()}</Button>
        <Button onclick={() => execute("setPin")} disabled={!preview || $sessionBusy}>{m.confirm_set()}</Button>
        <Button variant="outline" onclick={() => runPreview("changePin")} disabled={$sessionBusy}>{m.preview_change()}</Button>
        <Button onclick={() => execute("changePin")} disabled={!preview || $sessionBusy}>{m.confirm_change()}</Button>
      </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>{m.authenticator_config()}</Card.Title>
        <Card.Description class="flex flex-wrap items-center gap-2">
        <span>{m.always_uv()}</span>
        <StatusBadge value={report.authenticatorConfig?.alwaysUv?.state} label={stateLabel(report.authenticatorConfig?.alwaysUv?.state)} />
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <Field.Group>
        <Field.Field>
        <Field.Label>{m.always_uv_target()}</Field.Label>
        <NativeSelect bind:value={alwaysUv}>
          <option value="enable">{m.enable()}</option>
          <option value="disable">{m.disable()}</option>
        </NativeSelect>
        </Field.Field>
        <Field.Field>
          <Field.Label>{m.minimum_pin_length()}</Field.Label>
          <Input bind:value={minPinLength} type="number" min="4" onkeydown={(event) => previewOnEnter(event, "minPin")} />
        </Field.Field>
        <Field.Field>
          <Field.Label>{m.allowed_rp_ids()}</Field.Label>
          <Input bind:value={rpids} placeholder="example.com, admin.example.com" onkeydown={(event) => previewOnEnter(event, "minPin")} />
        </Field.Field>
      </Field.Group>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" onclick={() => runPreview("alwaysUv")} disabled={$sessionBusy}>{m.preview_uv()}</Button>
        <Button onclick={() => execute("alwaysUv")} disabled={!preview || $sessionBusy}>{m.confirm_uv()}</Button>
        <Button variant="outline" onclick={() => runPreview("minPin")} disabled={$sessionBusy}>{m.preview_min_pin()}</Button>
        <Button onclick={() => execute("minPin")} disabled={!preview || $sessionBusy}>{m.confirm_min_pin()}</Button>
      </div>
      </Card.Content>
    </Card.Root>
  </section>

  <section class="grid gap-4 xl:grid-cols-2">
    <Card.Root>
      <Card.Header>
        <Card.Title>{m.biometrics()}</Card.Title>
        <Card.Description class="flex flex-wrap items-center gap-2">
        <StatusBadge value={bioState} label={stateLabel(bioState)} />
        <StatusBadge value={report.bio?.uvBioEnroll?.state} label={`enroll ${stateLabel(report.bio?.uvBioEnroll?.state)}`} />
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      {#if bioSupported}
        <Field.Field>
          <Field.Label>{m.template_friendly_name()}</Field.Label>
          <Input bind:value={bioName} />
        </Field.Field>
        <Button class="w-fit" onclick={enrollBio} disabled={$sessionBusy}>{m.start_enrollment()}</Button>
        {#each bioReport?.enrollments || [] as enrollment (enrollment.templateIDHex)}
          <article class="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div class="grid min-w-0 gap-2">
              <strong>{enrollment.friendlyName || m.unnamed_template()}</strong>
              <CopyableId label={m.template_id()} value={enrollment.templateIDHex} copied={() => pushToast(m.template_id_copied())} />
            </div>
            <div class="flex flex-wrap gap-2 lg:justify-end">
              <Button size="sm" variant="outline" onclick={() => renameBio(enrollment.templateIDHex)} disabled={$sessionBusy}>{m.preview_rename()}</Button>
              <Button size="sm" variant="destructive" onclick={() => removeBio(enrollment.templateIDHex)} disabled={$sessionBusy}>{m.preview_remove()}</Button>
            </div>
          </article>
        {/each}
      {:else}
        <p class="text-sm text-muted-foreground">{m.no_biometric_controls()}</p>
      {/if}
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header>
        <Card.Title>{m.factory_reset()}</Card.Title>
        <Card.Description>{m.reset_affordances_description()}</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <MetaRow label={m.long_touch_reset()} value={stateLabel(report.resetHints?.longTouchForReset)} />
      <MetaRow label={m.reset_transports()} value={(report.resetHints?.transportsForReset || []).join(", ") || m.not_reported()} />
      <div class="flex flex-wrap gap-2">
        <Button variant="destructive" onclick={() => runPreview("reset")} disabled={$sessionBusy}>{m.preview_reset()}</Button>
        <Button variant="destructive" onclick={() => execute("reset")} disabled={!preview || $sessionBusy}>{m.confirm_reset()}</Button>
      </div>
      </Card.Content>
    </Card.Root>
  </section>

  {#if preview}
    <JsonView value={preview.result || preview} title={m.configuration_preview_result()} />
  {/if}
{/if}
