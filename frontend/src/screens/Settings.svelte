<script lang="ts">
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
      <p>{m.settings_description()}</p>
    </div>
  </header>

  <section class="settings-section" aria-labelledby="settings-language-title">
    <div class="settings-copy">
      <h2 id="settings-language-title">{m.language()}</h2>
      <p>{m.settings_language_description()}</p>
    </div>

    <div class="settings-field">
      <span>{m.language()}</span>
      <Select.Root type="single" value={$currentLocale} onValueChange={handleLocaleChange}>
        <Select.Trigger class="settings-language-trigger" aria-label={m.language()}>
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
    </div>
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
    .settings-header p,
    .settings-section h2,
    .settings-section p {
      margin: 0;
    }

    .settings-header h1 {
      font-size: 1.3rem;
      letter-spacing: 0;
    }

    .settings-header p,
    .settings-section p {
      color: var(--muted-foreground);
      line-height: 1.55;
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

    .settings-field {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
      color: var(--muted-foreground);
      font-size: 0.78rem;
      font-weight: 700;
    }

    :global(.settings-language-trigger) {
      width: 100%;
      min-height: 38px;
    }

    @media (max-width: 720px) {
      .settings-section {
        grid-template-columns: minmax(0, 1fr);
      }
    }
}
</style>
