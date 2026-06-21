<script lang="ts">
  import * as Select from "$lib/components/ui/select/index.js";
  import { availableLocales, currentLocale, localeLabel, setAppLocale } from "$lib/i18n";
  import { m } from "../paraglide/messages.js";

  function handleLocaleChange(value: string | string[]) {
    if (!Array.isArray(value)) setAppLocale(value);
  }
</script>

<section class="settings-screen flow" aria-labelledby="settings-title">
  <header class="settings-screen__header">
    <div>
      <h1 id="settings-title">{m.settings()}</h1>
      <p>{m.settings_description()}</p>
    </div>
  </header>

  <section class="settings-screen__section" aria-labelledby="settings-language-title">
    <div class="settings-screen__section-copy">
      <h2 id="settings-language-title">{m.language()}</h2>
      <p>{m.settings_language_description()}</p>
    </div>

    <div class="settings-screen__field">
      <span>{m.language()}</span>
      <Select.Root type="single" value={$currentLocale} onValueChange={handleLocaleChange}>
        <Select.Trigger aria-label={m.language()}>
          {localeLabel($currentLocale)}
        </Select.Trigger>
        <Select.Content side="bottom" align="end">
          {#each availableLocales as locale (locale)}
            <Select.Item value={locale} label={localeLabel(locale)} />
          {/each}
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

    .settings-screen__header,
    .settings-screen__section {
      min-width: 0;
    }

    .settings-screen__header h1,
    .settings-screen__header p,
    .settings-screen__section h2,
    .settings-screen__section p {
      margin: 0;
    }

    .settings-screen__header h1 {
      font-size: 1.3rem;
      letter-spacing: 0;
    }

    .settings-screen__header p,
    .settings-screen__section p {
      color: var(--muted-foreground);
      line-height: 1.55;
    }

    .settings-screen__section {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(13rem, 18rem);
      gap: var(--space-5);
      align-items: start;
      border-top: 1px solid var(--border);
      padding-top: var(--space-4);
    }

    .settings-screen__section-copy {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    .settings-screen__section h2 {
      font-size: 0.96rem;
    }

    .settings-screen__field {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
      color: var(--muted-foreground);
      font-size: 0.78rem;
      font-weight: 700;
    }

    :global(.settings-screen__field [data-slot="select-trigger"]) {
      width: 100%;
      min-height: 38px;
      color: var(--foreground);
      font-weight: 400;
    }

    @media (max-width: 720px) {
      .settings-screen__section {
        grid-template-columns: minmax(0, 1fr);
      }
    }
}
</style>
