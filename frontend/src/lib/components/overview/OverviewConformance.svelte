<script lang="ts">
  import { untrack } from "svelte";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
  import FileWarningIcon from "@lucide/svelte/icons/file-warning";
  import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";

  import * as Alert from "$lib/components/ui/alert";
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge";
  import { buttonVariants } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import { Separator } from "$lib/components/ui/separator";
  import { openExternalLink } from "$lib/external-links";
  import type { OverviewConformancePresentation } from "$lib/overview-rules";

  import { m } from "../../../paraglide/messages.js";

  let { presentation }: { presentation: OverviewConformancePresentation } = $props();

  let open = $state(untrack(() => presentation.status !== "passed"));

  let statusVariant: BadgeVariant = $derived(
    presentation.status === "findings"
      ? "destructive"
      : presentation.status === "inconclusive"
        ? "warning"
        : presentation.status === "unresolved"
          ? "outline"
          : "default",
  );

  let statusLabel = $derived.by(() => {
    if (presentation.status === "findings")
      return m.conformance_findings_count({ count: presentation.findingCount });

    if (presentation.status === "inconclusive")
      return m.conformance_inconclusive_count({ count: presentation.inconclusiveCount });

    if (presentation.status === "unresolved") return m.conformance_not_evaluated();

    return m.conformance_passed();
  });

  let toggleLabel = $derived(
    open ? m.conformance_collapse_details() : m.conformance_expand_details(),
  );
</script>

