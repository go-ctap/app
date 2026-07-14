<script lang="ts">
  import type { GetAssertionEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

  import { Badge } from "$lib/components/ui/badge/index.js";
  import { base64ToHex } from "$lib/lab-input";

  import { m } from "../../../paraglide/messages.js";

  import LabHexValue from "./LabHexValue.svelte";
  import LabRawDisclosure from "./LabRawDisclosure.svelte";

  type Props = {
    responseEnvelope: GetAssertionEnvelope;
  };

  let { responseEnvelope }: Props = $props();

  let result = $derived(responseEnvelope.result!.result);
  let assertions = $derived(result.assertions ?? []);

  function booleanLabel(value: boolean) {
    return value ? m.lab_true() : m.lab_false();
  }

  function nullableBooleanLabel(value: boolean | null | undefined) {
    return value === null || value === undefined ? m.lab_not_reported() : booleanLabel(value);
  }
</script>

<section class="lab-assertion-result" aria-labelledby="lab-assertion-result-title">
  <header class="lab-assertion-result-header">
    <h3 id="lab-assertion-result-title">{m.lab_assertion_result()}</h3>
    <Badge variant={assertions.length ? "secondary" : "outline"}>
      {m.lab_assertions_count({ count: assertions.length })}
    </Badge>
  </header>

  {#if assertions.length === 0}
    <p class="lab-no-assertions">{m.lab_no_assertions()}</p>
  {:else}
    <div class="lab-assertion-list">
      {#each assertions as assertion, assertionIndex (assertion.index)}
        <section
          class="lab-assertion"
          aria-labelledby={`lab-assertion-${assertion.index}-${assertionIndex}`}
        >
          <header>
            <h4 id={`lab-assertion-${assertion.index}-${assertionIndex}`}>
              {m.lab_assertion_heading({ index: assertion.index })}
            </h4>
            <Badge variant="outline">{assertion.credential.type}</Badge>
          </header>

          <dl class="lab-assertion-fields">
            <div>
              <dt>{m.lab_credential_id()}</dt>
              <dd>
                <LabHexValue
                  label={m.lab_credential_id()}
                  value={base64ToHex(assertion.credential.id)}
                />
              </dd>
            </div>
            <div>
              <dt>{m.lab_user_id()}</dt>
              <dd>
                {#if assertion.user}
                  <LabHexValue
                    label={m.lab_user_id()}
                    value={base64ToHex(assertion.user.id)}
                  />
                {:else}
                  {m.lab_not_reported()}
                {/if}
              </dd>
            </div>
            <div>
              <dt>{m.lab_signature()}</dt>
              <dd><LabHexValue label={m.lab_signature()} value={assertion.signatureHex} /></dd>
            </div>
            <div>
              <dt>{m.lab_authenticator_data()}</dt>
              <dd>
                <LabHexValue
                  label={m.lab_authenticator_data()}
                  value={assertion.authenticatorDataHex}
                />
              </dd>
            </div>
            <div>
              <dt>{m.lab_number_of_credentials()}</dt>
              <dd>{assertion.numberOfCredentials ?? m.lab_not_reported()}</dd>
            </div>
            <div>
              <dt>{m.lab_user_selected()}</dt>
              <dd><Badge variant="outline">{nullableBooleanLabel(assertion.userSelected)}</Badge></dd>
            </div>
            <div><dt>{m.lab_sign_count()}</dt><dd>{assertion.signCount}</dd></div>
            <div>
              <dt>{m.lab_user_present()}</dt>
              <dd><Badge variant="outline">{booleanLabel(assertion.userPresent)}</Badge></dd>
            </div>
            <div>
              <dt>{m.lab_user_verified()}</dt>
              <dd><Badge variant="outline">{booleanLabel(assertion.userVerified)}</Badge></dd>
            </div>
          </dl>
        </section>
      {/each}
    </div>
  {/if}

  <LabRawDisclosure
    title={m.lab_raw_response()}
    value={responseEnvelope}
  />
</section>

<style>
@layer blocks {
  .lab-assertion-result,
  .lab-assertion-list,
  .lab-assertion {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .lab-assertion-result-header,
  .lab-assertion > header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .lab-assertion-result h3,
  .lab-assertion-result h4 {
    margin: 0;
    font-size: 0.9rem;
  }

  .lab-no-assertions {
    margin: 0;
    padding: var(--space-4);
    border: 1px dashed var(--border);
    color: var(--muted-foreground);
    text-align: center;
  }

  .lab-assertion {
    padding: var(--space-3);
    border: 1px solid var(--border);
  }

  .lab-assertion-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    min-width: 0;
    margin: 0;
  }

  .lab-assertion-fields > div {
    display: grid;
    align-content: start;
    gap: var(--space-1);
    min-width: 0;
  }

  .lab-assertion-fields dt {
    color: var(--muted-foreground);
    font-size: 0.7rem;
  }

  .lab-assertion-fields dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 0.78rem;
  }

  @media (max-width: 42rem) {
    .lab-assertion-fields {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
