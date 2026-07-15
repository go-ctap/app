import { api } from "./api.js";
import { logController } from "./features/logs/state.svelte.js";
import {
  beginCredentialDelete as beginCredentialDeleteOperation,
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
import { ensureSelectedSessionReady } from "./session-controller.js";

export async function syncLogJournal(): Promise<void> {
  try {
    logController.applyBatch(await api.readLogs({ after: logController.cursor }));
  } catch {
    // runtimeCall records bridge failures in the local journal.
  }
}

export async function clearLogJournal(): Promise<boolean> {
  try {
    const cursor = await api.clearLogs();
    logController.clear(cursor.sequence);
    await syncLogJournal();
    return true;
  } catch {
    return false;
  }
}

export async function reloadPasskeys(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return loadPasskeysOperation({ refresh: true });
}

export async function reloadLargeBlobs(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return loadLargeBlobsOperation({ refresh: true });
}

export async function reloadOverview(): Promise<void> {
  if (!await ensureSelectedSessionReady()) return;
  await loadOverviewOperation();
}

export async function reloadSecurity(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return loadSecurityStatusOperation();
}

export async function reloadSecurityEnrollments(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return loadSecurityEnrollmentsOperation();
}

export async function restartSecurityPreview(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return restartSecurityPreviewOperation();
}

export async function previewCredentialUpdate(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return previewCredentialUpdateOperation();
}

export async function beginCredentialDelete(credentialIDHex?: string): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return beginCredentialDeleteOperation(credentialIDHex);
}

export async function previewLargeBlobWrite(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return previewLargeBlobWriteOperation();
}

export async function beginLargeBlobDelete(credentialIDHex?: string): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return beginLargeBlobDeleteOperation(credentialIDHex);
}

export async function beginLargeBlobCleanup(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
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
  cancelLabPreset,
  confirmLabHandoff,
  confirmLabGetAssertion,
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
  rerunLabGetAssertion,
  runLabGetAssertion,
  selectLabGetSection,
  selectLabMakeSection,
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
