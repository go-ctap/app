<script lang="ts">
  import { CircleQuestionMark } from "@lucide/svelte";

  import { Button } from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
  import * as Tooltip from "$lib/components/ui/tooltip";

  type Props = {
    label: string;
    id?: string;
    forId?: string;
    helpText?: string;
    helpLabel?: string;
  };

  let { label, id, forId, helpText, helpLabel }: Props = $props();
</script>

<div class="lab-field-label">
  <Field.Label {id} for={forId}>{label}</Field.Label>
  {#if helpText}
    <Tooltip.Provider delayDuration={350}>
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon-xs"
              type="button"
              aria-label={helpLabel ?? helpText}
            >
              <CircleQuestionMark data-icon="inline-start" aria-hidden="true" />
            </Button>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content side="top" sideOffset={6}>{helpText}</Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  {/if}
</div>

<style>
  @layer blocks {
    .lab-field-label {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      min-width: 0;
    }
  }
</style>
