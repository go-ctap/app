import { writable } from "svelte/store";

import type { OperationStage } from "../../../../bindings/github.com/go-ctap/kit/model";
import type { RuntimeErrorEnvelope } from "../../../../bindings/github.com/go-ctap/kit/service";

export type ActiveOperation = {
  operationId?: string;
  sessionId?: string;
  label?: string;
  stage?: OperationStage;
  completed?: number | null;
  total?: number | null;
  cancelPending?: boolean;
  cancelRequested?: boolean;
  cancelError?: RuntimeErrorEnvelope | null;
};

export type StatusBarOutcome = {
  tone: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  retry?: () => void | Promise<void>;
};

export type StatusBarState = {
  activeOperation: ActiveOperation | null;
  lastOutcome: StatusBarOutcome | null;
};

export type ActiveScreen = "overview" | "passkeys" | "large-blobs" | "settings";

export const activeScreen = writable<ActiveScreen>("overview");
export const statusBar = writable<StatusBarState>({ activeOperation: null, lastOutcome: null });

export function resetWorkbenchStateForTest() {
  activeScreen.set("overview");
  statusBar.set({ activeOperation: null, lastOutcome: null });
}
