import { readonly } from "svelte/store";

import * as interaction from "./features/interaction/state.js";
import * as lab from "./features/lab/state.js";
import * as largeBlobs from "./features/largeblobs/state.js";
import * as overview from "./features/overview/state.js";
import * as passkeys from "./features/passkeys/state.js";
import * as session from "./features/session/state.js";
import * as security from "./features/security/state.js";
import * as workbench from "./features/workbench/state.js";

export {
  type ActiveScreen,
  type StatusBarState,
} from "./features/workbench/state.js";
export type {
  GetAssertionDraft,
  LabClientDataDraft,
  LabClientDataMode,
  LabDescriptorDraft,
  LabGetStep,
  LabMakeStep,
  LabState,
  LabTriState,
  MakeCredentialDraft,
} from "./features/lab/state.js";
export type {
  LargeBlobMutationState,
  LargeBlobReadState,
  LargeBlobsInventoryPhase,
  LargeBlobsInventoryState,
  LargeBlobsStatusFilter,
} from "./features/largeblobs/state.js";
export type { LargeBlobPayloadEncoding } from "./largeblobs-payload.js";
export type {
  CredentialUpdateForm,
  CredentialUpdateValidationError,
  CredentialStoreStatePhase,
  CredentialStoreStateState,
  PasskeysInventoryPhase,
  PasskeysInventoryState,
  PasskeysMutationState,
  PasskeysStatusFilter,
} from "./features/passkeys/state.js";
export type {
  SecurityMutationState,
  SecurityMutationValidationError,
  SecurityPINPolicyDraft,
  SecurityResourcePhase,
  SecurityResourceState,
} from "./features/security/state.js";

export const devices = readonly(session.devices);
export const selectedSelector = readonly(session.selectedSelector);
export const selectedDevice = readonly(session.selectedDevice);
export const sessionStatus = readonly(session.sessionStatus);
export const sessionBusy = readonly(session.sessionBusy);

export const activeScreen = readonly(workbench.activeScreen);
export const statusBar = readonly(workbench.statusBar);

export const authenticatorInspection = readonly(session.authenticatorInspection);
export const overviewBioSensor = readonly(overview.overviewBioSensor);
export const overviewMDS = readonly(overview.overviewMDS);

export const passkeysInventoryState = readonly(passkeys.passkeysInventoryState);
export const credentialStoreStateState = readonly(passkeys.credentialStoreStateState);
export const passkeysQuery = readonly(passkeys.passkeysQuery);
export const passkeysStatusFilter = readonly(passkeys.passkeysStatusFilter);
export const passkeysSelectedCredentialID = readonly(passkeys.passkeysSelectedCredentialID);
export const passkeysVerificationFlow = readonly(passkeys.passkeysVerificationFlow);
export const passkeysMutation = readonly(passkeys.passkeysMutation);

export const largeBlobsInventoryState = readonly(largeBlobs.largeBlobsInventoryState);
export const largeBlobsDecodeMode = readonly(largeBlobs.largeBlobsDecodeMode);
export const largeBlobsReadState = readonly(largeBlobs.largeBlobsReadState);
export const largeBlobsMutation = readonly(largeBlobs.largeBlobsMutation);
export const largeBlobsQuery = readonly(largeBlobs.largeBlobsQuery);
export const largeBlobsStatusFilter = readonly(largeBlobs.largeBlobsStatusFilter);
export const largeBlobsSelectedCredentialID = readonly(largeBlobs.largeBlobsSelectedCredentialID);
export const largeBlobsVerificationFlow = readonly(largeBlobs.largeBlobsVerificationFlow);
export const largeBlobsPayloadEncoding = readonly(largeBlobs.largeBlobsPayloadEncoding);

export const pendingInteraction = readonly(interaction.pendingInteraction);

export const labState = readonly(lab.labState);

export const securityStatus = readonly(security.securityStatus);
export const securitySensor = readonly(security.securitySensor);
export const securityEnrollments = readonly(security.securityEnrollments);
export const securityMutation = readonly(security.securityMutation);
