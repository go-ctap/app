<script lang="ts">
  import { Radio, Usb } from "@lucide/svelte";

  import * as Empty from "$lib/components/ui/empty/index.js";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    screenLabel: string;
  };

  let { screenLabel }: Props = $props();
</script>

<Empty.Root class="no-authenticator-state">
  <Empty.Header>
    <Empty.Media variant="icon" aria-hidden="true">
      <Usb />
    </Empty.Media>
    <Empty.Title><h2>{m.no_authenticator_title()}</h2></Empty.Title>
    <Empty.Description>{m.no_authenticator_description()}</Empty.Description>
  </Empty.Header>

  <Empty.Content class="no-authenticator-content">
    <ol class="no-authenticator-steps" role="list">
      <li class="no-authenticator-step" data-current="true" aria-current="step">
        <span class="no-authenticator-step-number" aria-hidden="true">1</span>
        <span class="no-authenticator-step-copy">
          <strong>{m.no_authenticator_connect_title()}</strong>
          <span>{m.no_authenticator_connect_description()}</span>
        </span>
      </li>
      <li class="no-authenticator-step">
        <span class="no-authenticator-step-number" aria-hidden="true">2</span>
        <span class="no-authenticator-step-copy">
          <strong>{m.no_authenticator_open_title()}</strong>
          <span>{m.no_authenticator_open_description()}</span>
        </span>
      </li>
      <li class="no-authenticator-step">
        <span class="no-authenticator-step-number" aria-hidden="true">3</span>
        <span class="no-authenticator-step-copy">
          <strong>{m.no_authenticator_screen_title({ screen: screenLabel })}</strong>
          <span>{m.no_authenticator_screen_description()}</span>
        </span>
      </li>
    </ol>

    <p class="no-authenticator-watching">
      <Radio size={14} aria-hidden="true" />
      <span>{m.no_authenticator_watching()}</span>
    </p>
  </Empty.Content>
</Empty.Root>

<style>
@layer blocks {
  :global(.no-authenticator-state) {
    min-height: max(24rem, calc(100dvh - 10rem));
    padding-block: var(--space-6);
  }

  :global(.no-authenticator-state [data-slot="empty-header"]) {
    width: min(100%, 34rem);
    max-width: none;
  }

  :global(.no-authenticator-state [data-slot="empty-icon"]) {
    background: var(--muted);
  }

  :global(.no-authenticator-state [data-slot="empty-title"] h2) {
    margin: 0;
    font: inherit;
  }

  :global(.no-authenticator-content) {
    align-items: stretch;
    width: min(100%, 34rem);
    max-width: none;
    text-align: left;
  }

  .no-authenticator-steps {
    display: grid;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .no-authenticator-step {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-3);
    align-items: start;
    padding-block: var(--space-3);
    border-top: 1px solid var(--border);
  }

  .no-authenticator-step:last-child {
    border-bottom: 1px solid var(--border);
  }

  .no-authenticator-step-number {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    background: var(--muted);
    color: var(--foreground);
    font-weight: 600;
  }

  .no-authenticator-step-copy {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .no-authenticator-step-copy strong {
    color: var(--foreground);
    font-weight: 600;
  }

  .no-authenticator-step-copy > span {
    color: var(--muted-foreground);
    line-height: 1.45;
  }

  .no-authenticator-watching {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin: 0;
    color: var(--muted-foreground);
  }
}

@layer exceptions {
  .no-authenticator-step[data-current="true"] .no-authenticator-step-number {
    background: var(--primary);
    color: var(--primary-foreground);
  }
}
</style>
