<script lang="ts">
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { availableLocales, currentLocale, localeLabel, setAppLocale } from "$lib/i18n";
  import { advancedMode, setAdvancedMode } from "$lib/preferences";

  import { m } from "../paraglide/messages.js";

  function handleLocaleChange(value: string | string[]) {
    if (!Array.isArray(value)) setAppLocale(value);
  }
</script>

<section class="settings-screen flow" aria-label={m.settings()}>
  <section
    class="settings-section"
    data-control="wide"
    aria-labelledby="settings-language-title"
  >
    <div class="settings-copy">
      <h2 id="settings-language-title">{m.language()}</h2>
    </div>

    <Field.Field>
      <Select.Root type="single" value={$currentLocale} onValueChange={handleLocaleChange}>
        <Select.Trigger
          id="settings-language"
          class="settings-language-trigger"
          aria-labelledby="settings-language-title"
        >
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

  <section class="settings-section" aria-labelledby="settings-advanced-mode-title">
    <div class="settings-copy">
      <h2 id="settings-advanced-mode-title">{m.advanced_mode()}</h2>
      <p id="settings-advanced-mode-description">{m.advanced_mode_description()}</p>
    </div>

    <Field.Field orientation="horizontal" class="settings-switch-control">
      <Switch
        id="settings-advanced-mode"
        checked={$advancedMode}
        aria-labelledby="settings-advanced-mode-title"
        aria-describedby="settings-advanced-mode-description"
        onCheckedChange={setAdvancedMode}
      />
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

    .settings-section {
      min-width: 0;
    }

    .settings-section h2 {
      margin: 0;
    }

    .settings-section p {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.82rem;
      line-height: 1.5;
    }

    .settings-section {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-5);
      align-items: start;
    }

    .settings-section[data-control="wide"] {
      grid-template-columns: minmax(0, 1fr) minmax(13rem, 18rem);
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

    :global(.settings-switch-control) {
      justify-content: flex-end;
      min-height: 38px;
    }
}
</style>
