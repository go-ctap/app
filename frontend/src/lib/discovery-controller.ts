import { get } from "svelte/store";

import type { DiscoveryChangedEnvelope } from "../../bindings/telesma/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { m } from "../paraglide/messages.js";
import {
  selectAuthenticatorSession,
  sessionUpdateApplied,
} from "$lib/authenticator-controller.js";
import { authenticatorSession } from "$lib/features/authenticator/state.js";
import { failureMessage } from "$lib/failure.js";
import { operationRecovery } from "$lib/operation-recovery.js";
import { applySessionSnapshot, setStatusOutcome } from "$lib/workbench-state.js";
import { loadActiveScreen } from "$lib/workbench-controller.js";

type DiscoveryTone = "error" | "info" | "warning";

function discoveryPresentation(
  envelope: DiscoveryChangedEnvelope,
  selectedDisconnected: boolean,
): { tone: DiscoveryTone; title: string; message: string } {
  if (envelope.snapshot.error) {
    return {
      tone: "error",
      title: m.discovery_issue(),
      message: failureMessage(envelope.snapshot.error),
    };
  }

  if (selectedDisconnected) {
    return {
      tone: "warning",
      title: m.selected_authenticator_disconnected(),
      message: m.selected_authenticator_disconnected_message(),
    };
  }

  return {
    tone: "info",
    title: m.authenticator_list_updated(),
    message: m.authenticators_found({ count: envelope.snapshot.devices.length }),
  };
}

export async function handleDiscoveryChanged(envelope: DiscoveryChangedEnvelope) {
  const previousSelector = get(authenticatorSession).selectedAttachmentId;
  const selectedDisconnected =
    Boolean(previousSelector) &&
    !envelope.snapshot.devices.some((device) => device.attachment.id === previousSelector);

  const change = applySessionSnapshot(envelope.snapshot);
  sessionUpdateApplied();

  if (get(operationRecovery)) {
    const recoveryCard = envelope.snapshot.devices.find(
      (device) => device.attachment.transport === Mode.ModeSmartCard,
    );

    if (recoveryCard && recoveryCard.attachment.id !== envelope.snapshot.selection?.attachmentId) {
      await selectAuthenticatorSession(recoveryCard.attachment.id);

      return;
    }
  }

  setStatusOutcome(discoveryPresentation(envelope, selectedDisconnected));
  if (change.becameReady) await loadActiveScreen();
}
