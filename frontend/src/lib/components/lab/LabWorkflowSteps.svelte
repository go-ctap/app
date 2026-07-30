<script lang="ts">
  import { CircleAlert } from "@lucide/svelte";

  import type { LabGetStep, LabMakeStep } from "$lib/features/lab/state";

  import { m } from "../../../paraglide/messages.js";

  type Props = {
    step: LabMakeStep | LabGetStep;
    orientation?: "horizontal" | "vertical";
  };

  let { step, orientation = "horizontal" }: Props = $props();

  let currentIndex = $derived.by(() => {
    if (step.phase === "success") return 2;

    if (step.phase === "review" || step.phase === "executing") return 1;

    if (step.phase === "error" && step.failedPhase === "executing") return 1;

    return 0;
  });

  const labels = [m.lab_configure, m.lab_review, m.lab_result];
</script>

<ol class="lab-workflow-steps" data-orientation={orientation} aria-label={m.lab_scenario_status()}>
  {#each labels as label, index (index)}
    <li
      data-current={index === currentIndex}
      data-error={step.phase === "error" && index === currentIndex}
      aria-current={index === currentIndex ? "step" : undefined}
    >
      <span class="lab-workflow-marker" aria-hidden="true">
        {#if step.phase === "error" && index === currentIndex}
          <CircleAlert />
        {:else}
          {index + 1}
        {/if}
      </span>
      <span>{label()}</span>
    </li>
  {/each}
</ol>

<style>
  @layer blocks {
    .lab-workflow-steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1px;
      min-width: 0;
      margin: 0;
      padding: 0;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--border);
      list-style: none;
    }

    .lab-workflow-steps li {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
      padding: var(--space-2) var(--space-3);
      background: var(--card);
      color: var(--muted-foreground);
      font-size: 0.72rem;
    }

    .lab-workflow-marker {
      display: grid;
      flex: 0 0 auto;
      place-items: center;
      width: 1.2rem;
      height: 1.2rem;
      border: 1px solid currentColor;
      border-radius: 999px;
      font-size: 0.66rem;
    }

    .lab-workflow-marker :global(svg) {
      width: 0.75rem;
      height: 0.75rem;
    }

    .lab-workflow-steps[data-orientation="vertical"] {
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
      overflow: visible;
      border: 0;
      background: transparent;
    }

    .lab-workflow-steps[data-orientation="vertical"] li {
      padding-inline: 0;
      border-top: 1px solid var(--border);
    }

    .lab-workflow-steps[data-orientation="vertical"] li:last-child {
      border-bottom: 1px solid var(--border);
    }
  }

  @layer exceptions {
    .lab-workflow-steps li[data-current="true"] {
      color: var(--foreground);
      font-weight: 600;
    }

    .lab-workflow-steps li[data-error="true"] {
      color: var(--destructive);
    }
  }
</style>
