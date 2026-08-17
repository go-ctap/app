<script lang="ts">
  import { BookOpen, ExternalLink, Info, LifeBuoy } from "@lucide/svelte";

  import {
    PasskeySupportMode,
    type PasskeyDirectoryMatch,
  } from "../../../../bindings/telesma/passkeydirectory";

  import { Badge } from "$lib/components/ui/badge";
  import { openExternalLink } from "$lib/external-links";
  import { normalizedRPID } from "$lib/features/passkeys/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    rpID: string;
    match: PasskeyDirectoryMatch;
  };

  let { rpID, match }: Props = $props();

  function supportModeLabel(mode: PasskeySupportMode) {
    return mode === PasskeySupportMode.PasskeySupportModeRequired
      ? m.passkey_directory_required()
      : m.passkey_directory_optional();
  }
</script>

<section
  class="passkey-directory-reference"
  aria-labelledby={`passkey-directory-title-${normalizedRPID(rpID)}`}
>
  <div class="passkey-directory-reference-heading">
    <BookOpen aria-hidden="true" />
    <span>
      <h3 id={`passkey-directory-title-${normalizedRPID(rpID)}`}>
        {m.passkey_directory()}
      </h3>
      <small>{m.passkey_directory_community_reference()}</small>
    </span>
  </div>

  <div class="passkey-directory-reference-body">
    {#if match.canonicalDomain !== normalizedRPID(rpID)}
      <span class="passkey-directory-reference-domain">
        <small>{m.passkey_directory_canonical_domain()}</small>
        <code>{match.canonicalDomain}</code>
      </span>
    {/if}

    {#if match.passwordless || match.mfa}
      <div class="passkey-directory-reference-support">
        {#if match.passwordless}
          <span>
            {m.passkey_directory_passwordless()}
            <Badge variant="outline">{supportModeLabel(match.passwordless)}</Badge>
          </span>
        {/if}
        {#if match.mfa}
          <span>
            {m.passkey_directory_mfa()}
            <Badge variant="outline">{supportModeLabel(match.mfa)}</Badge>
          </span>
        {/if}
      </div>
    {/if}

    {#if match.documentation || match.recovery}
      <nav class="passkey-directory-reference-links" aria-label={m.passkey_directory_links()}>
        {#if match.documentation}
          <a
            href={match.documentation}
            target="_blank"
            rel="noreferrer"
            title={match.documentation}
            onclick={(event) => openExternalLink(event, match.documentation!)}
          >
            <BookOpen aria-hidden="true" />
            <span>{m.passkey_directory_setup_guide()}</span>
            <ExternalLink aria-hidden="true" />
          </a>
        {/if}
        {#if match.recovery}
          <a
            href={match.recovery}
            target="_blank"
            rel="noreferrer"
            title={match.recovery}
            onclick={(event) => openExternalLink(event, match.recovery!)}
          >
            <LifeBuoy aria-hidden="true" />
            <span>{m.passkey_directory_account_recovery()}</span>
            <ExternalLink aria-hidden="true" />
          </a>
        {/if}
      </nav>
    {/if}
  </div>

  <footer class="passkey-directory-reference-footer">
    <span class="passkey-directory-reference-disclaimer">
      <Info aria-hidden="true" />
      {m.passkey_directory_disclaimer()}
    </span>

    {#if match.notes}
      <p><strong>{m.passkey_directory_notes()}:</strong> {match.notes}</p>
    {/if}

    <a
      class="passkey-directory-reference-attribution"
      href="https://passkeys.2fa.directory/"
      target="_blank"
      rel="noreferrer"
      onclick={(event) => openExternalLink(event, "https://passkeys.2fa.directory/")}
    >
      <span>{m.passkey_directory_attribution()}</span>
      <ExternalLink aria-hidden="true" />
    </a>
  </footer>
</section>

<style>
  @layer blocks {
    .passkey-directory-reference,
    .passkey-directory-reference-heading,
    .passkey-directory-reference-heading > span,
    .passkey-directory-reference-body,
    .passkey-directory-reference-support,
    .passkey-directory-reference-support > span,
    .passkey-directory-reference-links,
    .passkey-directory-reference-links a,
    .passkey-directory-reference-footer,
    .passkey-directory-reference-domain,
    .passkey-directory-reference-disclaimer,
    .passkey-directory-reference-attribution {
      min-width: 0;
    }

    .passkey-directory-reference {
      display: grid;
      gap: var(--space-3);
      margin-inline: var(--space-5);
      border: 1px solid var(--data-table-border);
      background: var(--muted);
      padding: var(--space-3) var(--space-4);
    }

    .passkey-directory-reference-heading,
    .passkey-directory-reference-support,
    .passkey-directory-reference-support > span,
    .passkey-directory-reference-links,
    .passkey-directory-reference-links a,
    .passkey-directory-reference-footer,
    .passkey-directory-reference-domain,
    .passkey-directory-reference-disclaimer,
    .passkey-directory-reference-attribution {
      display: flex;
      align-items: center;
    }

    .passkey-directory-reference-heading {
      gap: var(--space-2);
    }

    .passkey-directory-reference-heading > :global(svg) {
      width: 1rem;
      height: 1rem;
      color: var(--muted-foreground);
    }

    .passkey-directory-reference-heading > span,
    .passkey-directory-reference-domain {
      display: grid;
      gap: 2px;
    }

    .passkey-directory-reference h3,
    .passkey-directory-reference p {
      margin: 0;
    }

    .passkey-directory-reference h3 {
      font-size: 0.8rem;
    }

    .passkey-directory-reference small,
    .passkey-directory-reference-footer {
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .passkey-directory-reference-body {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3) var(--space-5);
    }

    .passkey-directory-reference-support,
    .passkey-directory-reference-links {
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
    }

    .passkey-directory-reference-support > span,
    .passkey-directory-reference-links a,
    .passkey-directory-reference-attribution {
      gap: var(--space-2);
    }

    .passkey-directory-reference-support > span {
      color: var(--muted-foreground);
      font-size: 0.74rem;
    }

    .passkey-directory-reference-links {
      margin-left: auto;
    }

    .passkey-directory-reference-links a,
    .passkey-directory-reference-attribution {
      color: var(--primary);
      font-size: 0.72rem;
      text-decoration: none;
    }

    .passkey-directory-reference-links :global(svg),
    .passkey-directory-reference-attribution :global(svg),
    .passkey-directory-reference-disclaimer :global(svg) {
      width: 0.75rem;
      height: 0.75rem;
      flex: 0 0 auto;
    }

    .passkey-directory-reference-footer {
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-2) var(--space-4);
      border-top: 1px solid var(--data-table-border);
      padding-top: var(--space-2);
    }

    .passkey-directory-reference-disclaimer,
    .passkey-directory-reference-attribution {
      gap: var(--space-1);
    }

    .passkey-directory-reference-footer p {
      flex: 1 1 18rem;
      overflow-wrap: anywhere;
    }

    .passkey-directory-reference-footer p strong {
      color: var(--foreground);
      font-weight: 500;
    }

    @container workspace (max-width: 46rem) {
      .passkey-directory-reference {
        margin-inline: var(--space-4);
      }

      .passkey-directory-reference-body,
      .passkey-directory-reference-footer {
        align-items: flex-start;
        flex-direction: column;
      }

      .passkey-directory-reference-links {
        margin-left: 0;
      }
    }
  }
</style>
