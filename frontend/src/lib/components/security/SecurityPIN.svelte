<script lang="ts">
  import { KeyRound } from "@lucide/svelte";
  import { onDestroy, tick } from "svelte";

  import type { PINStatus } from "../../../../bindings/github.com/go-ctap/kit/model/config";

  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";

  import { m } from "../../../paraglide/messages.js";
  import { booleanState, reportedNumber, retryValue, stateLabel } from "./security-ui.js";

  type Props = {
    pin: PINStatus;
    disabled: boolean;
    onSetPIN: (input: { newPIN: string }) => boolean | Promise<boolean>;
    onChangePIN: (input: { currentPIN: string; newPIN: string }) => boolean | Promise<boolean>;
  };

  let { pin, disabled, onSetPIN, onChangePIN }: Props = $props();

  let open = $state(false);
  let triggerRef = $state<HTMLElement | null>(null);
  let currentPIN = $state("");
  let newPIN = $state("");
  let confirmation = $state("");
  let validationError = $state<"current-required" | "new-required" | "confirmation-required" | "mismatch" | null>(null);

  let configured = $derived(pin.configured === true);
  let actionDisabled = $derived(disabled || !pin.supported || !pin.protocolSupported);

  function clearSecrets() {
    currentPIN = "";
    newPIN = "";
    confirmation = "";
    validationError = null;
  }

  async function handleOpenChange(next: boolean) {
    open = next;
    if (!next) {
      clearSecrets();
      await tick();
      triggerRef?.focus();
    }
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (configured && !currentPIN) {
      validationError = "current-required";
      return;
    }
    if (!newPIN) {
      validationError = "new-required";
      return;
    }
    if (!confirmation) {
      validationError = "confirmation-required";
      return;
    }
    if (newPIN !== confirmation) {
      validationError = "mismatch";
      return;
    }

    let operation: boolean | Promise<boolean>;
    if (configured) {
      const input = { currentPIN, newPIN };
      try {
        operation = onChangePIN(input);
      } finally {
        input.currentPIN = "";
        input.newPIN = "";
        clearSecrets();
      }
    } else {
      const input = { newPIN };
      try {
        operation = onSetPIN(input);
      } finally {
        input.newPIN = "";
        clearSecrets();
      }
    }

    if (await operation) await handleOpenChange(false);
  }

  onDestroy(clearSecrets);
</script>

<Card.Root id="security-pin" aria-labelledby="security-pin-title">
  <Card.Header>
    <Card.Title><h2 id="security-pin-title" class="security-card-title">{m.pin()}</h2></Card.Title>
    <Card.Action>
      <Button bind:ref={triggerRef} type="button" disabled={actionDisabled} onclick={() => (open = true)}>
        <KeyRound data-icon="inline-start" aria-hidden="true" />
        {configured ? m.security_change_pin() : m.security_set_pin()}
      </Button>
    </Card.Action>
  </Card.Header>
  <Card.Content>
    <dl class="pin-facts">
      <div>
        <dt>{m.status()}</dt>
        <dd><Badge variant={configured ? "default" : "secondary"}>{stateLabel(pin.state)}</Badge></dd>
      </div>
      <div><dt>{m.security_pin_protocol()}</dt><dd>{pin.protocolSupported ? m.status_supported() : m.status_unsupported()}</dd></div>
      <div><dt>{m.security_pin_retries()}</dt><dd>{retryValue(pin.retries)}</dd></div>
      <div><dt>{m.security_power_cycle_required()}</dt><dd>{booleanState(pin.retries.powerCycleState)}</dd></div>
      <div><dt>{m.security_minimum_pin_length()}</dt><dd>{reportedNumber(pin.minPINLength)}</dd></div>
      <div><dt>{m.security_maximum_pin_length()}</dt><dd>{reportedNumber(pin.maxPINLength)}</dd></div>
      <div><dt>{m.security_force_pin_change()}</dt><dd>{booleanState(pin.forcePINChange)}</dd></div>
      <div><dt>{m.security_pin_complexity()}</dt><dd>{booleanState(pin.pinComplexityPolicy)}</dd></div>
    </dl>
  </Card.Content>
