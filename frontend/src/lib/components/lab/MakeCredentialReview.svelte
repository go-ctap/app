<script lang="ts">
  import { TriangleAlert } from "@lucide/svelte";

  import type { MakeCredentialRequest } from "../../../../bindings/github.com/go-ctap/kit/service";
  import type { MakeCredentialPreview } from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { warningMessage } from "$lib/warning-message";

  import { m } from "../../../paraglide/messages.js";

  import LabRawDisclosure from "./LabRawDisclosure.svelte";

  type Props = {
    preview: MakeCredentialPreview;
    reviewedRequest: MakeCredentialRequest;
  };

  let { preview, reviewedRequest }: Props = $props();

  function warningVariant(severity: string) {
    return severity === "destructive" ? "destructive" : "warning";
  }
</script>

<section class="lab-review" aria-labelledby="lab-review-title">
  <header class="lab-review-heading">
    <h3 id="lab-review-title">{m.lab_review_snapshot()}</h3>
    <Badge variant="secondary">{m.lab_phase_review()}</Badge>
  </header>

  <Alert.Root role="status">
    <Alert.Description>{m.lab_review_notice()}</Alert.Description>
  </Alert.Root>

  {#if preview.warnings?.length}
    <section class="lab-review-warnings" aria-labelledby="lab-review-warnings-title">
      <h4 id="lab-review-warnings-title">{m.lab_preview_warnings()}</h4>
      {#each preview.warnings as warning, index (`${warning.code}-${index}`)}
        <Alert.Root variant={warningVariant(warning.severity)} role="alert">
          <TriangleAlert aria-hidden="true" />
          <Alert.Description>{warningMessage(warning)}</Alert.Description>
        </Alert.Root>
      {/each}
    </section>
  {/if}

  <dl class="lab-review-summary">
    <div><dt>{m.lab_rp_id()}</dt><dd><code>{preview.rp.id}</code></dd></div>
    <div><dt>{m.lab_rp_name()}</dt><dd>{preview.rp.name}</dd></div>
    <div><dt>{m.lab_user_name()}</dt><dd>{preview.user.name}</dd></div>
    <div><dt>{m.lab_display_name()}</dt><dd>{preview.user.displayName}</dd></div>
    <div>
      <dt>{m.lab_cose_algorithms()}</dt>
      <dd>{preview.pubKeyCredParams.map((parameter) => parameter.alg).join(", ")}</dd>
    </div>
    <div>
      <dt>{m.lab_exclude_list()}</dt>
      <dd>{preview.excludeList?.length ?? 0}</dd>
    </div>
  </dl>

  <div class="lab-review-disclosures">
    <LabRawDisclosure title={m.lab_typed_preview()} value={preview} />
    <LabRawDisclosure
      title={m.lab_normalized_request()}
      value={{
        rp: preview.rp,
        user: preview.user,
        pubKeyCredParams: preview.pubKeyCredParams,
        excludeList: preview.excludeList,
        options: preview.options,
      }}
    />
    <LabRawDisclosure title={m.lab_review_snapshot()} value={reviewedRequest} />
  </div>
</section>

<style>
@layer blocks {
  .lab-review,
  .lab-review-warnings,
  .lab-review-disclosures {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .lab-review-heading {
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
    gap: var(--space-3);
    min-width: 0;
    margin: 0;
    padding: var(--space-3);
    border: 1px solid var(--border);
  }

  .lab-review-summary > div {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .lab-review-summary dt {
    color: var(--muted-foreground);
    font-size: 0.7rem;
  }

  .lab-review-summary dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 0.78rem;
  }

  @media (max-width: 42rem) {
    .lab-review-summary {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
