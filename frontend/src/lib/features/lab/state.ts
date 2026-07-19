import { writable } from "svelte/store";

import {
  CredentialProtectionPolicy,
  LargeBlobSupport,
} from "../../../../bindings/github.com/go-ctap/ctap/extension";
import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit";
import type { Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  GetAssertionEnvelope,
  GetAssertionRequest,
  MakeCredentialEnvelope,
  MakeCredentialRequest,
} from "../../../../bindings/fidobench/service";

import { deviceFeatureLifecycles } from "$lib/feature-lifecycle";
import {
  buildClientDataJSON,
  randomBase64URL,
  randomHex,
  type LabRandomSource,
} from "$lib/lab-input";

export type LabTriState = "auto" | "true" | "false";
export type LabClientDataMode = "builder" | "raw";
export type LabOperationTab = "make" | "get";
export type LabBinaryMode = "utf8" | "hex";
export type LabEnterpriseAttestation = 0 | 1 | 2;

export type LabBinaryDraft = {
  mode: LabBinaryMode;
  value: string;
};

export type LabBooleanExtensionDraft = {
  included: boolean;
  value: boolean;
};

export type LabHMACSecretDraft = {
  included: boolean;
  salt1Hex: string;
  salt2Enabled: boolean;
  salt2Hex: string;
};

export type LabPRFValuesDraft = {
  first: LabBinaryDraft;
  secondEnabled: boolean;
  second: LabBinaryDraft;
};

export type LabPRFCredentialEvaluationDraft = {
  credentialIDHex: string;
  values: LabPRFValuesDraft;
};

export type LabLargeBlobGetMode = "read" | "write";

export type MakeCredentialExtensionsDraft = {
  credentialProperties: { included: boolean };
  credentialProtection: {
    included: boolean;
    policy: CredentialProtectionPolicy;
    enforce: boolean;
  };
  credentialBlob: {
    included: boolean;
    payload: LabBinaryDraft;
  };
  hmacSecret: LabBooleanExtensionDraft;
  hmacSecretMC: LabHMACSecretDraft;
  largeBlob: {
    included: boolean;
    support: LargeBlobSupport;
  };
  minPINLength: LabBooleanExtensionDraft;
  pinComplexityPolicy: LabBooleanExtensionDraft;
  prf: {
    included: boolean;
    useEval: boolean;
    eval: LabPRFValuesDraft;
  };
  payment: { included: boolean };
};

export type GetAssertionExtensionsDraft = {
  getCredentialBlob: LabBooleanExtensionDraft;
  hmacSecret: LabHMACSecretDraft;
  largeBlob: {
    included: boolean;
    mode: LabLargeBlobGetMode;
    payload: LabBinaryDraft;
  };
  prf: {
    included: boolean;
    useGlobalEval: boolean;
    eval: LabPRFValuesDraft;
    evalByCredential: LabPRFCredentialEvaluationDraft[];
  };
  payment: { included: boolean };
};

export type LabDescriptorDraft = {
  credentialIDHex: string;
};

export type LabClientDataDraft = {
  mode: LabClientDataMode;
  origin: string;
  challenge: string;
  crossOrigin: boolean;
  topOrigin: string;
  rawJSON: string;
};

export type MakeCredentialDraft = {
  rpID: string;
  rpName: string;
  userIDHex: string;
  userName: string;
  userDisplayName: string;
  clientData: LabClientDataDraft;
  algorithms: string[];
  attestationFormatsPreference: string[];
  enterpriseAttestation: LabEnterpriseAttestation;
  excludeList: LabDescriptorDraft[];
  residentKey: LabTriState;
  userPresence: LabTriState;
  userVerification: LabTriState;
  verificationFlow: VerificationFlow;
  extensions: MakeCredentialExtensionsDraft;
};

export type GetAssertionDraft = {
  rpID: string;
  clientData: LabClientDataDraft;
  allowList: LabDescriptorDraft[];
  userPresence: LabTriState;
  userVerification: LabTriState;
  verificationFlow: VerificationFlow;
  extensions: GetAssertionExtensionsDraft;
};

export type LabMakeStep =
  | { phase: "editing" }
  | {
      phase: "previewing";
      previewRequest: MakeCredentialRequest;
    }
  | {
      phase: "review";
      previewRequest: MakeCredentialRequest;
      previewEnvelope: MakeCredentialEnvelope;
    }
  | {
      phase: "executing";
      previewRequest: MakeCredentialRequest;
      previewEnvelope: MakeCredentialEnvelope;
      request: MakeCredentialRequest;
    }
  | {
      phase: "success";
      previewRequest: MakeCredentialRequest;
      previewEnvelope: MakeCredentialEnvelope;
      request: MakeCredentialRequest;
      responseEnvelope: MakeCredentialEnvelope;
    }
  | {
      phase: "error";
      previewRequest: MakeCredentialRequest;
      previewEnvelope: MakeCredentialEnvelope | null;
      request: MakeCredentialRequest | null;
      responseEnvelope: MakeCredentialEnvelope | null;
      runtimeError: Failure | null;
    };

