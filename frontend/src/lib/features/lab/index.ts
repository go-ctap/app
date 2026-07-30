import { readonly } from "svelte/store";

import * as state from "$lib/features/lab/state.js";

export const labState = readonly(state.labState);

export type {
  GetAssertionDraft,
  LabVerificationState,
  LabClientDataDraft,
  LabClientDataMode,
  LabDescriptorDraft,
  LabGetStep,
  LabMakeStep,
  LabState,
  LabTriState,
  MakeCredentialDraft,
} from "$lib/features/lab/state.js";

export {
  cancelLabHandoff,
  confirmLabGetAssertion,
  confirmLabHandoff,
  confirmLabMakeCredential,
  editLabGetAssertion,
  editLabMakeCredential,
  fillLabDemoValues,
  handoffLabCredential,
  newLabGetAssertionRun,
  newLabMakeCredentialRun,
  previewLabMakeCredential,
  regenerateLabGetChallenge,
  regenerateLabMakeChallenge,
  regenerateLabUserID,
  rerunLabGetAssertion,
  runLabGetAssertion,
  selectLabOperation,
  updateLabGetAssertionDraft,
  updateLabVerificationMaterial,
  updateLabMakeCredentialDraft,
  retryLabGetAssertionVerification,
  retryLabMakeCredentialAttestationTrust,
  retryLabMakeCredentialVerification,
} from "$lib/lab-controller.js";
