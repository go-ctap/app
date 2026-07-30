import { readonly } from "svelte/store";

import { ensureActiveSelectionReady } from "$lib/authenticator-controller.js";
import {
  loadSecurityEnrollments as loadSecurityEnrollmentsOperation,
  loadSecurityStatus as loadSecurityStatusOperation,
  restartSecurityPreview as restartSecurityPreviewOperation,
} from "$lib/security-controller.js";
import * as state from "$lib/features/security/state.js";

export const securityStatus = readonly(state.securityStatus);

export const securitySensor = readonly(state.securitySensor);

export const securityEnrollments = readonly(state.securityEnrollments);

export const securityMutation = readonly(state.securityMutation);

export type {
  SecurityMutationState,
  SecurityMutationValidationError,
  SecurityPINPolicyDraft,
  SecurityResourcePhase,
  SecurityResourceState,
} from "$lib/features/security/state.js";

export async function reloadSecurity(): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

  return loadSecurityStatusOperation();
}

export async function reloadSecurityEnrollments(): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

  return loadSecurityEnrollmentsOperation();
}

export async function restartSecurityPreview(): Promise<boolean> {
  if (!(await ensureActiveSelectionReady())) return false;

  return restartSecurityPreviewOperation();
}

export {
  loadSecurityEnrollmentsOperation as loadSecurityEnrollments,
  loadSecurityStatusOperation as loadSecurityStatus,
};

export {
  AlwaysUVTarget,
  beginAlwaysUVChange,
  beginEnterpriseAttestation,
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
  maybeLoadSecurity,
  setAuthenticatorPIN,
  validatePINPolicyDraft,
} from "$lib/security-controller.js";
