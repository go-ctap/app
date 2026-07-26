<script lang="ts" generics="TFilter extends string">
  import { FilterX } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";

  import { m } from "../../../paraglide/messages.js";

  type FilterOption<T extends string> = {
    value: T;
    label: string;
  };

  type Props = {
    id: string;
    query: string;
    statusFilter: TFilter;
    filters: FilterOption<TFilter>[];
    searchPlaceholder: string;
    loading?: boolean;
    onQueryChange: (query: string) => void;
    onFilterChange: (filter: TFilter) => void;
  };

  let {
    id,
    query,
    statusFilter,
    filters,
    searchPlaceholder,
    loading = false,
    onQueryChange,
    onFilterChange,
  }: Props = $props();

  let currentFilterLabel = $derived(
    filters.find((filter) => filter.value === statusFilter)?.label ?? filters[0]?.label ?? m.status(),
  );
  let filtersActive = $derived(Boolean(query.trim()) || statusFilter !== "all");

  function handleFilterChange(value: string | string[]) {
    if (Array.isArray(value)) return;
    const selected = filters.find((filter) => filter.value === value);
    if (selected) onFilterChange(selected.value);
  }

  function clearFilters() {
    onQueryChange("");
    const all = filters.find((filter) => filter.value === "all");
    if (all) onFilterChange(all.value);
  }
</script>

{#if loading}
  <div class="credential-inventory-toolbar" data-loading aria-hidden="true">
    <Skeleton data-slot="toolbar-search-skeleton" />
    <Skeleton data-slot="toolbar-filter-skeleton" />
    <Skeleton data-slot="toolbar-action-skeleton" />
  </div>
{:else}
  <div class="credential-inventory-toolbar">
    <Field.Field>
      <Field.FieldLabel class="sr-only" for={id}>{searchPlaceholder}</Field.FieldLabel>
      <Input
        {id}
        type="search"
        value={query}
        placeholder={searchPlaceholder}
        autocomplete="off"
        oninput={(event) => onQueryChange(event.currentTarget.value)}
      />
    </Field.Field>

    <Field.Field>
      <Field.FieldLabel class="sr-only" for={`${id}-status-filter`}>{m.status()}</Field.FieldLabel>
      <Select.Root
        type="single"
        value={statusFilter}
        onValueChange={handleFilterChange}
        items={filters}
      >
        <Select.Trigger id={`${id}-status-filter`} aria-label={m.status()}>
          {currentFilterLabel}
        </Select.Trigger>
        <Select.Content side="bottom" align="end" sideOffset={6}>
          <Select.Group>
            {#each filters as filter (filter.value)}
              <Select.Item value={filter.value} label={filter.label}>{filter.label}</Select.Item>
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </Field.Field>

    <Button variant="outline" type="button" disabled={!filtersActive} onclick={clearFilters}>
      <FilterX data-icon="inline-start" aria-hidden="true" />
      {m.clear_filters()}
    </Button>
  </div>
{/if}

<style>
@layer blocks {
  .credential-inventory-toolbar {
    display: grid;
    grid-template-columns: minmax(12rem, 1fr) minmax(10rem, auto) auto;
    gap: var(--space-2);
    align-items: end;
    min-width: 0;
  }

  :global(.credential-inventory-toolbar [data-slot="field"]) {
    min-width: 0;
  }

  :global(.credential-inventory-toolbar [data-slot="select-trigger"]) {
    min-width: 10rem;
  }

  :global(.credential-inventory-toolbar[data-loading] [data-slot="skeleton"]) {
    height: 2.25rem;
  }

  :global(.credential-inventory-toolbar [data-slot="toolbar-search-skeleton"]) {
    width: 100%;
  }

  :global(.credential-inventory-toolbar [data-slot="toolbar-filter-skeleton"]) {
    width: 10rem;
  }

  :global(.credential-inventory-toolbar [data-slot="toolbar-action-skeleton"]) {
    width: 8rem;
  }

  @container workspace (max-width: 43rem) {
    .credential-inventory-toolbar {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    :global(.credential-inventory-toolbar [data-slot="field"]:first-child),
    :global(.credential-inventory-toolbar [data-slot="toolbar-search-skeleton"]) {
      grid-column: 1 / -1;
    }
  }

  @container workspace (max-width: 31rem) {
    .credential-inventory-toolbar {
      grid-template-columns: minmax(0, 1fr);
    }

    :global(.credential-inventory-toolbar [data-slot="field"]),
    :global(.credential-inventory-toolbar [data-slot="select-trigger"]),
    :global(.credential-inventory-toolbar [data-slot="skeleton"]) {
      width: 100%;
    }
  }
}
</style>
