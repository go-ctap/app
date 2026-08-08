import { readonly } from "svelte/store";

import * as state from "$lib/features/conformance/state.js";

export const conformanceMode = readonly(state.conformanceMode);

export const conformanceRun = readonly(state.conformanceRun);

export type { ConformanceRunState } from "$lib/features/conformance/state.js";

export {
  maybeLoadConformance,
  reloadConformanceMetadata,
  runCTAP23Conformance,
  selectConformanceMode,
} from "$lib/conformance-controller.js";
