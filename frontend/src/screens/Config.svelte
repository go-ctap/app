<script lang="ts">
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

<ScreenHeader eyebrow="Configuration" title="Token switches and safety state" description="Inspect PIN, UV, biometric, reset, and authenticator configuration. Mutations stay behind previews and explicit confirmation.">
  {#snippet actions()}
    <Button onclick={load} disabled={!selector || loading || $sessionBusy}>{loading ? "Reloading config" : "Reload config"}</Button>
  {/snippet}
</ScreenHeader>

{#if !selector}
  <EmptyState eyebrow="No token" title="No token selected" message="Select an authenticator to manage configuration." />
{:else if operationFailed(envelope)}
  <Alert variant="destructive"><AlertDescription>{operationFailed(envelope)}</AlertDescription></Alert>
{:else if !report}
  <EmptyState eyebrow="Ready to read" title="No config loaded" message="Reload config to read configuration status." />
{:else}
  <section class="grid gap-4 xl:grid-cols-2">
    <Card.Root>
      <Card.Header>
        <Card.Title>PIN</Card.Title>
        <Card.Description class="flex flex-wrap items-center gap-2">
        <StatusBadge value={report.pin?.state} label={stateLabel(report.pin?.state)} />
        <span>Retries: {stateLabel(report.pin?.retries?.remaining)}</span>
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <Field.Group>
        <Field.Field>
          <Field.Label>Current PIN</Field.Label>
          <Input bind:value={currentPin} type="password" autocomplete="off" onkeydown={(event) => previewOnEnter(event, "changePin")} />
        </Field.Field>
        <Field.Field>
          <Field.Label>New PIN</Field.Label>
          <Input bind:value={newPin} type="password" autocomplete="off" onkeydown={(event) => previewOnEnter(event, "setPin")} />
        </Field.Field>
      </Field.Group>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" onclick={() => runPreview("setPin")} disabled={$sessionBusy}>Preview set</Button>
        <Button onclick={() => execute("setPin")} disabled={!preview || $sessionBusy}>Confirm set</Button>
        <Button variant="outline" onclick={() => runPreview("changePin")} disabled={$sessionBusy}>Preview change</Button>
        <Button onclick={() => execute("changePin")} disabled={!preview || $sessionBusy}>Confirm change</Button>
      </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>Authenticator config</Card.Title>
        <Card.Description class="flex flex-wrap items-center gap-2">
        <span>Always UV</span>
        <StatusBadge value={report.authenticatorConfig?.alwaysUv?.state} label={stateLabel(report.authenticatorConfig?.alwaysUv?.state)} />
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <Field.Group>
        <Field.Field>
        <Field.Label>Always UV target</Field.Label>
        <NativeSelect bind:value={alwaysUv}>
          <option value="enable">enable</option>
          <option value="disable">disable</option>
        </NativeSelect>
        </Field.Field>
        <Field.Field>
          <Field.Label>Minimum PIN length</Field.Label>
          <Input bind:value={minPinLength} type="number" min="4" onkeydown={(event) => previewOnEnter(event, "minPin")} />
        </Field.Field>
        <Field.Field>
          <Field.Label>Allowed RP IDs</Field.Label>
          <Input bind:value={rpids} placeholder="example.com, admin.example.com" onkeydown={(event) => previewOnEnter(event, "minPin")} />
        </Field.Field>
      </Field.Group>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" onclick={() => runPreview("alwaysUv")} disabled={$sessionBusy}>Preview UV</Button>
        <Button onclick={() => execute("alwaysUv")} disabled={!preview || $sessionBusy}>Confirm UV</Button>
        <Button variant="outline" onclick={() => runPreview("minPin")} disabled={$sessionBusy}>Preview min PIN</Button>
        <Button onclick={() => execute("minPin")} disabled={!preview || $sessionBusy}>Confirm min PIN</Button>
      </div>
      </Card.Content>
    </Card.Root>
  </section>

  <section class="grid gap-4 xl:grid-cols-2">
    <Card.Root>
      <Card.Header>
        <Card.Title>Biometrics</Card.Title>
        <Card.Description class="flex flex-wrap items-center gap-2">
        <StatusBadge value={bioState} label={stateLabel(bioState)} />
        <StatusBadge value={report.bio?.uvBioEnroll?.state} label={`enroll ${stateLabel(report.bio?.uvBioEnroll?.state)}`} />
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      {#if bioSupported}
        <Field.Field>
          <Field.Label>Template friendly name</Field.Label>
          <Input bind:value={bioName} />
        </Field.Field>
        <Button class="w-fit" onclick={enrollBio} disabled={$sessionBusy}>Start enrollment</Button>
        {#each bioReport?.enrollments || [] as enrollment (enrollment.templateIDHex)}
          <article class="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div class="grid min-w-0 gap-2">
              <strong>{enrollment.friendlyName || "Unnamed template"}</strong>
              <CopyableId label="Template ID" value={enrollment.templateIDHex} copied={() => pushToast("Template ID copied")} />
            </div>
            <div class="flex flex-wrap gap-2 lg:justify-end">
              <Button size="sm" variant="outline" onclick={() => renameBio(enrollment.templateIDHex)} disabled={$sessionBusy}>Preview rename</Button>
              <Button size="sm" variant="destructive" onclick={() => removeBio(enrollment.templateIDHex)} disabled={$sessionBusy}>Preview remove</Button>
            </div>
          </article>
        {/each}
      {:else}
        <p class="text-sm text-muted-foreground">This authenticator does not expose biometric management controls.</p>
      {/if}
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header>
        <Card.Title>Factory reset</Card.Title>
        <Card.Description>Reset affordances reported by the selected authenticator.</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
      <MetaRow label="Long touch reset" value={stateLabel(report.resetHints?.longTouchForReset)} />
      <MetaRow label="Reset transports" value={(report.resetHints?.transportsForReset || []).join(", ") || "not reported"} />
      <div class="flex flex-wrap gap-2">
        <Button variant="destructive" onclick={() => runPreview("reset")} disabled={$sessionBusy}>Preview reset</Button>
        <Button variant="destructive" onclick={() => execute("reset")} disabled={!preview || $sessionBusy}>Confirm reset</Button>
      </div>
      </Card.Content>
    </Card.Root>
  </section>

  {#if preview}
    <JsonView value={preview.result || preview} title="Configuration preview/result" />
  {/if}
{/if}
