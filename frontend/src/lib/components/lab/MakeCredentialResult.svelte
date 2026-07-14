<script lang="ts">
  import type { MakeCredentialEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

  import { Badge } from "$lib/components/ui/badge/index.js";

  import { m } from "../../../paraglide/messages.js";

  import LabHexValue from "./LabHexValue.svelte";
  import LabRawDisclosure from "./LabRawDisclosure.svelte";

  type Props = {
    responseEnvelope: MakeCredentialEnvelope;
  };

  let { responseEnvelope }: Props = $props();
  let result = $derived(responseEnvelope.result!.result!);

  function booleanLabel(value: boolean) {
    return value ? m.lab_true() : m.lab_false();
  }
</script>

<section class="lab-operation-result" aria-labelledby="lab-make-result-title">
  <header class="lab-operation-result-header">
    <h3 id="lab-make-result-title">{m.lab_make_result()}</h3>
    <Badge variant="secondary">{m.lab_phase_success()}</Badge>
  </header>

  <dl class="lab-result-list">
    <div>
      <dt>{m.lab_credential_id()}</dt>
      <dd><LabHexValue label={m.lab_credential_id()} value={result.credentialIDHex} /></dd>
    </div>
    <div><dt>{m.lab_format()}</dt><dd><code>{result.fmt}</code></dd></div>
    <div>
      <dt>{m.lab_public_key_cose()}</dt>
      <dd><LabHexValue label={m.lab_public_key_cose()} value={result.publicKeyCOSEHex} /></dd>
    </div>
    <div>
      <dt>{m.lab_authenticator_data()}</dt>
      <dd><LabHexValue label={m.lab_authenticator_data()} value={result.authenticatorDataHex} /></dd>
    </div>
    <div>
      <dt>{m.lab_attestation_object()}</dt>
      <dd><LabHexValue label={m.lab_attestation_object()} value={result.attestationObjectCBORHex} /></dd>
    </div>
    <div><dt>{m.lab_aaguid()}</dt><dd><code>{result.aaguid || m.lab_not_reported()}</code></dd></div>
    <div><dt>{m.lab_sign_count()}</dt><dd>{result.signCount}</dd></div>
    <div>
      <dt>{m.lab_user_present()}</dt>
      <dd><Badge variant="outline">{booleanLabel(result.userPresent)}</Badge></dd>
    </div>
    <div>
      <dt>{m.lab_user_verified()}</dt>
      <dd><Badge variant="outline">{booleanLabel(result.userVerified)}</Badge></dd>
    </div>
    <div>
      <dt>{m.lab_enterprise_attestation()}</dt>
      <dd>
        <Badge variant="outline">
          {result.enterpriseAttestation === undefined
            ? m.lab_not_reported()
            : booleanLabel(result.enterpriseAttestation)}
        </Badge>
      </dd>
    </div>
  </dl>

  <LabRawDisclosure
    title={m.lab_raw_response()}
    value={responseEnvelope}
  />
</section>

<style>
@layer blocks {
  .lab-operation-result {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .lab-operation-result-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .lab-operation-result-header h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  .lab-result-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--border);
  }

  .lab-result-list > div {
    display: grid;
    align-content: start;
    gap: var(--space-1);
    min-width: 0;
    padding: var(--space-3);
    background: var(--card);
  }

  .lab-result-list dt {
    color: var(--muted-foreground);
    font-size: 0.7rem;
  }

  .lab-result-list dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 0.78rem;
  }

  @media (max-width: 42rem) {
    .lab-result-list {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
