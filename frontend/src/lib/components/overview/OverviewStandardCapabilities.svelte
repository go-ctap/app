<script lang="ts">
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import type {
    OverviewStandardPresentation,
    OverviewStandardTone,
  } from "$lib/overview-rules";

  import { m } from "../../../paraglide/messages.js";

  let { presentation }: { presentation: OverviewStandardPresentation } = $props();

  function badgeVariant(tone: OverviewStandardTone): BadgeVariant {
    if (tone === "positive") return "default";
    if (tone === "warning") return "warning";
    if (tone === "neutral") return "secondary";
    return "outline";
  }

</script>

<Card.Root class="standard-capabilities-card">
  <Card.Header>
    <Card.Title>{m.overview_standard_capabilities_title()}</Card.Title>
    <Card.Description>{m.overview_standard_capabilities_description()}</Card.Description>
  </Card.Header>

  <Card.Content>
    <div class="standard-capability-list">
      {#each presentation.capabilities as capability (capability.id)}
        <article class="standard-capability-row" data-tone={capability.tone}>
          <div class="standard-capability-copy">
            <strong>{capability.name}</strong>
            <p>{capability.description}</p>
          </div>
          <Badge variant={badgeVariant(capability.tone)}>{capability.value}</Badge>
        </article>
      {/each}
    </div>
  </Card.Content>
</Card.Root>

<style>
@layer blocks {
    :global(.standard-capabilities-card) {
      min-width: 0;
      padding-block-end: 0;
    }

    :global(.standard-capabilities-card [data-slot="card-content"]) {
      padding-inline: 0;
    }

    .standard-capability-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .standard-capability-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-3);
      align-items: start;
      min-width: 0;
      border-top: 1px solid var(--border);
      padding: var(--space-3) var(--space-4);
    }

    .standard-capability-row:nth-child(odd) {
      border-inline-end: 1px solid var(--border);
    }

    .standard-capability-row:last-child:nth-child(odd) {
      grid-column: 1 / -1;
      border-inline-end: 0;
    }

    .standard-capability-copy {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }

    .standard-capability-copy strong {
      font-size: 0.8rem;
    }

    .standard-capability-copy p {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.74rem;
      line-height: 1.5;
    }

    @container workspace (max-width: 42rem) {
      .standard-capability-list {
        grid-template-columns: minmax(0, 1fr);
      }

      .standard-capability-row:nth-child(odd) {
        border-inline-end: 0;
      }

      .standard-capability-row:last-child:nth-child(odd) {
        grid-column: auto;
      }
    }
}
</style>
