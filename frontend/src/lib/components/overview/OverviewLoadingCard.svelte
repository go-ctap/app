<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import * as Table from "$lib/components/ui/table";

  import { m } from "../../../paraglide/messages.js";

  let { advanced }: { advanced: boolean } = $props();
</script>

<div
  class="overview-loading"
  data-mode={advanced ? "advanced" : "standard"}
  aria-busy="true"
  aria-label={m.inspection_in_progress()}
>
  <span class="sr-only">{m.reading_authenticator_metadata()}</span>

  <div class="overview-loading-summary">
    <Card.Root class="overview-loading-hero">
      <Card.Header class="overview-loading-hero-header">
        <div class="overview-loading-identity">
          <Skeleton class="overview-loading-icon" />
          <div class="overview-loading-copy">
            <Skeleton class="overview-loading-title" />
            <div class="overview-loading-meta">
              <Skeleton class="overview-loading-badge" />
              <Skeleton class="overview-loading-badge" />
              <Skeleton class="overview-loading-subtitle" />
            </div>
          </div>
        </div>
        {#if advanced}<Skeleton class="overview-loading-button" />{/if}
      </Card.Header>

      <Card.Content class="overview-loading-hero-content">
        <div class="overview-loading-description">
          <Skeleton class="overview-loading-eyebrow" />
          <Skeleton class="overview-loading-heading" />
          <Skeleton class="overview-loading-line" />
          <Skeleton class="overview-loading-line-short" />
        </div>

        <div class="overview-loading-signals">
          {#each Array(advanced ? 3 : 4) as _, index (index)}
            <div class="overview-loading-signal">
              <Skeleton class="overview-loading-signal-title" />
              <Skeleton class="overview-loading-line" />
              <Skeleton class="overview-loading-line-short" />
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    {#if advanced}
      <Card.Root class="overview-loading-mds">
        <Card.Header>
          <Skeleton class="overview-loading-heading" />
          <Skeleton class="overview-loading-line" />
          <Card.Action><Skeleton class="overview-loading-button" /></Card.Action>
        </Card.Header>

        <Card.Content class="overview-loading-mds-content">
          {#each Array(3) as _, section (section)}
            <div class="overview-loading-facts">
              <Skeleton class="overview-loading-eyebrow" />
              <Skeleton class="overview-loading-line" />
              <Skeleton class="overview-loading-line-short" />
            </div>
          {/each}
        </Card.Content>
      </Card.Root>
    {/if}
  </div>

  {#if advanced}
    <Card.Root>
      <Card.Header>
        <Skeleton class="overview-loading-heading" />
        <Skeleton class="overview-loading-line" />
        <Card.Action><Skeleton class="overview-loading-badge-wide" /></Card.Action>
      </Card.Header>
    </Card.Root>
  {/if}

  <Card.Root>
    <Card.Header>
      <Skeleton class="overview-loading-heading" />
      <Skeleton class="overview-loading-line" />
    </Card.Header>

    <Card.Content>
      {#if advanced}
        <div class="overview-loading-table-frame">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                {#each Array(4) as _, index (index)}
                  <Table.Head><Skeleton class="overview-loading-table-heading" /></Table.Head>
                {/each}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each Array(4) as _, row (row)}
                <Table.Row>
                  {#each Array(4) as _, cell (`${row}:${cell}`)}
                    <Table.Cell><Skeleton class="overview-loading-table-cell" /></Table.Cell>
                  {/each}
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      {:else}
        <div class="overview-loading-standard-list">
          {#each Array(8) as _, row (row)}
            <Skeleton class="overview-loading-standard-row" />
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  {#if advanced}
    <div class="overview-loading-raw">
      <div>
        <Skeleton class="overview-loading-heading" />
        <Skeleton class="overview-loading-raw-meta" />
      </div>
      <Skeleton class="overview-loading-icon-button" />
    </div>
  {/if}
</div>

<style>
  @layer blocks {
    .overview-loading {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
    }

    .overview-loading-summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
      min-width: 0;
    }

    :global(.overview-loading-hero-header) {
      gap: var(--space-4);
    }

    .overview-loading-identity {
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr);
      gap: var(--space-3);
      align-items: center;
      min-width: 0;
    }

    .overview-loading-copy,
    .overview-loading-description,
    .overview-loading-signal,
    .overview-loading-facts,
    .overview-loading-raw > div {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    .overview-loading-meta,
    .overview-loading-signals {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      min-width: 0;
    }

    :global(.overview-loading-hero-content),
    :global(.overview-loading-mds-content) {
      display: grid;
      gap: var(--space-5);
      min-width: 0;
    }

    .overview-loading-signal {
      flex: 1 1 12rem;
      border-top: 1px solid var(--border);
      padding-top: var(--space-3);
    }

    .overview-loading-facts {
      border-top: 1px solid var(--border);
      padding-top: var(--space-3);
    }

    .overview-loading-table-frame {
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .overview-loading-standard-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
      min-width: 0;
    }

    .overview-loading-raw {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-3);
      align-items: center;
      min-width: 0;
      border: 1px solid var(--border);
      background: var(--card);
      padding: var(--space-3);
    }

    :global(.overview-loading-icon) {
      width: 64px;
      height: 64px;
    }
    :global(.overview-loading-title) {
      width: min(18rem, 80%);
      height: 1.5rem;
    }
    :global(.overview-loading-heading) {
      width: min(13rem, 60%);
      height: 1rem;
    }
    :global(.overview-loading-subtitle) {
      width: min(16rem, 65%);
      height: 0.875rem;
    }
    :global(.overview-loading-eyebrow) {
      width: 6rem;
      height: 0.625rem;
    }
    :global(.overview-loading-line) {
      width: 100%;
      height: 0.75rem;
    }
    :global(.overview-loading-line-short) {
      width: 68%;
      height: 0.75rem;
    }
    :global(.overview-loading-badge) {
      width: 4.5rem;
      height: 1.25rem;
    }
    :global(.overview-loading-badge-wide) {
      width: 7rem;
      height: 1.25rem;
    }
    :global(.overview-loading-button) {
      width: 7.5rem;
      height: 2rem;
    }
    :global(.overview-loading-icon-button) {
      width: 2rem;
      height: 2rem;
    }
    :global(.overview-loading-signal-title) {
      width: 7rem;
      height: 0.875rem;
    }
    :global(.overview-loading-table-heading) {
      width: 5rem;
      height: 0.75rem;
    }
    :global(.overview-loading-table-cell) {
      width: 80%;
      height: 0.875rem;
    }
    :global(.overview-loading-standard-row) {
      width: 100%;
      height: 3.5rem;
    }
    :global(.overview-loading-raw-meta) {
      width: 9rem;
      height: 0.625rem;
    }

    @container workspace (min-width: 64rem) {
      .overview-loading[data-mode="advanced"] .overview-loading-summary {
        grid-template-columns: minmax(0, 2fr) minmax(18rem, 1fr);
      }
    }

    @container workspace (max-width: 45rem) {
      :global(.overview-loading-hero-header) {
        display: grid;
      }
    }

    @container workspace (max-width: 42rem) {
      .overview-loading-standard-list {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }
</style>