export type LabGetStep =
  | { phase: "editing" }
  | {
      phase: "previewing";
      previewRequest: GetAssertionRequest;
    }
  | {
      phase: "review";
      previewRequest: GetAssertionRequest;
      previewEnvelope: GetAssertionEnvelope;
    }
  | {
      phase: "executing";
      previewRequest: GetAssertionRequest;
      previewEnvelope: GetAssertionEnvelope;
      request: GetAssertionRequest;
    }
  | {
      phase: "success";
      previewRequest: GetAssertionRequest;
      previewEnvelope: GetAssertionEnvelope;
      request: GetAssertionRequest;
      responseEnvelope: GetAssertionEnvelope;
    }
  | {
      phase: "error";
      previewRequest: GetAssertionRequest;
      previewEnvelope: GetAssertionEnvelope | null;
      request: GetAssertionRequest | null;
      responseEnvelope: GetAssertionEnvelope | null;
      runtimeError: Failure | null;
    };

export type LabPendingHandoff = {
  rpID: string;
  credentialIDHex: string;
};

export type LabState = {
  activeOperation: LabOperationTab;
  makeDraft: MakeCredentialDraft;
  getDraft: GetAssertionDraft;
  makeStep: LabMakeStep;
  getStep: LabGetStep;
  pendingHandoff: LabPendingHandoff | null;
};

function prfValues(first = ""): LabPRFValuesDraft {
  return {
    first: { mode: "utf8", value: first },
    secondEnabled: false,
    second: { mode: "utf8", value: "" },
  };
}

function makeExtensionDefaults(randomSource?: LabRandomSource): MakeCredentialExtensionsDraft {
  return {
    credentialProperties: { included: false },
    credentialProtection: {
      included: false,
      policy: CredentialProtectionPolicy.CredentialProtectionPolicyUserVerificationOptional,
      enforce: false,
    },
    credentialBlob: { included: false, payload: { mode: "utf8", value: "" } },
    hmacSecret: { included: false, value: true },
    hmacSecretMC: {
      included: false,
      salt1Hex: randomHex(32, randomSource),
      salt2Enabled: false,
      salt2Hex: "",
    },
    largeBlob: { included: false, support: LargeBlobSupport.LargeBlobSupportPreferred },
    minPINLength: { included: false, value: true },
    pinComplexityPolicy: { included: false, value: true },
    prf: { included: false, useEval: false, eval: prfValues("registration-prf") },
    payment: { included: false },
  };
}

function getExtensionDefaults(randomSource?: LabRandomSource): GetAssertionExtensionsDraft {
  return {
    getCredentialBlob: { included: false, value: true },
    hmacSecret: {
      included: false,
      salt1Hex: randomHex(32, randomSource),
      salt2Enabled: false,
      salt2Hex: "",
    },
    largeBlob: {
      included: false,
      mode: "read",
      payload: { mode: "utf8", value: "" },
    },
    prf: {
      included: false,
      useGlobalEval: false,
      eval: prfValues("authentication-prf"),
      evalByCredential: [],
    },
    payment: { included: false },
  };
}

export function createLabState(randomSource?: LabRandomSource): LabState {
  const userIDHex = randomHex(16, randomSource);
  const makeChallenge = randomBase64URL(32, randomSource);
  const getChallenge = randomBase64URL(32, randomSource);
  const makeClientData: LabClientDataDraft = {
    mode: "builder",
    origin: "https://example.com",
    challenge: makeChallenge,
    crossOrigin: false,
    topOrigin: "https://example.com",
    rawJSON: "",
  };
  const getClientData: LabClientDataDraft = {
    mode: "builder",
    origin: "https://example.com",
    challenge: getChallenge,
    crossOrigin: false,
    topOrigin: "https://example.com",
    rawJSON: "",
  };
  makeClientData.rawJSON = buildClientDataJSON("create", makeClientData);
  getClientData.rawJSON = buildClientDataJSON("get", getClientData);

  return {
    activeOperation: "make",
    makeDraft: {
      rpID: "example.com",
      rpName: "Example",
      userIDHex,
      userName: "alice@example.com",
      userDisplayName: "Alice",
      clientData: makeClientData,
      algorithms: ["-7"],
      attestationFormatsPreference: [],
      enterpriseAttestation: 0,
      excludeList: [],
      residentKey: "auto",
      userPresence: "auto",
      userVerification: "auto",
      verificationFlow: VerificationFlow.VerificationFlowDefault,
      extensions: makeExtensionDefaults(randomSource),
    },
    getDraft: {
      rpID: "example.com",
      clientData: getClientData,
      allowList: [],
      userPresence: "auto",
      userVerification: "auto",
      verificationFlow: VerificationFlow.VerificationFlowDefault,
      extensions: getExtensionDefaults(randomSource),
    },
    makeStep: { phase: "editing" },
    getStep: { phase: "editing" },
    pendingHandoff: null,
  };
}

export const labState = writable<LabState>(createLabState());

export function resetLabDeviceState() {
  labState.set(createLabState());
}

export function resetLabStateForTest(randomSource?: LabRandomSource) {
  labState.set(createLabState(randomSource));
}

deviceFeatureLifecycles.register("lab", {
  resetForAuthenticatorChange: resetLabDeviceState,
  resetForTest: resetLabStateForTest,
});
