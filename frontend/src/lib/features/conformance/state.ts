import { writable } from "svelte/store";

import { RunMode } from "../../../../bindings/github.com/telesma-app/kit/conformance/ctap23";
import type { Failure } from "../../../../bindings/github.com/telesma-app/kit/model/failure";
import type { CTAP23ConformanceEnvelope } from "../../../../bindings/telesma/service";

export type ConformanceRunState = {
  envelope: CTAP23ConformanceEnvelope | null;
  runtimeError: Failure | null;
};

export const conformanceMode = writable<RunMode>(RunMode.RunModeSafe);

export const conformanceRun = writable<ConformanceRunState>({
  envelope: null,
  runtimeError: null,
});

export function resetConformanceDeviceState() {
  conformanceMode.set(RunMode.RunModeSafe);
  conformanceRun.set({ envelope: null, runtimeError: null });
}
