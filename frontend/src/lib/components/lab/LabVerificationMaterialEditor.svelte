<script lang="ts">
  import { KeyRound, Plus, Trash2 } from "@lucide/svelte";

  import { CredentialVerificationMaterial } from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    entries: CredentialVerificationMaterial[];
    disabled?: boolean;
    onChange: (entries: CredentialVerificationMaterial[]) => void;
  };

  let { entries, disabled = false, onChange }: Props = $props();

  function updateEntry(index: number, patch: Partial<CredentialVerificationMaterial>) {
    onChange(entries.map((entry, entryIndex) => entryIndex === index
      ? new CredentialVerificationMaterial({ ...entry, ...patch })
      : entry));
  }

  function updatePreviousCounter(index: number, value: string) {
    if (value.trim() === "") {
      updateEntry(index, { previousSignCount: undefined });
      return;
    }
    const parsed = Number(value);
    updateEntry(index, {
      previousSignCount: Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined,
    });
  }

  function addEntry() {
    onChange([...entries, new CredentialVerificationMaterial()]);
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, entryIndex) => entryIndex !== index));
  }
</script>

<Card.Root class="lab-verification-material">
  <Card.Header>
    <Card.Title>
      <span class="lab-verification-material-title">
        <KeyRound aria-hidden="true" />
        {m.lab_verification_material()}
      </span>
    </Card.Title>
    <Card.Description>{m.lab_verification_material_description()}</Card.Description>
    <Card.Action>
      <Button type="button" size="sm" variant="outline" {disabled} onclick={addEntry}>
        <Plus data-icon="inline-start" aria-hidden="true" />
        {m.lab_verification_material_add()}
      </Button>
    </Card.Action>
  </Card.Header>

  <Card.Content class="lab-verification-material-content">
    <p class="lab-verification-material-boundary">{m.lab_verification_material_not_sent()}</p>
    {#each entries as entry, index (`${index}:${entry.credentialIDHex}`)}
      <Field.Group class="lab-verification-material-row" aria-label={`${m.lab_verification_material()} ${index + 1}`}>
        <Field.Field class="lab-verification-material-field" data-disabled={disabled}>
          <Field.Label for={`lab-verification-credential-${index}`}>{m.lab_credential_id()}</Field.Label>
          <Input
            id={`lab-verification-credential-${index}`}
            value={entry.credentialIDHex}
            spellcheck={false}
            autocomplete="off"
            {disabled}
            onchange={(event) => updateEntry(index, {
              credentialIDHex: event.currentTarget.value.trim(),
            })}
          />
        </Field.Field>
        <Field.Field class="lab-verification-material-field lab-verification-material-key" data-disabled={disabled}>
          <Field.Label for={`lab-verification-key-${index}`}>{m.lab_public_key_cose()}</Field.Label>
          <Input
            id={`lab-verification-key-${index}`}
            value={entry.publicKeyCOSEHex}
            spellcheck={false}
            autocomplete="off"
            {disabled}
            onchange={(event) => updateEntry(index, {
              publicKeyCOSEHex: event.currentTarget.value.trim(),
            })}
          />
        </Field.Field>
        <Field.Field class="lab-verification-material-field" data-disabled={disabled}>
          <Field.Label for={`lab-verification-counter-${index}`}>{m.lab_verification_previous_counter()}</Field.Label>
          <Input
            id={`lab-verification-counter-${index}`}
            type="number"
            min="0"
            step="1"
            value={entry.previousSignCount ?? ""}
            {disabled}
            onchange={(event) => updatePreviousCounter(index, event.currentTarget.value)}
          />
        </Field.Field>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`${m.lab_remove()} ${m.lab_verification_material()} ${index + 1}`}
          {disabled}
          onclick={() => removeEntry(index)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </Field.Group>
    {:else}
      <p class="lab-verification-material-empty">{m.lab_verification_material_empty()}</p>
    {/each}
  </Card.Content>
</Card.Root>

<style>
@layer compositions {
  :global(.lab-verification-material-row) {
    display: grid;
    grid-template-columns: minmax(10rem, 1fr) minmax(14rem, 2fr) minmax(9rem, 0.6fr) auto;
    gap: var(--space-3);
    align-items: end;
  }
}

@layer blocks {
  :global(.lab-verification-material) {
    min-width: 0;
    border-style: dashed;
  }

  .lab-verification-material-title {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  :global(.lab-verification-material-title svg) {
    width: 1rem;
    height: 1rem;
  }

  :global(.lab-verification-material-content) {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .lab-verification-material-boundary,
  .lab-verification-material-empty {
    margin: 0;
    color: var(--muted-foreground);
    font-size: 0.75rem;
  }

  .lab-verification-material-boundary {
    width: fit-content;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--muted);
  }

  :global(.lab-verification-material-field) {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  :global(.lab-verification-material-field input) {
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }

  @media (max-width: 60rem) {
    :global(.lab-verification-material-row) {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    :global(.lab-verification-material-field) {
      grid-column: 1;
    }

    :global(.lab-verification-material-row > button) {
      grid-column: 2;
      grid-row: 1;
    }
  }
}
</style>
