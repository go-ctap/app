<script lang="ts">
  import { Eye, TriangleAlert } from "@lucide/svelte";

  import type { GetAssertionPreview } from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";

  import * as Alert from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { warningMessage } from "$lib/warning-message";

  import { m } from "../../../paraglide/messages.js";

  import LabDataViewerSheet from "$lib/components/lab/LabDataViewerSheet.svelte";

  type Props = {
    preview: GetAssertionPreview;
  };

  let { preview }: Props = $props();

  let requestOpen = $state(false);

  let extensionNames = $derived(Object.keys(preview.input.extensions ?? {}));

  function warningVariant(severity: string) {
    return severity === "destructive" ? "destructive" : "warning";
  }

  function optionsSummary() {
    const options = Object.entries(preview.input.options ?? {});

    return options.length
      ? options.map(([name, value]) => `${name}: ${String(value)}`).join(", ")
      : m.lab_not_reported();
  }
</script>

<section class="lab-review" aria-labelledby="lab-get-review-title">
  <header class="lab-review-heading">
    <h3 id="lab-get-review-title">{m.lab_review_snapshot()}</h3>
    <Badge variant="secondary">{m.lab_phase_review()}</Badge>
  </header>

  <Alert.Root role="status">
    <Alert.Description>{m.lab_review_notice()}</Alert.Description>
  </Alert.Root>

  {#if preview.warnings?.length}
    <section class="lab-review-warnings" aria-labelledby="lab-get-review-warnings-title">
      <h4 id="lab-get-review-warnings-title">{m.lab_preview_warnings()}</h4>

      {#each preview.warnings as warning, index (`${warning.code}-${index}`)}
        <Alert.Root variant={warningVariant(warning.severity)} role="alert">
          <TriangleAlert aria-hidden="true" />
          <Alert.Description>{warningMessage(warning)}</Alert.Description>
        </Alert.Root>
      {/each}
    </section>
  {/if}

  <dl class="lab-review-summary">
    <div>
      <dt>{m.lab_rp_id()}</dt>
      <dd><code>{preview.input.rpID}</code></dd>
    </div>

    <div>
      <dt>{m.lab_allow_list()}</dt>
      <dd>{preview.input.allowList?.length ?? 0}</dd>
    </div>

    <div>
      <dt>{m.lab_options()}</dt>
      <dd>{optionsSummary()}</dd>
    </div>

    <div>
      <dt>{m.lab_extensions()}</dt>
      <dd>{extensionNames.length ? extensionNames.join(", ") : m.lab_not_reported()}</dd>
    </div>
  </dl>

  <div class="lab-request-json-row">
    <div>
      <strong>{m.lab_request_json()}</strong>
      <span>{m.lab_normalized_request()}</span>
    </div>
    <Button
      type="button"
      size="sm"
      variant="outline"
      onclick={() => {
        requestOpen = true;
      }}
    >
      <Eye data-icon="inline-start" aria-hidden="true" />
      {m.lab_view()}
    </Button>
  </div>
</section>

<LabDataViewerSheet
  open={requestOpen}
  title={m.lab_request_json()}
  kind="json"
  value={preview.input}
  onOpenChange={(open) => {
    requestOpen = open;
  }}
/>

<style>
  @layer blocks {
    .lab-review,
    .lab-review-warnings {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }

    .lab-review-heading,
    .lab-request-json-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }

    .lab-review h3,
    .lab-review h4 {
      margin: 0;
      font-size: 0.9rem;
    }

    .lab-review-summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1px;
      min-width: 0;
      margin: 0;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--border);
    }

    .lab-review-summary > div {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
      padding: var(--space-3);
      background: var(--card);
    }

    .lab-review-summary dt,
    .lab-request-json-row span {
      color: var(--muted-foreground);
      font-size: 0.7rem;
    }

    .lab-review-summary dd {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      font-size: 0.78rem;
    }

    .lab-request-json-row {
      padding: var(--space-3);
      border: 1px solid var(--border);
    }

    .lab-request-json-row > div {
      display: grid;
      gap: var(--space-1);
    }

    .lab-request-json-row strong {
      font-size: 0.78rem;
    }

    @media (max-width: 42rem) {
      .lab-review-summary {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }
</style>