<Collapsible.Root bind:open class="conformance">
  <Card.Root data-status={presentation.status}>
    <Card.Header class="conformance-header">
      <div class="conformance-heading">
        <span class="conformance-icon" aria-hidden="true">
          <ShieldCheckIcon size={18} />
        </span>
        <div class="conformance-copy">
          <Card.Title role="heading" aria-level={2}>{m.conformance_warnings()}</Card.Title>
          <Card.Description>{m.conformance_warnings_description()}</Card.Description>
        </div>
      </div>
      <Card.Action class="conformance-actions">
        <Badge variant={statusVariant} data-status={presentation.status}>{statusLabel}</Badge>
        {#if presentation.status === "findings" && presentation.inconclusiveCount > 0}
          <Badge variant="warning"
            >{m.conformance_inconclusive_count({ count: presentation.inconclusiveCount })}</Badge
          >
        {/if}
        <Collapsible.Trigger
          class={buttonVariants({ variant: "ghost", size: "icon-sm", class: "conformance-toggle" })}
          title={toggleLabel}
        >
          <ChevronDownIcon aria-hidden="true" />
          <span class="sr-only">{toggleLabel}</span>
        </Collapsible.Trigger>
      </Card.Action>
    </Card.Header>

    <Card.Content>
      <dl class="conformance-summary" data-target={presentation.target ? "resolved" : "unresolved"}>
        {#if presentation.target}
          <div>
            <dt>{m.conformance_profile()}</dt>
            <dd><code>{presentation.target.profile}</code></dd>
          </div>

          <div>
            <dt>{m.conformance_specification()}</dt>
            <dd><code>{presentation.target.specification}</code></dd>
          </div>
        {/if}

        <div>
          <dt>{m.status()}</dt>
          <dd>{statusLabel}</dd>
        </div>
      </dl>
    </Card.Content>

    <Collapsible.Content class="conformance-content">
      <Separator />
      <Card.Content class="conformance-details-content">
        {#if presentation.status === "passed"}
          <Alert.Root role="status">
            <CircleCheckIcon aria-hidden="true" />
            <Alert.Title>{m.conformance_passed_title()}</Alert.Title>
            <Alert.Description>{m.conformance_passed_description()}</Alert.Description>
          </Alert.Root>
        {:else}
          <div class="assessment-list">
            {#each presentation.assessments as assessment, index (`${assessment.id}:${assessment.source}:${index}`)}
              {#if index > 0}<Separator />{/if}

              <article class="assessment-row" data-kind={assessment.kind}>
                <span class="assessment-icon" aria-hidden="true">
                  {#if assessment.kind === "finding"}
                    <FileWarningIcon size={16} />
                  {:else}
                    <CircleAlertIcon size={16} />
                  {/if}
                </span>
                <div class="assessment-details">
                  <div class="assessment-heading">
                    <div class="assessment-title">
                      <strong>{assessment.name}</strong>
                      <code>{assessment.source}</code>
                    </div>

                    <div class="assessment-badges">
                      <Badge
                        variant={assessment.kind === "finding"
                          ? "destructive"
                          : assessment.kind === "inconclusive"
                            ? "warning"
                            : "outline"}
                      >
                        {assessment.kind === "finding"
                          ? m.finding()
                          : assessment.kind === "inconclusive"
                            ? m.conformance_inconclusive()
                            : m.conformance_not_evaluated()}
                      </Badge>
                      {#if assessment.profile}
                        <Badge variant="outline">{assessment.profile}</Badge>
                      {/if}
                    </div>
                  </div>

                  <p>{assessment.description}</p>

                  {#if assessment.expectations.length || assessment.evidence.length}
                    <div class="assessment-evidence-grid">
                      {#if assessment.expectations.length}
                        <section class="assessment-evidence">
                          <strong>{m.conformance_expected()}</strong>
                          <ul>
                            {#each assessment.expectations as expectation}
                              <li>{expectation}</li>
                            {/each}
                          </ul>
                        </section>
                      {/if}

                      {#if assessment.evidence.length}
                        <section class="assessment-evidence">
                          <strong>{m.conformance_observed()}</strong>
                          <ul>
                            {#each assessment.evidence as evidence}
                              <li>{evidence}</li>
                            {/each}
                          </ul>
                        </section>
                      {/if}
                    </div>
                  {/if}

                  {#if assessment.reason}
                    <Alert.Root role="note" data-kind={assessment.kind}>
                      <Alert.Title
                        >{assessment.kind === "unresolved"
                          ? m.conformance_not_evaluated()
                          : m.conformance_inconclusive()}</Alert.Title
                      >
                      <Alert.Description>{assessment.reason}</Alert.Description>
                    </Alert.Root>
                  {/if}

                  {#if assessment.references.length}
                    <div class="assessment-references">
                      {#each assessment.references as reference (reference.id)}
                        <span class="assessment-reference">
                          <a
                            href={reference.url}
                            target="_blank"
                            rel="noreferrer"
                            onclick={(event) => openExternalLink(event, reference.url)}
                          >
                            {m.conformance_reference({
                              specification: reference.specification,
                              section: reference.section,
                              clause: reference.clause,
                            })}
                          </a>
                          <Badge variant="outline">{reference.level}</Badge>
                        </span>
                      {/each}
                    </div>
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </Card.Content>
    </Collapsible.Content>
  </Card.Root>
</Collapsible.Root>

<style>
  @layer blocks {
    :global(.conformance),
    :global(.conformance-content) {
      min-width: 0;
    }

    :global(.conformance-header) {
      align-items: center;
    }

    .conformance-heading,
    :global(.conformance-actions),
    .assessment-heading,
    .assessment-badges,
    .assessment-references,
    .assessment-reference {
      display: flex;
      align-items: center;
    }

    .conformance-heading {
      gap: var(--space-3);
      min-width: 0;
    }

    .conformance-icon,
    .assessment-icon {
      display: grid;
      flex: 0 0 auto;
      place-items: center;
      border: 1px solid var(--border);
      background: var(--muted);
      color: var(--muted-foreground);
    }

    .conformance-icon {
      width: 2.25rem;
      height: 2.25rem;
    }

    .conformance-copy,
    .assessment-list,
    .assessment-title,
    .assessment-details,
    .assessment-evidence,
    .conformance-summary > div {
      display: grid;
    }

    .conformance-copy {
      gap: var(--space-1);
      min-width: 0;
    }

    :global(.conformance-actions) {
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-2);
    }

    :global(.conformance-toggle svg) {
      transition: transform 160ms ease;
    }

    .conformance-summary {
      display: grid;
      grid-template-columns: minmax(9rem, 0.8fr) minmax(18rem, 1.4fr) minmax(10rem, 1fr);
      gap: var(--space-6);
      margin: 0;
    }

    .conformance-summary > div {
      gap: var(--space-1);
    }

    .conformance-summary dt {
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .conformance-summary dd {
      margin: 0;
      font-weight: 700;
    }

    :global(.conformance-details-content) {
      padding-block-start: var(--space-4);
    }

    .assessment-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: var(--space-3);
      align-items: start;
      min-width: 0;
      padding-block: var(--space-3);
    }

    .assessment-row:first-child {
      padding-block-start: 0;
    }

    .assessment-row:last-child {
      padding-block-end: 0;
    }

    .assessment-icon {
      width: 1.75rem;
      height: 1.75rem;
    }

    .assessment-details {
      gap: var(--space-3);
      min-width: 0;
    }

    .assessment-heading {
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .assessment-title {
      gap: var(--space-1);
      min-width: 0;
    }

    .assessment-title code {
      color: var(--muted-foreground);
      font-size: 0.7rem;
    }

    .assessment-badges,
    .assessment-references,
    .assessment-reference {
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .assessment-details p,
    .assessment-evidence ul {
      margin: 0;
    }

    .assessment-details p {
      color: var(--muted-foreground);
    }

    .assessment-evidence-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      gap: var(--space-4);
    }

    .assessment-evidence {
      gap: var(--space-1);
    }

    .assessment-evidence ul {
      padding-inline-start: 1.2rem;
    }

    .assessment-references a {
      color: var(--primary);
      text-decoration: underline;
      text-underline-offset: 0.15em;
    }

    code {
      overflow-wrap: anywhere;
    }

    @container workspace (max-width: 45rem) {
      .conformance-summary {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-3);
      }
    }
  }

  @layer exceptions {
    .conformance-summary[data-target="unresolved"] {
      grid-template-columns: minmax(0, 1fr);
    }

    :global(.conformance-toggle[data-state="open"] svg) {
      transform: rotate(180deg);
    }
  }
</style>
