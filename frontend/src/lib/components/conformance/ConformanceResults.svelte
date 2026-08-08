<script lang="ts">
  import { CircleAlert, CircleCheck, CircleMinus, TriangleAlert } from "@lucide/svelte";

  import {
    Status,
    type RequirementRef,
    type SuiteResult,
  } from "../../../../bindings/github.com/telesma-app/kit/conformance";

  import EmptyState from "$lib/components/shared/EmptyState.svelte";
  import * as Accordion from "$lib/components/ui/accordion";
  import * as Alert from "$lib/components/ui/alert";
  import { Badge, type BadgeVariant } from "$lib/components/ui/badge";
  import * as Card from "$lib/components/ui/card";
  import { openExternalLink } from "$lib/external-links";

  import { m } from "../../../paraglide/messages.js";

  let {
    result,
    errorMessage = "",
  }: {
    result: SuiteResult | null;
    errorMessage?: string;
  } = $props();

  function statusLabel(status: Status) {
    switch (status) {
      case Status.StatusPassed:
        return m.conformance_status_passed();
      case Status.StatusFailed:
        return m.conformance_status_failed();
      case Status.StatusSkipped:
        return m.conformance_status_skipped();
      case Status.StatusError:
        return m.conformance_status_error();
      default:
        return m.conformance_not_evaluated();
    }
  }

  function statusVariant(status: Status): BadgeVariant {
    switch (status) {
      case Status.StatusPassed:
        return "default";
      case Status.StatusFailed:
      case Status.StatusError:
        return "destructive";
      case Status.StatusSkipped:
        return "outline";
      default:
        return "secondary";
    }
  }

  function resultSummary(value: SuiteResult) {
    const counts = value.tests.reduce(
      (current, test) => {
        current[test.status] = (current[test.status] ?? 0) + 1;

        return current;
      },
      {} as Partial<Record<Status, number>>,
    );

    return m.conformance_result_summary({
      passed: counts[Status.StatusPassed] ?? 0,
      failed: counts[Status.StatusFailed] ?? 0,
      skipped: counts[Status.StatusSkipped] ?? 0,
      errors: counts[Status.StatusError] ?? 0,
    });
  }

  function referenceLabel(reference: RequirementRef) {
    return m.conformance_reference({
      specification: reference.specification,
      section: reference.section,
      clause: reference.clause,
    });
  }
</script>

