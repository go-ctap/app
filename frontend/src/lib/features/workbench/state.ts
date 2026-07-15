import { writable } from "svelte/store";

import type { OperationStage } from "../../../../bindings/github.com/go-ctap/kit/model";
import type { Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";

export type ActiveOperation = {
  operationId?: string;
  sessionId?: string;
  label?: string;
  stage?: OperationStage;
  completed?: number | null;
  total?: number | null;
  sampleStatus?: string;
  cancelPending?: boolean;
  cancelRequested?: boolean;
  cancelError?: Failure | null;
};

export type StatusBarOutcome = {
  tone: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
};

export type StatusBarState = {
  activeOperation: ActiveOperation | null;
  lastOutcome: StatusBarOutcome | null;
};

export type ActiveScreen = "overview" | "passkeys" | "lab" | "large-blobs" | "security" | "logs" | "settings";

export const activeScreen = writable<ActiveScreen>("overview");
export const statusBar = writable<StatusBarState>({ activeOperation: null, lastOutcome: null });

export function resetWorkbenchStateForTest() {
  activeScreen.set("overview");
  statusBar.set({ activeOperation: null, lastOutcome: null });
}
