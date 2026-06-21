<script lang="ts">
  import { availableLocales, currentLocale, localeLabel, setAppLocale } from "$lib/i18n";
  import { m } from "../paraglide/messages.js";
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

    <label class="settings-screen__field">
      <span>{m.language()}</span>
      <select
        name="language"
        value={$currentLocale}
        onchange={(event) => setAppLocale((event.currentTarget as HTMLSelectElement).value)}
        aria-label={m.language()}
      >
        {#each availableLocales as locale (locale)}
          <option value={locale}>{localeLabel(locale)}</option>
        {/each}
      </select>
    </label>
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
      color: var(--color-text-muted);
      line-height: 1.55;
    }

    .settings-screen__section {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(13rem, 18rem);
      gap: var(--space-5);
      align-items: start;
      border-top: 1px solid var(--color-border);
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
      color: var(--color-text-muted);
      font-size: 0.78rem;
      font-weight: 700;
    }

    .settings-screen__field select {
      width: 100%;
      min-height: 38px;
      color: var(--color-text);
      font-weight: 400;
    }

    @media (max-width: 720px) {
      .settings-screen__section {
        grid-template-columns: minmax(0, 1fr);
      }
    }
}
</style>
