import {
  beginCredentialDelete as beginCredentialDeleteOperation,
  loadCredentialStoreState as loadCredentialStoreStateOperation,
  loadPasskeys as loadPasskeysOperation,
  previewCredentialUpdate as previewCredentialUpdateOperation,
} from "./passkeys-controller.js";
import {
  beginLargeBlobCleanup as beginLargeBlobCleanupOperation,
  beginLargeBlobDelete as beginLargeBlobDeleteOperation,
  loadLargeBlobs as loadLargeBlobsOperation,
  previewLargeBlobWrite as previewLargeBlobWriteOperation,
} from "./largeblobs-controller.js";
import { loadOverview as loadOverviewOperation } from "./overview-controller.js";
import {
  loadSecurityEnrollments as loadSecurityEnrollmentsOperation,
  loadSecurityStatus as loadSecurityStatusOperation,
  restartSecurityPreview as restartSecurityPreviewOperation,
} from "./security-controller.js";
import { ensureActiveSelectionReady } from "./authenticator-controller.js";

export async function reloadPasskeys(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
	return loadPasskeysOperation();
}

export async function readCredentialStoreState(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return loadCredentialStoreStateOperation();
}

export async function reloadLargeBlobs(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
	return loadLargeBlobsOperation();
}

export async function reloadOverview(): Promise<void> {
  if (!await ensureActiveSelectionReady()) return;
  await loadOverviewOperation();
}

export async function reloadSecurity(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return loadSecurityStatusOperation();
}

export async function reloadSecurityEnrollments(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return loadSecurityEnrollmentsOperation();
}

export async function restartSecurityPreview(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return restartSecurityPreviewOperation();
}

export async function previewCredentialUpdate(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return previewCredentialUpdateOperation();
}

export async function beginCredentialDelete(credentialIDHex?: string): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return beginCredentialDeleteOperation(credentialIDHex);
}

export async function previewLargeBlobWrite(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return previewLargeBlobWriteOperation();
}

export async function beginLargeBlobDelete(credentialIDHex?: string): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return beginLargeBlobDeleteOperation(credentialIDHex);
}

export async function beginLargeBlobCleanup(): Promise<boolean> {
  if (!await ensureActiveSelectionReady()) return false;
  return beginLargeBlobCleanupOperation();
}

export {
  answerPendingInteraction,
  handleInteractionRequested,
} from "./interaction-controller.js";
export { handleOperationProgress } from "./event-controller.js";
export {
  cancelActiveOperation,
} from "./operation-controller.js";
export {
  clearLogJournal,
  syncLogJournal,
} from "./logs-controller.js";
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
  beginLargeBlobWrite,
  closeLargeBlobMutation,
  confirmLargeBlobCleanup,
  confirmLargeBlobDelete,
  confirmLargeBlobWrite,
  editLargeBlobWrite,
  loadLargeBlobs,
  readLargeBlob,
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
  confirmLabHandoff,
  confirmLabGetAssertion,
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
  updateLabMakeCredentialDraft,
} from "./lab-controller.js";
export {
  beginCredentialUpdate,
  closePasskeysMutation,
  confirmCredentialDelete,
  confirmCredentialUpdate,
  editCredentialUpdate,
  loadPasskeys,
  loadCredentialStoreState,
  selectPasskeyCredential,
  setPasskeysQuery,
  setPasskeysStatusFilter,
  setPasskeysVerificationFlow,
  updateCredentialDraft,
} from "./passkeys-controller.js";
export {
  ensureActiveSelectionReady,
  rediscoverAfterFactoryReset,
  shutdownWorkbench,
} from "./authenticator-controller.js";
export {
  bootstrap,
  navigateToScreen,
  selectToken,
} from "./workbench-controller.js";
export {
  AlwaysUVTarget,
  beginAlwaysUVChange,
  beginBioEnrollment,
  beginBioRemove,
  beginBioRename,
  beginFactoryReset,
  beginLongTouchForReset,
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
