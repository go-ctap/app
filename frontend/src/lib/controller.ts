import { loadPasskeys as loadPasskeysOperation } from "./passkeys-controller.js";
import { ensureSelectedSessionReady } from "./session-controller.js";

export async function reloadPasskeys(): Promise<boolean> {
  if (!await ensureSelectedSessionReady()) return false;
  return loadPasskeysOperation({ refresh: true });
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
  selectToken,
  shutdownWorkbench,
} from "./session-controller.js";
