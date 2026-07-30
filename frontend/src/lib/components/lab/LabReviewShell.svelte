<script lang="ts">
  import { Eye, TriangleAlert } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  import type { Warning } from "../../../../bindings/github.com/go-ctap/kit/model/safety";
  import type {
    GetAssertionInput,
    MakeCredentialInput,
  } from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";

  import * as Alert from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { warningMessage } from "$lib/warning-message";

  import { m } from "../../../paraglide/messages.js";

  import LabDataViewerSheet from "$lib/components/lab/LabDataViewerSheet.svelte";

  let {
    operation,
    warnings,
    input,
    summary,
  }: {
    operation: "make" | "get";
    warnings?: Warning[];
    input: MakeCredentialInput | GetAssertionInput;
    summary: Snippet;
  } = $props();

  let requestOpen = $state(false);

  let titleId = $derived(`lab-${operation}-review-title`);
  let warningsTitleId = $derived(`lab-${operation}-review-warnings-title`);
</script>

<section class="lab-review" aria-labelledby={titleId}>
  <header class="lab-review-heading">
    <h3 id={titleId}>{m.lab_review_snapshot()}</h3>
    <Badge variant="secondary">{m.lab_phase_review()}</Badge>
  </header>

  <Alert.Root role="status">
    <Alert.Description>{m.lab_review_notice()}</Alert.Description>
  </Alert.Root>

  {#if warnings?.length}
    <section class="lab-review-warnings" aria-labelledby={warningsTitleId}>
      <h4 id={warningsTitleId}>{m.lab_preview_warnings()}</h4>

      {#each warnings as warning, index (`${warning.code}-${index}`)}
        <Alert.Root
          variant={warning.severity === "destructive" ? "destructive" : "warning"}
          role="alert"
        >
          <TriangleAlert aria-hidden="true" />
          <Alert.Description>{warningMessage(warning)}</Alert.Description>
        </Alert.Root>
      {/each}
    </section>
  {/if}

  <dl class="lab-review-summary">
    {@render summary()}
  </dl>

  <div class="lab-request-json-row">
    <div>
      <strong>{m.lab_request_json()}</strong>
      <span>{m.lab_normalized_request()}</span>
    </div>
    <Button type="button" size="sm" variant="outline" onclick={() => (requestOpen = true)}>
      <Eye data-icon="inline-start" aria-hidden="true" />
      {m.lab_view()}
    </Button>
  </div>
</section>

<LabDataViewerSheet
  open={requestOpen}
  title={m.lab_request_json()}
  kind="json"
  value={input}
  onOpenChange={(open) => (requestOpen = open)}
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

    :global(.lab-review-summary > div) {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
      padding: var(--space-3);
      background: var(--card);
    }

    :global(.lab-review-summary dt),
    .lab-request-json-row span {
      color: var(--muted-foreground);
      font-size: 0.7rem;
    }

    :global(.lab-review-summary dd) {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      font-size: 0.78rem;
    }

    :global(.lab-review-summary .lab-review-wide) {
      grid-column: 1 / -1;
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

      :global(.lab-review-summary .lab-review-wide) {
        grid-column: auto;
      }
    }
  }
</style>
