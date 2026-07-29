<script lang="ts">
  import type { Snippet } from "svelte";
  import { Sparkles } from "@lucide/svelte";

  import type { DeviceReport } from "../../../../bindings/github.com/go-ctap/kit/model/report";

  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import type { LabGetStep, LabMakeStep } from "$lib/features/lab/state";
  import { deviceName } from "$lib/format";

  import { m } from "../../../paraglide/messages.js";

  import LabWorkflowSteps from "./LabWorkflowSteps.svelte";

  type Props = {
    id: string;
    operationLabel: string;
    device: DeviceReport;
    step: LabMakeStep | LabGetStep;
    errorCount: number;
    warningCount: number;
    extensionCount: number;
    fillDemoDisabled?: boolean;
    actions: Snippet;
    onFillDemoValues: () => void;
  };

  let {
    id,
    operationLabel,
    device,
    step,
    errorCount,
    warningCount,
    extensionCount,
    fillDemoDisabled = false,
    actions,
    onFillDemoValues,
  }: Props = $props();

  let phase = $derived(step.phase);
  let ready = $derived(errorCount === 0);

  function phaseLabel() {
    if (phase === "previewing") return m.lab_phase_previewing();
    if (phase === "review") return m.lab_phase_review();
    if (phase === "executing") return m.lab_phase_executing();
    if (phase === "success") return m.lab_phase_success();
    if (phase === "error") return m.lab_phase_error();
    return m.lab_phase_editing();
  }
</script>

<aside class="lab-command-rail" aria-labelledby={`${id}-title`}>
  <Card.Root class="lab-command-center" data-phase={phase}>
    <Card.Header>
      <Card.Title><h3 id={`${id}-title`}>{m.lab_command_current_run()}</h3></Card.Title>
      <Card.Description>
        <span>{operationLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{deviceName(device)}</span>
      </Card.Description>
      <Card.Action>
        <Badge variant={phase === "error" ? "destructive" : "outline"}>{phaseLabel()}</Badge>
      </Card.Action>
    </Card.Header>

    <Card.Content class="lab-command-content">
      <LabWorkflowSteps {step} orientation="vertical" />
      <Separator />

      <section class="lab-command-readiness" aria-labelledby={`${id}-readiness-title`}>
        <header>
          <h4 id={`${id}-readiness-title`}>{m.lab_command_readiness()}</h4>
          <Badge variant={ready ? "secondary" : "destructive"}>
            {ready ? m.lab_command_ready() : m.lab_command_needs_attention()}
          </Badge>
        </header>

        <dl>
          <div>
            <dt>{m.lab_validation_errors()}</dt>
            <dd>{errorCount}</dd>
          </div>
          <div>
            <dt>{m.lab_validation_warnings()}</dt>
            <dd>{warningCount}</dd>
          </div>
          <div>
            <dt>{m.lab_enabled_extensions()}</dt>
            <dd>{extensionCount}</dd>
          </div>
        </dl>
      </section>
    </Card.Content>

    <Card.Footer class="lab-command-actions">
      {@render actions()}
      <Button
        class="lab-command-action"
        variant="outline"
        type="button"
        disabled={fillDemoDisabled}
        onclick={onFillDemoValues}
      >
        <Sparkles data-icon="inline-start" aria-hidden="true" />
        {m.lab_fill_demo_values()}
      </Button>
    </Card.Footer>
  </Card.Root>
</aside>

<style>
@layer blocks {
  .lab-command-rail {
    position: sticky;
    top: var(--space-4);
    min-width: 0;
  }

  :global(.lab-command-center) {
    min-width: 0;
  }

  :global(.lab-command-center [data-slot="card-title"] h3) {
    margin: 0;
    font: inherit;
  }

  :global(.lab-command-center [data-slot="card-description"]) {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    min-width: 0;
  }

  :global(.lab-command-content),
  .lab-command-readiness,
  .lab-command-readiness header,
  .lab-command-readiness dl,
  .lab-command-readiness dl > div {
    min-width: 0;
  }

  :global(.lab-command-content),
  .lab-command-readiness,
  .lab-command-readiness dl {
    display: grid;
  }

  :global(.lab-command-content),
  .lab-command-readiness {
    gap: var(--space-3);
  }

  .lab-command-readiness header,
  .lab-command-readiness dl > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .lab-command-readiness h4 {
    margin: 0;
    font-size: 0.78rem;
  }

  .lab-command-readiness dl {
    gap: 0;
    margin: 0;
  }

  .lab-command-readiness dl > div {
    padding-block: var(--space-2);
    border-top: 1px solid var(--border);
  }

  .lab-command-readiness dt {
    color: var(--muted-foreground);
    font-size: 0.72rem;
  }

  .lab-command-readiness dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  :global(.lab-command-actions) {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
  }

  :global(.lab-command-action) {
    width: 100%;
  }

  @container workspace (max-width: 58rem) {
    .lab-command-rail {
      position: static;
    }
  }
}
</style>
