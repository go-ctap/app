<script lang="ts">
  import ConformanceResults from "$lib/components/conformance/ConformanceResults.svelte";
  import ConformanceRunPanel from "$lib/components/conformance/ConformanceRunPanel.svelte";
  import { buildCTAP23Metadata } from "$lib/conformance-metadata.js";
  import { conformanceSuiteResult } from "$lib/ctapkit-results.js";
  import { failureMessage } from "$lib/failure.js";
  import { authenticatorInspection } from "$lib/features/authenticator";
  import {
    conformanceMode,
    conformanceRun,
    reloadConformanceMetadata,
    runCTAP23Conformance,
    selectConformanceMode,
  } from "$lib/features/conformance";
  import { overviewMDS } from "$lib/features/overview";
  import { statusBar } from "$lib/features/workbench";

  import { m } from "../paraglide/messages.js";

  let metadata = $derived(buildCTAP23Metadata($overviewMDS.data));

  let metadataLoading = $derived(
    $authenticatorInspection.state === "loading" || $overviewMDS.state === "loading",
  );

  let result = $derived(conformanceSuiteResult($conformanceRun.envelope));

  let runErrorMessage = $derived(
    failureMessage($conformanceRun.runtimeError ?? $conformanceRun.envelope?.error ?? null) ?? "",
  );

  let busy = $derived(Boolean($statusBar.activeOperation));
</script>

<section class="conformance-screen" aria-label={m.nav_conformance()}>
  <header class="conformance-screen-header">
    <p>{m.conformance_screen_description()}</p>
  </header>

  <ConformanceRunPanel
    mode={$conformanceMode}
    metadataAvailable={Boolean(metadata)}
    {metadataLoading}
    metadataSource={$overviewMDS.data?.source ?? "FIDO MDS"}
    {busy}
    onModeChange={selectConformanceMode}
    onRefreshMetadata={async () => {
      await reloadConformanceMetadata();
    }}
    onRun={async () => {
      if (metadata) await runCTAP23Conformance($conformanceMode, metadata);
    }}
  />

  <ConformanceResults {result} errorMessage={runErrorMessage} />
</section>

<style>
  @layer blocks {
    .conformance-screen {
      display: grid;
      align-content: start;
      gap: var(--space-4);
      min-width: 0;
    }

    .conformance-screen-header p {
      max-width: 52rem;
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.85rem;
      line-height: 1.5;
    }
  }
</style>
