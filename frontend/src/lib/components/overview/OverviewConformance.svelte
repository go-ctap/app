<script lang="ts">
  import { untrack } from "svelte";
  import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Collapsible from "$lib/components/ui/collapsible/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import type { OverviewConformancePresentation } from "$lib/overview-rules";

  import { m } from "../../../paraglide/messages.js";

  let { presentation }: { presentation: OverviewConformancePresentation } = $props();
  let open = $state(untrack(() => presentation.status !== "passed"));
  let statusVariant: BadgeVariant = $derived(
    presentation.status === "findings"
      ? "destructive"
      : presentation.status === "inconclusive"
        ? "secondary"
        : presentation.status === "unresolved"
          ? "outline"
          : "default",
  );
  let statusLabel = $derived.by(() => {
    if (presentation.status === "findings") return m.conformance_findings_count({ count: presentation.findingCount });
    if (presentation.status === "inconclusive") return m.conformance_inconclusive_count({ count: presentation.inconclusiveCount });
    if (presentation.status === "unresolved") return m.conformance_not_evaluated();
    return m.conformance_passed();
  });
  let toggleLabel = $derived(open ? m.conformance_collapse_details() : m.conformance_expand_details());
</script>

<Collapsible.Root bind:open class="conformance">
  <Card.Root data-status={presentation.status}>
    <Card.Header>
      <Card.Title role="heading" aria-level="2">{m.conformance_warnings()}</Card.Title>
      <Card.Description>
        {m.conformance_warnings_description()}
        {#if presentation.target}
          <span class="conformance-target">
            <code>{presentation.target.profile}</code>
            <span aria-hidden="true">·</span>
            <code>{presentation.target.specification}</code>
          </span>
        {/if}
      </Card.Description>
      <Card.Action class="conformance-actions">
        <Badge variant={statusVariant} data-status={presentation.status}>{statusLabel}</Badge>
        {#if presentation.status === "findings" && presentation.inconclusiveCount > 0}
          <Badge variant="secondary">{m.conformance_inconclusive_count({ count: presentation.inconclusiveCount })}</Badge>
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

    <Collapsible.Content class="conformance-content">
      <Card.Content>
        {#if presentation.status === "passed"}
          <Alert.Root role="status">
            <CircleCheckIcon aria-hidden="true" />
            <Alert.Title>{m.conformance_passed_title()}</Alert.Title>
            <Alert.Description>{m.conformance_passed_description()}</Alert.Description>
          </Alert.Root>
        {:else}
          <div class="table-frame">
            <Table.Root class="assessments-table">
              <Table.Header class="assessments-table-header">
                <Table.Row>
                  <Table.Head>{m.conformance_assessment()}</Table.Head>
                  <Table.Head>{m.source()}</Table.Head>
                  <Table.Head>{m.description()}</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each presentation.assessments as assessment, index (`${assessment.id}:${assessment.source}:${index}`)}
                  <Table.Row data-kind={assessment.kind}>
                    <Table.Cell>
                      <div class="assessment-heading">
                        <strong>{assessment.name}</strong>
                        <div class="assessment-badges">
                          <Badge variant={assessment.kind === "finding" ? "destructive" : "secondary"}>
                            {assessment.kind === "finding" ? m.finding() : assessment.kind === "inconclusive" ? m.conformance_inconclusive() : m.conformance_not_evaluated()}
                          </Badge>
                          {#if assessment.profile}
                            <Badge variant="outline">{assessment.profile}</Badge>
                          {/if}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell><code>{assessment.source}</code></Table.Cell>
                    <Table.Cell class="text-cell">
                      <div class="assessment-details">
                        <p>{assessment.description}</p>

                        {#if assessment.expectations.length}
                          <div class="assessment-evidence">
                            <strong>{m.conformance_expected()}</strong>
                            <ul>
                              {#each assessment.expectations as expectation}
                                <li>{expectation}</li>
                              {/each}
                            </ul>
                          </div>
                        {/if}

                        {#if assessment.evidence.length}
                          <div class="assessment-evidence">
                            <strong>{m.conformance_observed()}</strong>
                            <ul>
                              {#each assessment.evidence as evidence}
                                <li>{evidence}</li>
                              {/each}
                            </ul>
                          </div>
                        {/if}

                        {#if assessment.reason}
                          <Alert.Root role="note" data-kind={assessment.kind}>
                            <Alert.Title>{assessment.kind === "unresolved" ? m.conformance_not_evaluated() : m.conformance_inconclusive()}</Alert.Title>
                            <Alert.Description>{assessment.reason}</Alert.Description>
                          </Alert.Root>
                        {/if}

                        {#if assessment.references.length}
                          <div class="assessment-references">
                            {#each assessment.references as reference (reference.id)}
                              <span class="assessment-reference">
                                <a href={reference.url} target="_blank" rel="noreferrer">
                                  {m.conformance_reference({ specification: reference.specification, section: reference.section, clause: reference.clause })}
                                </a>
                                <Badge variant="outline">{reference.level}</Badge>
                              </span>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        {/if}
      </Card.Content>
    </Collapsible.Content>
  </Card.Root>
</Collapsible.Root>

<style>
@layer blocks {
  :global(.conformance) {
    min-width: 0;
  }

  :global(.conformance-actions) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .conformance-target {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
    margin-top: var(--space-1);
    font-family: var(--font-mono);
  }

  :global(.conformance-toggle svg) {
    transition: transform 160ms ease;
  }

  :global(.conformance-content) {
    min-width: 0;
  }

  .table-frame {
    min-width: 0;
    overflow: auto;
    border: 1px solid var(--border);
  }

  :global(.assessments-table) {
    min-width: 72rem;
  }

  :global(.assessments-table-header tr) {
    background: color-mix(in srgb, var(--muted) 40%, transparent);
  }

  :global(.text-cell) {
    white-space: normal;
  }

  .assessment-heading,
  .assessment-details,
  .assessment-evidence {
    display: grid;
    gap: 0.5rem;
  }

  .assessment-badges,
  .assessment-references,
  .assessment-reference {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }

  .assessment-details p,
  .assessment-evidence ul {
    margin: 0;
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
}

@layer exceptions {
  :global(.conformance-toggle[data-state="open"] svg) {
    transform: rotate(180deg);
  }
}
</style>
