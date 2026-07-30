<script lang="ts">
  import type { Snippet } from "svelte";

  import * as Accordion from "$lib/components/ui/accordion";
  import { Badge } from "$lib/components/ui/badge";
  import { Switch } from "$lib/components/ui/switch";

  import { m } from "../../../paraglide/messages.js";

  export type ExtensionStatus =
    "supported" | "not-reported" | "unknown" | "client-side" | "unavailable";

  type Props = {
    value: string;
    title: string;
    description: string;
    included: boolean;
    disabled?: boolean;
    status: ExtensionStatus;
    onInclude: (included: boolean) => void;
    children?: Snippet;
  };

  let {
    value,
    title,
    description,
    included,
    disabled = false,
    status,
    onInclude,
    children,
  }: Props = $props();

  function statusLabel() {
    if (status === "supported") return m.lab_supported();

    if (status === "not-reported") return m.lab_not_reported();

    if (status === "client-side") return m.lab_client_side();

    if (status === "unavailable") return m.lab_runtime_unavailable();

    return m.lab_unknown();
  }

  function badgeVariant() {
    if (status === "supported" || status === "client-side") return "secondary" as const;

    if (status === "unavailable") return "outline" as const;

    return "warning" as const;
  }
</script>

<Accordion.Item
  {value}
  class="lab-extension-item"
  data-included={included}
  data-unavailable={status === "unavailable"}
>
  <div class="lab-extension-row">
    <label class="lab-extension-include">
      <Switch
        checked={included}
        {disabled}
        aria-label={`${m.lab_include()} ${title}`}
        onCheckedChange={onInclude}
      />
      <span>{m.lab_include()}</span>
    </label>
    <Accordion.Trigger class="lab-extension-trigger">
      <span class="lab-extension-title">
        <span><code>{title}</code><Badge variant={badgeVariant()}>{statusLabel()}</Badge></span>
        <small>{description}</small>
      </span>
    </Accordion.Trigger>
  </div>

  <Accordion.Content class="lab-extension-content">
    {#if children}{@render children()}{/if}
  </Accordion.Content>
</Accordion.Item>

<style>
  @layer blocks {
    :global(.lab-extension-item) {
      min-width: 0;
    }

    .lab-extension-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: stretch;
      gap: var(--space-3);
      min-width: 0;
    }

    .lab-extension-include {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding-block: var(--space-3);
      color: var(--muted-foreground);
      font-size: 0.68rem;
    }

    :global(.lab-extension-trigger) {
      min-width: 0;
      padding-block: var(--space-3);
    }

    .lab-extension-title {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }

    .lab-extension-title > span {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .lab-extension-title small {
      color: var(--muted-foreground);
      font-size: 0.68rem;
      font-weight: 400;
    }

    :global(.lab-extension-content) {
      display: grid;
      gap: var(--space-3);
      padding: 0 var(--space-3) var(--space-3) calc(7rem + var(--space-3));
    }
  }

  @layer exceptions {
    :global(.lab-extension-item[data-included="true"]) {
      background: color-mix(in srgb, var(--primary) 4%, transparent);
    }

    :global(.lab-extension-item[data-unavailable="true"]) {
      opacity: 0.72;
    }
  }

  @media (max-width: 40rem) {
    @layer blocks {
      .lab-extension-row {
        grid-template-columns: minmax(0, 1fr);
        gap: 0;
      }

      .lab-extension-include {
        padding-bottom: 0;
      }

      :global(.lab-extension-content) {
        padding-left: var(--space-3);
      }
    }
  }
</style>