</Card.Root>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="security-pin-dialog">
    <Dialog.Header>
      <Dialog.Title>{configured ? m.security_change_pin() : m.security_set_pin()}</Dialog.Title>
      <Dialog.Description>{m.security_pin_description()}</Dialog.Description>
    </Dialog.Header>

    <form class="security-pin-form" onsubmit={handleSubmit}>
      <Field.FieldGroup>
        {#if configured}
          <Field.Field data-invalid={validationError === "current-required" ? "true" : undefined}>
            <Field.Label for="security-current-pin">{m.security_current_pin()}</Field.Label>
            <Input
              id="security-current-pin"
              type="password"
              autocomplete="off"
              autocapitalize="none"
              spellcheck={false}
              value={currentPIN}
              aria-invalid={validationError === "current-required"}
              oninput={(event) => (currentPIN = event.currentTarget.value)}
            />
            {#if validationError === "current-required"}
              <Field.Error>{m.security_pin_required()}</Field.Error>
            {/if}
          </Field.Field>
        {/if}

        <Field.Field data-invalid={validationError === "new-required" || validationError === "mismatch" ? "true" : undefined}>
          <Field.Label for="security-new-pin">{m.security_new_pin()}</Field.Label>
          <Input
            id="security-new-pin"
            type="password"
            autocomplete="off"
            autocapitalize="none"
            spellcheck={false}
            minlength={pin.minPINLength}
            value={newPIN}
            aria-invalid={validationError === "new-required" || validationError === "mismatch"}
            oninput={(event) => (newPIN = event.currentTarget.value)}
          />
          {#if validationError === "new-required"}
            <Field.Error>{m.security_pin_required()}</Field.Error>
          {:else if validationError === "mismatch"}
            <Field.Error>{m.security_pin_mismatch()}</Field.Error>
          {/if}
        </Field.Field>

        <Field.Field data-invalid={validationError === "confirmation-required" || validationError === "mismatch" ? "true" : undefined}>
          <Field.Label for="security-confirm-pin">{m.security_confirm_new_pin()}</Field.Label>
          <Input
            id="security-confirm-pin"
            type="password"
            autocomplete="off"
            autocapitalize="none"
            spellcheck={false}
            minlength={pin.minPINLength}
            value={confirmation}
            aria-invalid={validationError === "confirmation-required" || validationError === "mismatch"}
            oninput={(event) => (confirmation = event.currentTarget.value)}
          />
          {#if validationError === "confirmation-required"}
            <Field.Error>{m.security_pin_confirmation_required()}</Field.Error>
          {:else if validationError === "mismatch"}
            <Field.Error>{m.security_pin_mismatch()}</Field.Error>
          {/if}
        </Field.Field>
      </Field.FieldGroup>

      <Alert.Root>
        <Alert.Title>{m.security_pin_policy()}</Alert.Title>
        <Alert.Description>
          {m.security_minimum_pin_length()}: {reportedNumber(pin.minPINLength)} ·
          {m.security_maximum_pin_length()}: {reportedNumber(pin.maxPINLength)}
        </Alert.Description>
      </Alert.Root>

      <Dialog.Footer>
        <Button type="submit" disabled={actionDisabled}>{configured ? m.security_change_pin() : m.security_set_pin()}</Button>
        <Button variant="outline" type="button" onclick={() => handleOpenChange(false)}>{m.cancel()}</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<style>
@layer blocks {
  .security-card-title,
  .pin-facts,
  .pin-facts dt,
  .pin-facts dd {
    margin: 0;
  }

  .security-card-title {
    font: inherit;
  }

  .pin-facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2) var(--space-5);
    min-width: 0;
  }

  .pin-facts > div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    border-top: 1px solid var(--border);
    padding-top: var(--space-2);
  }

  .pin-facts dt {
    color: var(--muted-foreground);
    font-size: 0.78rem;
  }

  .pin-facts dd {
    font-weight: 650;
    text-align: end;
  }

  :global(.security-pin-dialog) {
    width: min(31rem, calc(100vw - 2rem));
    max-width: none;
  }

  .security-pin-form {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  @container workspace (max-width: 40rem) {
    .pin-facts {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
