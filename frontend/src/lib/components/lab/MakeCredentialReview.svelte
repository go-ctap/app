<script lang="ts">
  import type { MakeCredentialPreview } from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";

  import LabReviewShell from "$lib/components/lab/LabReviewShell.svelte";

  import { m } from "../../../paraglide/messages.js";

  let { preview }: { preview: MakeCredentialPreview } = $props();

  let extensionNames = $derived(Object.keys(preview.input.extensions ?? {}));
  let options = $derived(Object.entries(preview.input.options ?? {}));
</script>

<LabReviewShell operation="make" warnings={preview.warnings} input={preview.input}>
  {#snippet summary()}
    <div>
      <dt>{m.lab_rp_id()}</dt>
      <dd><code>{preview.input.rp.id}</code></dd>
    </div>
    <div>
      <dt>{m.lab_rp_name()}</dt>
      <dd>{preview.input.rp.name}</dd>
    </div>
    <div>
      <dt>{m.lab_user_name()}</dt>
      <dd>{preview.input.user.name}</dd>
    </div>
    <div>
      <dt>{m.lab_display_name()}</dt>
      <dd>{preview.input.user.displayName}</dd>
    </div>
    <div>
      <dt>{m.lab_cose_algorithms()}</dt>
      <dd>{preview.input.pubKeyCredParams.map((parameter) => parameter.alg).join(", ")}</dd>
    </div>
    <div>
      <dt>{m.lab_exclude_list()}</dt>
      <dd>{preview.input.excludeList?.length ?? 0}</dd>
    </div>
    <div class="lab-review-wide">
      <dt>{m.lab_options()}</dt>
      <dd>
        {options.length
          ? options.map(([name, value]) => `${name}: ${String(value)}`).join(", ")
          : m.lab_not_reported()}
      </dd>
    </div>
    <div class="lab-review-wide">
      <dt>{m.lab_extensions()}</dt>
      <dd>{extensionNames.length ? extensionNames.join(", ") : m.lab_not_reported()}</dd>
    </div>
  {/snippet}
</LabReviewShell>
