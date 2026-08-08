<script lang="ts">
  import { DatabaseZap, Play, RefreshCw, ShieldCheck, TriangleAlert } from "@lucide/svelte";

  import { RunMode } from "../../../../bindings/github.com/telesma-app/kit/conformance/ctap23";

  import * as Alert from "$lib/components/ui/alert";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Field from "$lib/components/ui/field";
  import { Spinner } from "$lib/components/ui/spinner";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    mode: RunMode;
    metadataAvailable: boolean;
    metadataLoading: boolean;
    metadataSource: string;
    busy: boolean;
    onModeChange: (mode: RunMode) => void;
    onRefreshMetadata: () => void | Promise<void>;
    onRun: () => void | Promise<void>;
  };

  let {
    mode,
    metadataAvailable,
    metadataLoading,
    metadataSource,
    busy,
    onModeChange,
    onRefreshMetadata,
    onRun,
  }: Props = $props();

  let confirmFullOpen = $state(false);
  let selectedMode = $derived(mode === RunMode.RunModeFull ? "full" : "safe");

  function handleModeChange(value: string | string[]) {
    if (Array.isArray(value)) return;

    onModeChange(value === "full" ? RunMode.RunModeFull : RunMode.RunModeSafe);
  }

  function requestRun() {
    if (mode === RunMode.RunModeFull) {
      confirmFullOpen = true;

      return;
    }

    void onRun();
  }

  function confirmFullRun() {
    confirmFullOpen = false;
    void onRun();
  }
</script>

<Card.Root class="conformance-run-panel">
  <Card.Header>
    <Card.Title>{m.conformance_suite_title()}</Card.Title>
    <Card.Description>{m.conformance_suite_description()}</Card.Description>
  </Card.Header>

  <Card.Content class="conformance-run-content">
    <section class="conformance-control" aria-labelledby="conformance-metadata-title">
      <div class="conformance-control-copy">
        <h3 id="conformance-metadata-title">{m.conformance_metadata_title()}</h3>
      </div>

      {#if metadataLoading}
        <Alert.Root role="status">
          <Spinner aria-hidden="true" />
          <Alert.Title>{m.conformance_metadata_loading()}</Alert.Title>
        </Alert.Root>
      {:else if metadataAvailable}
        <Alert.Root role="status">
          <ShieldCheck aria-hidden="true" />
          <Alert.Title>{m.conformance_metadata_title()}</Alert.Title>
          <Alert.Description>
            {m.conformance_metadata_found_description({ source: metadataSource })}
          </Alert.Description>
        </Alert.Root>
      {:else}
        <Alert.Root variant="warning">
          <TriangleAlert aria-hidden="true" />
          <Alert.Title>{m.conformance_metadata_missing_title()}</Alert.Title>
          <Alert.Description>{m.conformance_metadata_missing_description()}</Alert.Description>
          <Alert.Action>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={busy}
              onclick={() => void onRefreshMetadata()}
            >
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              {m.conformance_metadata_refresh()}
            </Button>
          </Alert.Action>
        </Alert.Root>
      {/if}
    </section>

    <Field.Field data-disabled={busy}>
      <Field.FieldTitle id="conformance-mode-title">{m.conformance_mode_title()}</Field.FieldTitle>
      <ToggleGroup.Root
        type="single"
        value={selectedMode}
        variant="outline"
        class="conformance-mode-toggle"
        aria-labelledby="conformance-mode-title"
        disabled={busy}
        onValueChange={handleModeChange}
      >
        <ToggleGroup.Item value="safe">
          {m.conformance_mode_safe()}
        </ToggleGroup.Item>
        <ToggleGroup.Item value="full">
          {m.conformance_mode_full()}
        </ToggleGroup.Item>
      </ToggleGroup.Root>
      <Field.FieldDescription>
        {mode === RunMode.RunModeFull
          ? m.conformance_mode_full_description()
          : m.conformance_mode_safe_description()}
      </Field.FieldDescription>
    </Field.Field>

    {#if mode === RunMode.RunModeFull}
      <Alert.Root variant="destructive">
        <DatabaseZap aria-hidden="true" />
        <Alert.Title>{m.conformance_full_warning_title()}</Alert.Title>
        <Alert.Description>{m.conformance_full_warning_description()}</Alert.Description>
      </Alert.Root>
    {/if}
  </Card.Content>

  <Card.Footer class="conformance-run-footer">
    <p>{m.conformance_certification_disclaimer()}</p>
    <Button
      type="button"
      variant={mode === RunMode.RunModeFull ? "destructive" : "default"}
      disabled={!metadataAvailable || metadataLoading || busy}
      onclick={requestRun}
    >
      {#if busy}
        <Spinner data-icon="inline-start" />
        {m.conformance_running()}
      {:else}
        <Play data-icon="inline-start" aria-hidden="true" />
        {m.conformance_run()}
      {/if}
    </Button>
  </Card.Footer>
</Card.Root>

<AlertDialog.Root bind:open={confirmFullOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Media><DatabaseZap aria-hidden="true" /></AlertDialog.Media>
      <AlertDialog.Title>{m.conformance_confirm_full_title()}</AlertDialog.Title>
      <AlertDialog.Description>{m.conformance_confirm_full_description()}</AlertDialog.Description>
    </AlertDialog.Header>

    <AlertDialog.Footer>
      <AlertDialog.Cancel>{m.cancel()}</AlertDialog.Cancel>
      <AlertDialog.Action variant="destructive" onclick={confirmFullRun}>
        {m.conformance_confirm_full_action()}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  @layer blocks {
    :global(.conformance-run-panel),
    :global(.conformance-run-content) {
      min-width: 0;
    }

    :global(.conformance-run-content) {
      display: grid;
      gap: var(--space-5);
    }

    .conformance-control {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    .conformance-control-copy h3 {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 600;
    }

    :global(.conformance-mode-toggle) {
      width: fit-content;
      max-width: 100%;
    }

    :global(.conformance-mode-toggle [data-slot="toggle-group-item"]) {
      min-width: 9.5rem;
    }

    :global(.conformance-run-footer) {
      justify-content: space-between;
      gap: var(--space-4);
    }

    :global(.conformance-run-footer p) {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.75rem;
      line-height: 1.4;
    }
  }
</style>
