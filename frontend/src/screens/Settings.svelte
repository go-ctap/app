<script lang="ts">
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { availableLocales, currentLocale, localeLabel, setAppLocale } from "$lib/i18n";

  import { m } from "../paraglide/messages.js";

  function handleLocaleChange(value: string | string[]) {
    if (!Array.isArray(value)) setAppLocale(value);
  }
</script>

<section class="settings-screen flow" aria-labelledby="settings-title">
  <header class="settings-header">
    <div>
      <h1 id="settings-title">{m.settings()}</h1>
    </div>
  </header>

  <section class="settings-section" aria-labelledby="settings-language-title">
    <div class="settings-copy">
      <h2 id="settings-language-title">{m.language()}</h2>
    </div>

    <Field.Field>
      <Field.Label for="settings-language">{m.language()}</Field.Label>
      <Select.Root type="single" value={$currentLocale} onValueChange={handleLocaleChange}>
        <Select.Trigger id="settings-language" class="settings-language-trigger">
          {localeLabel($currentLocale)}
        </Select.Trigger>
        <Select.Content side="bottom" align="end">
          <Select.Group>
            {#each availableLocales as locale (locale)}
              <Select.Item value={locale} label={localeLabel(locale)} />
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </Field.Field>
  </section>
</section>

<style>
@layer blocks {
    .settings-screen {
      max-width: 48rem;
      min-width: 0;
      --flow-space: var(--space-4);
    }

    .settings-header,
    .settings-section {
      min-width: 0;
    }

    .settings-header h1,
    .settings-section h2 {
      margin: 0;
    }

    .settings-header h1 {
      font-size: 1.3rem;
      letter-spacing: 0;
    }

    .settings-section {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(13rem, 18rem);
      gap: var(--space-5);
      align-items: start;
      border-top: 1px solid var(--border);
      padding-top: var(--space-4);
    }

    .settings-copy {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    .settings-section h2 {
      font-size: 0.96rem;
    }

    :global(.settings-language-trigger) {
      width: 100%;
      min-height: 38px;
    }

    @container workspace (max-width: 45rem) {
      .settings-section {
        grid-template-columns: minmax(0, 1fr);
      }
    }
}
</style>
