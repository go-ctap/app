<script lang="ts">
  import { ChevronsUpDown, KeyRound, Plus, Trash2 } from "@lucide/svelte";

  import { CredentialVerificationMaterial } from "../../../../bindings/github.com/telesma-app/kit/model/webauthn";

  import { Badge } from "$lib/components/ui/badge";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import * as Field from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    entries: CredentialVerificationMaterial[];
    disabled?: boolean;
    onChange: (entries: CredentialVerificationMaterial[]) => void;
  };

  let { entries, disabled = false, onChange }: Props = $props();

  let open = $state(false);

  $effect(() => {
    if (entries.length === 0) open = true;
  });

  function updateEntry(index: number, patch: Partial<CredentialVerificationMaterial>) {
    onChange(
      entries.map((entry, entryIndex) =>
        entryIndex === index ? new CredentialVerificationMaterial({ ...entry, ...patch }) : entry,
      ),
    );
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

<Collapsible.Root bind:open class="lab-verification-material">
  <header class="lab-verification-material-header">
    <div class="lab-verification-material-summary">
      <div class="lab-verification-material-title">
        <KeyRound aria-hidden="true" />

        <div>
          <h3>{m.lab_verification_material()}</h3>
          <p>{m.lab_verification_material_not_sent()}</p>
        </div>
      </div>
      <Badge variant={entries.length ? "secondary" : "outline"}>
        {m.lab_verification_material_count({ count: entries.length })}
      </Badge>
    </div>
    <Collapsible.Trigger class={buttonVariants({ variant: "ghost", size: "sm" })} {disabled}>
      {open ? m.lab_verification_material_hide() : m.lab_verification_material_show()}
      <ChevronsUpDown data-icon="inline-end" aria-hidden="true" />
    </Collapsible.Trigger>
  </header>

  <Collapsible.Content class="lab-verification-material-content">
    <div class="lab-verification-material-actions">
      <p>{m.lab_verification_material_description()}</p>
      <Button type="button" size="sm" variant="outline" {disabled} onclick={addEntry}>
        <Plus data-icon="inline-start" aria-hidden="true" />
        {m.lab_verification_material_add()}
      </Button>
    </div>

    {#each entries as entry, index (`${index}:${entry.credentialIDHex}`)}
      <Field.Group
        class="lab-verification-material-row"
        aria-label={`${m.lab_verification_material()} ${index + 1}`}
      >
        <Field.Field class="lab-verification-material-field" data-disabled={disabled}>
          <Field.Label for={`lab-verification-credential-${index}`}
            >{m.lab_credential_id()}</Field.Label
          >
          <Input
            id={`lab-verification-credential-${index}`}
            value={entry.credentialIDHex}
            spellcheck={false}
            autocomplete="off"
            {disabled}
            onchange={(event) =>
              updateEntry(index, {
                credentialIDHex: event.currentTarget.value.trim(),
              })}
          />
        </Field.Field>

        <Field.Field
          class="lab-verification-material-field lab-verification-material-key"
          data-disabled={disabled}
        >
          <Field.Label for={`lab-verification-key-${index}`}>{m.lab_public_key_cose()}</Field.Label>
          <Input
            id={`lab-verification-key-${index}`}
            value={entry.publicKeyCOSEHex}
            spellcheck={false}
            autocomplete="off"
            {disabled}
            onchange={(event) =>
              updateEntry(index, {
                publicKeyCOSEHex: event.currentTarget.value.trim(),
              })}
          />
        </Field.Field>

        <Field.Field class="lab-verification-material-field" data-disabled={disabled}>
          <Field.Label for={`lab-verification-counter-${index}`}
            >{m.lab_verification_previous_counter()}</Field.Label
          >
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
  </Collapsible.Content>
</Collapsible.Root>

<style>
  @layer composition {
    :global(.lab-verification-material-row) {
      display: grid;
      grid-template-columns: minmax(10rem, 1fr) minmax(14rem, 2fr) minmax(9rem, 0.6fr) auto;
      gap: var(--space-3);
      align-items: end;
    }
  }

  @layer blocks {
    :global(.lab-verification-material) {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
      padding: var(--space-3);
      border: 1px solid var(--border);
      border-style: dashed;
      background: color-mix(in oklch, var(--muted) 30%, transparent);
    }

    .lab-verification-material-header,
    .lab-verification-material-summary,
    .lab-verification-material-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }

    .lab-verification-material-header,
    .lab-verification-material-actions {
      justify-content: space-between;
    }

    .lab-verification-material-summary {
      flex: 1 1 24rem;
    }

    .lab-verification-material-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }

    .lab-verification-material-title > div {
      display: grid;
      gap: 0.1rem;
      min-width: 0;
    }

    .lab-verification-material-title h3,
    .lab-verification-material-title p,
    .lab-verification-material-actions p {
      margin: 0;
    }

    .lab-verification-material-title h3 {
      font-size: 0.8rem;
    }

    .lab-verification-material-title p,
    .lab-verification-material-actions p,
    .lab-verification-material-empty {
      color: var(--muted-foreground);
      font-size: 0.72rem;
      line-height: 1.45;
    }

    .lab-verification-material-title :global(svg) {
      width: 1rem;
      height: 1rem;
      flex: 0 0 auto;
    }

    :global(.lab-verification-material-content) {
      display: grid;
      gap: var(--space-3);
      min-width: 0;
    }

    .lab-verification-material-empty {
      margin: 0;
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
