import { writable } from "svelte/store";

import type { AuthenticatorTransport } from "../../../../bindings/github.com/go-ctap/ctap/credential";
import { VerificationFlow } from "../../../../bindings/github.com/go-ctap/kit/model";
import type { Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  GetAssertionEnvelope,
  GetAssertionRequest,
  MakeCredentialEnvelope,
  MakeCredentialRequest,
} from "../../../../bindings/github.com/go-ctap/kit/service";

import {
  buildClientDataJSON,
  randomBase64URL,
  randomHex,
  type LabRandomSource,
} from "../../lab-input.js";

export type LabPresetID = "minimal" | "discoverable" | "non-discoverable" | "uv-required";
export type LabTriState = "auto" | "true" | "false";
export type LabClientDataMode = "builder" | "raw";

export type LabDescriptorDraft = {
  credentialIDHex: string;
  transports: AuthenticatorTransport[];
};

export type LabClientDataDraft = {
  mode: LabClientDataMode;
  origin: string;
  challenge: string;
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
  excludeList: LabDescriptorDraft[];
  residentKey: LabTriState;
  userPresence: LabTriState;
  userVerification: LabTriState;
  verificationFlow: VerificationFlow;
};

export type GetAssertionDraft = {
  rpID: string;
  clientData: LabClientDataDraft;
  allowList: LabDescriptorDraft[];
  residentKey: LabTriState;
  userPresence: LabTriState;
  userVerification: LabTriState;
  verificationFlow: VerificationFlow;
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
      phase: "executing";
      request: GetAssertionRequest;
    }
  | {
      phase: "success";
      request: GetAssertionRequest;
      responseEnvelope: GetAssertionEnvelope;
    }
  | {
      phase: "error";
      request: GetAssertionRequest;
      responseEnvelope: GetAssertionEnvelope | null;
      runtimeError: Failure | null;
    };

export type LabPendingHandoff = {
  rpID: string;
  credentialIDHex: string;
};

export type LabState = {
  presetID: LabPresetID;
  isCustom: boolean;
  pendingPresetID: LabPresetID | null;
  makeDraft: MakeCredentialDraft;
  getDraft: GetAssertionDraft;
  makeStep: LabMakeStep;
  getStep: LabGetStep;
  pendingHandoff: LabPendingHandoff | null;
};

function optionDefaults(presetID: LabPresetID) {
  const make = {
    residentKey: "auto" as LabTriState,
    userPresence: "auto" as LabTriState,
    userVerification: "auto" as LabTriState,
  };
  const get = { ...make };

  if (presetID === "discoverable") make.residentKey = "true";
  if (presetID === "non-discoverable") make.residentKey = "false";
  if (presetID === "uv-required") {
    make.userVerification = "true";
    get.userVerification = "true";
  }

  return { make, get };
}

export function createPresetState(
  presetID: LabPresetID = "discoverable",
  randomSource?: LabRandomSource,
): LabState {
  const userIDHex = randomHex(16, randomSource);
  const makeChallenge = randomBase64URL(32, randomSource);
  const getChallenge = randomBase64URL(32, randomSource);
  const options = optionDefaults(presetID);
  const makeClientData: LabClientDataDraft = {
    mode: "builder",
    origin: "https://example.com",
    challenge: makeChallenge,
    rawJSON: "",
  };
  const getClientData: LabClientDataDraft = {
    mode: "builder",
    origin: "https://example.com",
    challenge: getChallenge,
    rawJSON: "",
  };
  makeClientData.rawJSON = buildClientDataJSON("create", makeClientData);
  getClientData.rawJSON = buildClientDataJSON("get", getClientData);

  return {
    presetID,
    isCustom: false,
    pendingPresetID: null,
    makeDraft: {
      rpID: "example.com",
      rpName: "Example",
      userIDHex,
      userName: "alice@example.com",
      userDisplayName: "Alice",
      clientData: makeClientData,
      algorithms: ["-7"],
      excludeList: [],
      ...options.make,
      verificationFlow: VerificationFlow.VerificationFlowDefault,
    },
    getDraft: {
      rpID: "example.com",
      clientData: getClientData,
      allowList: [],
      ...options.get,
      verificationFlow: VerificationFlow.VerificationFlowDefault,
    },
    makeStep: { phase: "editing" },
    getStep: { phase: "editing" },
    pendingHandoff: null,
  };
}

export const labState = writable<LabState>(createPresetState());

export function resetLabDeviceState() {
  labState.set(createPresetState());
}

export function resetLabStateForTest(randomSource?: LabRandomSource) {
  labState.set(createPresetState("discoverable", randomSource));
}
