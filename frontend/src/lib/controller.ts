import { loadPasskeys as loadPasskeysOperation } from "./passkeys-controller.js";
import { loadLargeBlobs as loadLargeBlobsOperation } from "./largeblobs-controller.js";
import {
  loadSecurityEnrollments as loadSecurityEnrollmentsOperation,
  loadSecurityStatus as loadSecurityStatusOperation,
  retrySecurityMutation as retrySecurityMutationOperation,
} from "./security-controller.js";
import { ensureSelectedSessionReady } from "./session-controller.js";

export async function reloadPasskeys(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return loadPasskeysOperation({ refresh: true });
}

export async function reloadLargeBlobs(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return loadLargeBlobsOperation({ refresh: true });
}

export async function reloadSecurity(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return loadSecurityStatusOperation();
}

export async function reloadSecurityEnrollments(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return loadSecurityEnrollmentsOperation();
}

export async function retrySecurityMutation(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return retrySecurityMutationOperation();
}

export {
  answerPendingInteraction,
  handleInteractionRequested,
} from "./interaction-controller.js";
export { handleOperationProgress } from "./event-controller.js";
export {
  cancelActiveOperation,
  retryLastStatusOutcome,
} from "./operation-controller.js";
export {
  handleDiscoveryChanged,
  refreshDiscovery,
  startDiscoveryMonitoring,
} from "./discovery-controller.js";
export {
  loadOverview,
  loadOverviewMDS,
} from "./overview-controller.js";
export {
  beginLargeBlobCleanup,
  beginLargeBlobDelete,
  beginLargeBlobWrite,
  closeLargeBlobMutation,
  confirmLargeBlobCleanup,
  confirmLargeBlobDelete,
  confirmLargeBlobWrite,
  editLargeBlobWrite,
  loadLargeBlobs,
  previewLargeBlobWrite,
  readLargeBlob,
  retryLargeBlobMutation,
  selectLargeBlobCredential,
  setLargeBlobsDecodeMode,
  setLargeBlobsPayloadEncoding,
  setLargeBlobsQuery,
  setLargeBlobsStatusFilter,
  setLargeBlobsVerificationFlow,
  updateLargeBlobWriteDraft,
} from "./largeblobs-controller.js";
export {
  cancelLabHandoff,
  cancelLabPreset,
  confirmLabHandoff,
  confirmLabMakeCredential,
  confirmLabPreset,
  editLabGetAssertion,
  editLabMakeCredential,
  handoffLabCredential,
  newLabGetAssertionRun,
  newLabMakeCredentialRun,
  previewLabMakeCredential,
  regenerateLabGetChallenge,
  regenerateLabMakeChallenge,
  regenerateLabUserID,
  requestLabPreset,
  retryLabGetAssertion,
  retryLabMakeCredential,
  runLabGetAssertion,
  updateLabGetAssertionDraft,
  updateLabMakeCredentialDraft,
} from "./lab-controller.js";
export { base64ToHex } from "./lab-input.js";
export {
  beginCredentialDelete,
  beginCredentialUpdate,
  closePasskeysMutation,
  confirmCredentialDelete,
  confirmCredentialUpdate,
  editCredentialUpdate,
  loadPasskeys,
  previewCredentialUpdate,
  retryPasskeysMutation,
  selectPasskeyCredential,
  setPasskeysQuery,
  setPasskeysStatusFilter,
  setPasskeysVerificationFlow,
  updateCredentialDraft,
} from "./passkeys-controller.js";
export {
  bootstrap,
  ensureSelectedSessionReady,
  navigateToScreen,
  rediscoverAfterFactoryReset,
  selectToken,
  shutdownWorkbench,
} from "./session-controller.js";
export {
  AlwaysUVTarget,
  beginAlwaysUVChange,
  beginBioEnrollment,
  beginBioRemove,
  beginBioRename,
  beginFactoryReset,
  beginPINPolicyChange,
  changeAuthenticatorPIN,
  closeSecurityMutation,
  confirmSecurityMutation,
  loadSecurityBioSensor,
  loadSecurityEnrollments,
  loadSecurityStatus,
  maybeLoadSecurity,
  setAuthenticatorPIN,
  validatePINPolicyDraft,
  type SecurityPINPolicyDraft,
} from "./security-controller.js";
