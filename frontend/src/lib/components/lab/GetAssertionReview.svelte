<script lang="ts">
  import type { GetAssertionPreview } from "../../../../bindings/github.com/telesma-app/kit/model/webauthn";

  import LabReviewShell from "$lib/components/lab/LabReviewShell.svelte";

  import { m } from "../../../paraglide/messages.js";

  let { preview }: { preview: GetAssertionPreview } = $props();

  let extensionNames = $derived(Object.keys(preview.input.extensions ?? {}));
  let options = $derived(Object.entries(preview.input.options ?? {}));
</script>

<LabReviewShell operation="get" warnings={preview.warnings} input={preview.input}>
  {#snippet summary()}
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
      <dd>
        {options.length
          ? options.map(([name, value]) => `${name}: ${String(value)}`).join(", ")
          : m.lab_not_reported()}
      </dd>
    </div>
    <div>
      <dt>{m.lab_extensions()}</dt>
      <dd>{extensionNames.length ? extensionNames.join(", ") : m.lab_not_reported()}</dd>
    </div>
  {/snippet}
</LabReviewShell>