{#if !result}
  <EmptyState
    title={errorMessage ? m.conformance_run_error() : m.conformance_not_run_title()}
    message={errorMessage || m.conformance_not_run_description()}
    variant="compact"
  >
    {#snippet icon()}
      {#if errorMessage}<TriangleAlert aria-hidden="true" />{:else}<CircleMinus
          aria-hidden="true"
        />{/if}
    {/snippet}
  </EmptyState>
{:else}
  <Card.Root class="conformance-results" data-status={result.status}>
    <Card.Header>
      <Card.Title>{m.conformance_results_title()}</Card.Title>
      <Card.Description>{resultSummary(result)}</Card.Description>
      <Card.Action>
        <Badge variant={statusVariant(result.status)}>{statusLabel(result.status)}</Badge>
      </Card.Action>
    </Card.Header>

    <Card.Content class="conformance-results-content">
      <dl class="conformance-source">
        <div>
          <dt>{m.conformance_source_artifact()}</dt>
          <dd><code>{result.source.artifact}</code></dd>
        </div>
        <div>
          <dt>{m.conformance_source_version()}</dt>
          <dd><code>{result.source.version}</code></dd>
        </div>
        {#if result.source.digest}
          <div>
            <dt>{m.conformance_source_digest()}</dt>
            <dd><code>{result.source.digest}</code></dd>
          </div>
        {/if}
      </dl>

      {#if result.error}
        <Alert.Root variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <Alert.Title>{m.conformance_run_error()}</Alert.Title>
          <Alert.Description>{result.error}</Alert.Description>
        </Alert.Root>
      {/if}

      <Accordion.Root type="multiple" class="conformance-tests">
        {#each result.tests as test (test.id)}
          <Accordion.Item value={test.id} data-status={test.status}>
            <Accordion.Trigger>
              <span class="conformance-test-trigger">
                <span class="conformance-status-icon" data-status={test.status} aria-hidden="true">
                  {#if test.status === Status.StatusPassed}
                    <CircleCheck />
                  {:else if test.status === Status.StatusSkipped}
                    <CircleMinus />
                  {:else}
                    <CircleAlert />
                  {/if}
                </span>
                <span class="conformance-test-copy">
                  <strong>{test.name}</strong>
                  <code>{test.source.case} · {test.id}</code>
                </span>
                <Badge variant={statusVariant(test.status)}>{statusLabel(test.status)}</Badge>
              </span>
            </Accordion.Trigger>

            <Accordion.Content>
              <div class="conformance-test-details">
                {#if test.description}<p>{test.description}</p>{/if}

                <dl class="conformance-test-source">
                  <div>
                    <dt>{m.conformance_source_artifact()}</dt>
                    <dd><code>{test.source.path}</code></dd>
                  </div>
                </dl>

                <ol class="conformance-step-list" aria-label={m.conformance_steps()}>
                  {#each test.steps as step (step.id)}
                    <li data-status={step.status}>
                      <span
                        class="conformance-status-icon"
                        data-status={step.status}
                        aria-hidden="true"
                      >
                        {#if step.status === Status.StatusPassed}
                          <CircleCheck />
                        {:else if step.status === Status.StatusSkipped}
                          <CircleMinus />
                        {:else}
                          <CircleAlert />
                        {/if}
                      </span>
                      <span class="conformance-step-copy">
                        <strong>{step.name}</strong>
                        <code>{step.id}</code>
                        {#if step.message}<span>{step.message}</span>{/if}
                      </span>
                      <Badge variant={statusVariant(step.status)}>{statusLabel(step.status)}</Badge>
                    </li>
                  {/each}
                </ol>

                {#if test.references.length}
                  <ul class="conformance-reference-list">
                    {#each test.references as reference (reference.id)}
                      <li>
                        <a
                          href={reference.url}
                          onclick={(event) => openExternalLink(event, reference.url)}
                        >
                          {referenceLabel(reference)}
                        </a>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        {/each}
      </Accordion.Root>
    </Card.Content>
  </Card.Root>
{/if}

<style>
  @layer blocks {
    :global(.conformance-results),
    :global(.conformance-results-content),
    :global(.conformance-tests) {
      min-width: 0;
    }

    :global(.conformance-results-content),
    .conformance-test-details {
      display: grid;
      gap: var(--space-4);
    }

    .conformance-source,
    .conformance-test-source {
      display: grid;
      gap: var(--space-2);
      margin: 0;
    }

    .conformance-source {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .conformance-source div,
    .conformance-test-source div {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }

    .conformance-source dt,
    .conformance-test-source dt {
      color: var(--muted-foreground);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .conformance-source dd,
    .conformance-test-source dd {
      min-width: 0;
      margin: 0;
    }

    .conformance-source code,
    .conformance-test-source code,
    .conformance-test-copy code,
    .conformance-step-copy code {
      overflow-wrap: anywhere;
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .conformance-test-trigger {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: var(--space-3);
      align-items: center;
      width: 100%;
      min-width: 0;
      padding-inline-end: var(--space-2);
    }

    .conformance-test-copy,
    .conformance-step-copy {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
      text-align: left;
    }

    .conformance-test-details > p {
      margin: 0;
      color: var(--muted-foreground);
      font-size: 0.8rem;
      line-height: 1.5;
    }

    .conformance-step-list,
    .conformance-reference-list {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .conformance-step-list li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: var(--space-3);
      align-items: start;
      min-width: 0;
      border: 1px solid var(--border);
      padding: var(--space-3);
    }

    .conformance-step-copy > span {
      color: var(--muted-foreground);
      font-size: 0.78rem;
      line-height: 1.45;
    }

    .conformance-status-icon {
      display: grid;
      place-items: center;
      width: 1.25rem;
      aspect-ratio: 1;
      color: var(--muted-foreground);
    }

    .conformance-status-icon :global(svg) {
      width: 1rem;
      height: 1rem;
    }

    .conformance-reference-list a {
      color: var(--primary);
      font-size: 0.75rem;
      text-decoration: none;
    }

    .conformance-reference-list a:hover {
      text-decoration: underline;
    }
  }

  @layer exceptions {
    .conformance-source:has(div:nth-child(3)) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .conformance-status-icon[data-status="passed"] {
      color: var(--primary);
    }

    .conformance-status-icon[data-status="failed"],
    .conformance-status-icon[data-status="error"] {
      color: var(--destructive);
    }
  }
</style>
