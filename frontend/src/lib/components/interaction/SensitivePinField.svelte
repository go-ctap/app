<script lang="ts">
  type Props = {
    id?: string;
    label: string;
    name?: string;
    value: string;
    disabled?: boolean;
    autofocus?: boolean;
  };

  let {
    id = "authenticator-pin",
    label,
    name = "authenticator-pin",
    value = $bindable(""),
    disabled = false,
    autofocus = false,
  }: Props = $props();
</script>

<label class="sensitive-field" data-disabled={disabled ? "true" : undefined} for={id}>
  <span>{label}</span>
  <input
    bind:value
    {id}
    {name}
    type="password"
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
    aria-disabled={disabled}
    {disabled}
    data-dialog-initial-focus={autofocus ? true : undefined}
  />
</label>

<style>
@layer blocks {
  .sensitive-field {
    display: grid;
    gap: var(--space-2);
    color: var(--foreground);
    font-size: 0.875rem;
    font-weight: 700;
  }

  .sensitive-field[data-disabled="true"] {
    opacity: 0.72;
  }

  input {
    width: 100%;
    min-height: 2.25rem;
    border: 1px solid var(--input);
    border-radius: var(--radius);
    background: var(--background);
    color: var(--foreground);
    padding: 0 var(--space-3);
    font: inherit;
    font-weight: 500;
  }

  input:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
}
</style>
