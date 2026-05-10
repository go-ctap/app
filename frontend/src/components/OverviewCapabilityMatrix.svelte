<script module lang="ts">
  import { Award, Boxes, Cpu, Database, FingerprintPattern, IdCard, Info, ListChecks, Puzzle, ShieldCheck, SlidersHorizontal } from "@lucide/svelte";

  const GROUP_ICONS: Record<string, typeof ShieldCheck> = {
    Identity: IdCard,
    Protocol: Cpu,
    Verification: FingerprintPattern,
    Storage: Database,
    Management: ListChecks,
    Policy: SlidersHorizontal,
    Extensions: Puzzle,
    Limits: Boxes,
    Attestation: Award,
  };
</script>

<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { overviewStatusLabel, type OverviewGroup } from "$lib/overview-rules";
  import StatusBadge from "../components/StatusBadge.svelte";
  import { m } from "../paraglide/messages.js";

  export let groups: OverviewGroup[] = [];
  export let warningCount = 0;
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{m.capability_matrix()}</Card.Title>
    <Card.Description>{m.capability_matrix_description()}</Card.Description>
    <Card.Action>
      {#if warningCount}
        <Badge variant="secondary">{m.warnings_count({ count: warningCount })}</Badge>
      {/if}
    </Card.Action>
  </Card.Header>
  <Card.Content>
    <div class="rounded-md border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="min-w-45">{m.name()}</Table.Head>
            <Table.Head class="min-w-65">{m.description()}</Table.Head>
            <Table.Head class="w-40 text-right">{m.status()}</Table.Head>
            <Table.Head class="min-w-45">{m.value()}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each groups as group (group.name)}
            {@const GroupIcon = GROUP_ICONS[group.rows[0]?.group] || Info}
            <Table.Row class="bg-muted/50">
              <Table.Cell colspan={4} class="py-2">
                <span class="flex items-center gap-2">
                  <GroupIcon class="text-muted-foreground" />
                  <span>{group.name}</span>
                </span>
              </Table.Cell>
            </Table.Row>
            {#each group.rows as row (`${row.group}:${row.name}`)}
              <Table.Row class={row.status === "unsupported" ? "text-muted-foreground" : ""}>
                <Table.Cell class="whitespace-normal align-top">
                  <div class="grid gap-1">
                    <span class="font-medium">{row.name}</span>
                    {#if row.source}
                      <span class="hidden break-all text-xs text-muted-foreground md:inline">{row.source}</span>
                    {/if}
                  </div>
                </Table.Cell>
                <Table.Cell class="whitespace-normal align-top text-muted-foreground">{row.description}</Table.Cell>
                <Table.Cell class="whitespace-normal align-top text-right">
                  <StatusBadge
                    value={row.status}
                    label={overviewStatusLabel(row.status)}
                    help={row.source || row.name}
                    tone={row.status === "unsupported" ? "neutral" : "auto"}
                  />
                </Table.Cell>
                <Table.Cell class="whitespace-normal align-top">
                  <span class="wrap-break-word font-medium">{row.value || m.not_reported()}</span>
                </Table.Cell>
              </Table.Row>
            {/each}
          {:else}
            <Table.Row>
              <Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">{m.no_getinfo_fields_reported()}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </Card.Content>
</Card.Root>
