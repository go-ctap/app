import { get } from "svelte/store";
import type { InteractionAnswer, InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";
import { api } from "./api.js";
import { activeScreen, pendingInteraction, selectedSelector } from "./app-state.js";
import { operationStageLabel } from "./format.js";
import { appendLogEntry } from "./workbench-state.js";
import { interactionMatchesCurrentSession } from "./session-boundary.js";
import { m } from "../paraglide/messages.js";

const resolvingInteractions = new Set<string>();

async function cancelInteractionPrompt(prompt: InteractionPrompt) {
  try {
    await api.resolveInteraction({
      interactionId: prompt.interactionId,
      confirmed: false,
      canceled: true,
    });
  } catch {
    // Stale prompts are outside the current UI boundary; best-effort cancel is enough.
  }
}

export async function cancelPendingInteraction() {
  const prompt = get(pendingInteraction);
  if (!prompt) return;
  try {
    await answerPendingInteraction({ confirmed: false, canceled: true });
  } catch {
    pendingInteraction.set(null);
  }
}

export async function answerPendingInteraction(answer: Omit<InteractionAnswer, "interactionId">) {
  const prompt = get(pendingInteraction);
  if (!prompt) {
    pendingInteraction.set(null);
    return false;
  }

  if (!interactionMatchesCurrentSession(prompt)) {
    pendingInteraction.set(null);
    await cancelInteractionPrompt(prompt);
    return false;
  }

  const interactionId = prompt.interactionId;
  if (resolvingInteractions.has(interactionId)) return false;

  resolvingInteractions.add(interactionId);
  try {
    return await api.resolveInteraction({
      ...answer,
      interactionId,
    });
  } finally {
    resolvingInteractions.delete(interactionId);
    if (get(pendingInteraction)?.interactionId === interactionId) {
      pendingInteraction.set(null);
    }
  }
}

export function handleInteractionRequested(data: InteractionPrompt) {
  if (!interactionMatchesCurrentSession(data)) {
    void cancelInteractionPrompt(data);
    return;
  }

  pendingInteraction.set(data);
  appendLogEntry({
    tone: "warning",
    source: "operation-interaction",
    title: m.stage_interaction_required(),
    message: operationStageLabel("interaction-required"),
    operationId: data.operationId,
    screen: get(activeScreen),
    selector: get(selectedSelector),
    data: {
      operationId: data.operationId,
      interactionId: data.interactionId,
      request: {
        kind: data.request.kind || m.interaction(),
        permission: data.request.permission,
        destructive: data.request.destructive,
        hasPreview: Boolean(data.request.preview),
      },
    },
  });
}
