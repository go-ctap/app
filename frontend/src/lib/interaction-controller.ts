import { get } from "svelte/store";

import { ResolveInteraction } from "../../bindings/fidobench/ctapkitservice";
import type { InteractionAnswer, InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { pendingInteraction } from "./features/interaction/state.js";
import { selectedSelector } from "./features/session/state.js";
import { activeScreen } from "./features/workbench/state.js";
import { operationStageLabel } from "./format.js";
import { appendLogEntry } from "./workbench-state.js";

export async function answerPendingInteraction(answer: InteractionAnswer) {
  try {
    return await ResolveInteraction(answer);
  } finally {
    pendingInteraction.set(null);
  }
}

export function handleInteractionRequested(data: InteractionPrompt) {
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
        kind: data.request.kind,
        permission: data.request.permission,
        destructive: data.request.destructive,
        hasPreview: Boolean(data.request.preview),
      },
    },
  });
}
