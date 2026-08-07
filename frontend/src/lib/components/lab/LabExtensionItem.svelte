<script lang="ts">
  import type { Snippet } from "svelte";

  import { Badge } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
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

<Card.Root
  size="sm"
  class="lab-extension-card"
  data-extension={value}
  data-included={included}
  data-unavailable={status === "unavailable"}
>
  <Card.Header>
    <Card.Title><code>{title}</code></Card.Title>
    <Card.Action>
      <label class="lab-extension-include">
        <span>{m.lab_include()}</span>
        <Switch
          checked={included}
          {disabled}
          aria-label={`${m.lab_include()} ${title}`}
          onCheckedChange={onInclude}
        />
      </label>
    </Card.Action>
    <Card.Description>{description}</Card.Description>
  </Card.Header>

  <Card.Content class="lab-extension-card-content">
    <Badge variant={badgeVariant()}>{statusLabel()}</Badge>
    {#if included && children}
      <div class="lab-extension-options">{@render children()}</div>
    {/if}
  </Card.Content>
</Card.Root>

<style>
  @layer blocks {
    .lab-extension-include {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1);
      font-size: 0.68rem;
    }

    :global(.lab-extension-card-content) {
      display: grid;
      justify-items: start;
      gap: var(--space-3);
    }

    .lab-extension-options {
      display: grid;
      gap: var(--space-3);
      width: 100%;
      padding-top: var(--space-2);
    }
  }

  @layer exceptions {
    :global(.lab-extension-card[data-included="true"]) {
      background: color-mix(in srgb, var(--primary) 4%, var(--card));
    }

    :global(.lab-extension-card[data-unavailable="true"]) {
      opacity: 0.72;
    }
  }
</style>
