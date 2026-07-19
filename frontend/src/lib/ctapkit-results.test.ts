import { describe, expect, it } from "vitest";

import { AttestationStatementFormatIdentifier } from "../../bindings/github.com/go-ctap/ctap/attestation";
import { PublicKeyCredentialType } from "../../bindings/github.com/go-ctap/ctap/credential";
import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import {
  OperationKind,
} from "../../bindings/github.com/go-ctap/kit/model";
import type { Result as InspectResult } from "../../bindings/github.com/go-ctap/kit/model/inspect";
import {
  AuthenticatorConfigOperation,
  BioModality,
  BioMutationOperation,
  PINMutationOperation,
  StateValue,
  type BioSensorReport,
} from "../../bindings/github.com/go-ctap/kit/model/config";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { MutationOperation } from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import { Vendor, type DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { PreviewMode } from "../../bindings/github.com/go-ctap/kit/model/safety";
import {
  GetAssertionEnvelope,
  MakeCredentialEnvelope,
  type AuthenticatorConfigEnvelope,
  type BioEnrollEnvelope,
  type BioListEnvelope,
  type BioMutationEnvelope,
  type BioSensorEnvelope,
  type ConfigStatusEnvelope,
  type CredentialDeleteEnvelope,
  type CredentialUpdateEnvelope,
  type InspectEnvelope,
  type LargeBlobListEnvelope,
  type LargeBlobMutationEnvelope,
  type LargeBlobReadEnvelope,
  type PINEnvelope,
  type ResetFactoryEnvelope,
} from "../../bindings/fidobench/service";
import {
  GetAssertionOutput,
  GetAssertionResult,
  MakeCredentialOutput,
  MakeCredentialInput,
  MakeCredentialPreview,
  MakeCredentialResult,
} from "../../bindings/github.com/go-ctap/kit/model/webauthn";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { failureForCode } from "./test-failure";

import {
  authenticatorConfigPreview,
  authenticatorConfigResult,
  bioEnrollPreview,
  bioEnrollResult,
  bioListReport,
  bioMutationPreview,
  bioMutationResult,
  bioSensorReport,
  configStatusReport,
  credentialDeletePreview,
  credentialDeleteResult,
  credentialUpdatePreview,
  credentialUpdateResult,
  getAssertionResult,
  inspectResult,
  largeBlobListReport,
  largeBlobMutationPreview,
  largeBlobMutationResult,
  largeBlobReadReport,
  makeCredentialPreview,
  makeCredentialResult,
  pinMutationPreview,
  pinMutationResult,
  resetFactoryPreview,
  resetFactoryResult,
} from "./ctapkit-results";

const device: DeviceReport = {
  fingerprint: "dev-1",
  transport: Mode.ModeHID,
  path: "path",
  vendorId: 1,
  productId: 2,
  vendor: Vendor.VendorUnknown,
};

describe("ctapkit result extractors", () => {
  it("extracts the direct inspect result from an operation envelope", () => {
    const result: InspectResult = {
      device,
      info: {
        versions: ["FIDO_2_1" as Version],
        aaguid: "00000000-0000-0000-0000-000000000000",
        conformance: new Report(),
      },
    };

    const envelope = { kind: OperationKind.OperationInspect, result } as unknown as InspectEnvelope;

    expect(inspectResult(envelope)).toBe(result);
  });

  it("extracts the direct bio sensor report from an operation envelope", () => {
    const report: BioSensorReport = {
      device,
      supported: true,
      previewOnly: false,
      modality: BioModality.BioModalityFingerprint,
    };

    const envelope = { kind: OperationKind.OperationBioSensorInfo, result: report } as unknown as BioSensorEnvelope;

    expect(bioSensorReport(envelope)).toBe(report);
  });

  it("extracts config status and biometric inventory only from successful envelopes", () => {
    const status = {
      kind: OperationKind.OperationConfigStatus,
      result: {
        device,
        pin: { state: StateValue.StateConfigured },
        bio: { state: StateValue.StateSupported },
      },
    } as unknown as ConfigStatusEnvelope;
    const list = {
      kind: OperationKind.OperationBioList,
      result: {
        device,
        supported: true,
        previewOnly: false,
        enrollments: [{ templateIDHex: "cafe", friendlyName: "Right index" }],
      },
    } as unknown as BioListEnvelope;

    expect(configStatusReport(status)).toBe(status.result);
    expect(bioListReport(list)).toBe(list.result);

    status.error = failureForCode(Code.CodeInternalError);
    list.error = failureForCode(Code.CodeInternalError);
    expect(configStatusReport(status)).toBeNull();
    expect(bioListReport(list)).toBeNull();
  });

  it("uses generated operation and mode fields to recognize meaningful security previews", () => {
    const pin = {
      kind: OperationKind.OperationChangePIN,
      error: failureForCode(Code.CodeConfirmationRequired),
      result: {
        preview: { operation: PINMutationOperation.PINMutationChange },
        result: null,
      },
    } as unknown as PINEnvelope;
    const authenticatorConfig = {
      kind: OperationKind.OperationSetAlwaysUV,
      error: failureForCode(Code.CodeConfirmationRequired),
      result: {
        preview: { operation: AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV },
        result: null,
      },
    } as unknown as AuthenticatorConfigEnvelope;
    const enroll = {
      kind: OperationKind.OperationBioEnroll,
      error: failureForCode(Code.CodeConfirmationRequired),
      result: {
        preview: { mode: PreviewMode.PreviewModeDryRun },
        result: null,
      },
    } as unknown as BioEnrollEnvelope;
    const bioMutation = {
      kind: OperationKind.OperationBioRename,
      error: failureForCode(Code.CodeConfirmationRequired),
      result: {
        preview: { operation: BioMutationOperation.BioMutationRename },
        result: null,
      },
    } as unknown as BioMutationEnvelope;
    const reset = {
      kind: OperationKind.OperationResetFactory,
      error: failureForCode(Code.CodeConfirmationRequired),
      result: {
        preview: { mode: PreviewMode.PreviewModeDryRun },
        result: null,
      },
    } as unknown as ResetFactoryEnvelope;

    expect(pinMutationPreview(pin)).toBe(pin.result!.preview);
    expect(authenticatorConfigPreview(authenticatorConfig)).toBe(authenticatorConfig.result!.preview);
    expect(bioEnrollPreview(enroll)).toBe(enroll.result!.preview);
    expect(bioMutationPreview(bioMutation)).toBe(bioMutation.result!.preview);
    expect(resetFactoryPreview(reset)).toBe(reset.result!.preview);

    pin.result!.preview.operation = PINMutationOperation.$zero;
    authenticatorConfig.result!.preview.operation = AuthenticatorConfigOperation.$zero;
    enroll.result!.preview.mode = PreviewMode.$zero;
    bioMutation.result!.preview.operation = BioMutationOperation.$zero;
    reset.result!.preview.mode = PreviewMode.$zero;

    expect(pinMutationPreview(pin)).toBeNull();
    expect(authenticatorConfigPreview(authenticatorConfig)).toBeNull();
    expect(bioEnrollPreview(enroll)).toBeNull();
    expect(bioMutationPreview(bioMutation)).toBeNull();
    expect(resetFactoryPreview(reset)).toBeNull();
  });

  it("keeps partial biometric enrollment progress on error but rejects other errored results", () => {
    const pin = {
      kind: OperationKind.OperationSetPIN,
      result: {
        preview: { operation: PINMutationOperation.PINMutationSet },
        result: { operation: PINMutationOperation.PINMutationSet, deviceFingerprint: "dev-1" },
      },
    } as unknown as PINEnvelope;
    const authenticatorConfig = {
      kind: OperationKind.OperationSetMinPINLength,
      result: {
        preview: { operation: AuthenticatorConfigOperation.AuthenticatorConfigMinPINLength },
        result: {
          operation: AuthenticatorConfigOperation.AuthenticatorConfigMinPINLength,
          deviceFingerprint: "dev-1",
        },
      },
    } as unknown as AuthenticatorConfigEnvelope;
    const enroll = {
      kind: OperationKind.OperationBioEnroll,
      result: {
        preview: { mode: PreviewMode.PreviewModeExecute },
        result: {
          deviceFingerprint: "dev-1",
          templateIDHex: "",
          samples: [{ status: "good" }],
          remainingSamples: 2,
        },
      },
    } as unknown as BioEnrollEnvelope;
    const bioMutation = {
      kind: OperationKind.OperationBioRemove,
      result: {
        preview: { operation: BioMutationOperation.BioMutationRemove },
        result: {
          operation: BioMutationOperation.BioMutationRemove,
          deviceFingerprint: "dev-1",
          templateIDHex: "cafe",
        },
      },
    } as unknown as BioMutationEnvelope;
    const reset = {
      kind: OperationKind.OperationResetFactory,
      result: {
        preview: { mode: PreviewMode.PreviewModeExecute },
        result: { deviceFingerprint: "dev-1", reset: true },
      },
    } as unknown as ResetFactoryEnvelope;

    expect(pinMutationResult(pin)).toBe(pin.result!.result);
    expect(authenticatorConfigResult(authenticatorConfig)).toBe(authenticatorConfig.result!.result);
    expect(bioEnrollResult(enroll)).toBe(enroll.result!.result);
    expect(bioMutationResult(bioMutation)).toBe(bioMutation.result!.result);
    expect(resetFactoryResult(reset)).toBe(reset.result!.result);

    pin.error = failureForCode(Code.CodeInternalError);
    authenticatorConfig.error = failureForCode(Code.CodeInternalError);
    enroll.error = failureForCode(Code.CodeBioInteractionTimeout);
    bioMutation.error = failureForCode(Code.CodeInternalError);
    reset.error = failureForCode(Code.CodeResetTouchTimeout);

    expect(pinMutationResult(pin)).toBeNull();
    expect(authenticatorConfigResult(authenticatorConfig)).toBeNull();
    expect(bioEnrollResult(enroll)?.remainingSamples).toBe(2);
    expect(bioMutationResult(bioMutation)).toBeNull();
    expect(resetFactoryResult(reset)).toBeNull();
  });

  it("extracts typed large blob list and read reports only from successful envelopes", () => {
    const list = {
      kind: OperationKind.OperationListLargeBlobs,
      result: {
        device,
        support: { largeBlobs: true, largeBlobKeyExtension: true },
        array: { read: true, blobCount: 1, matchedBlobCount: 1, unmatchedBlobCount: 0 },
        credentials: [],
      },
    } as unknown as LargeBlobListEnvelope;
    const read = {
      kind: OperationKind.OperationReadLargeBlob,
      result: {
        device,
        support: { largeBlobs: true, largeBlobKeyExtension: true },
        target: { credentialIDHex: "cafe", rp: { id: "example.test" }, user: {} },
        largeBlobKeyState: "available",
        array: { read: true, blobCount: 1, blobPresent: true, blobState: "present" },
        blobPresent: true,
        rawByteCount: 0,
      },
    } as unknown as LargeBlobReadEnvelope;

    expect(largeBlobListReport(list)).toBe(list.result);
    expect(largeBlobReadReport(read)).toBe(read.result);

    list.error = failureForCode(Code.CodeInternalError);
    read.error = failureForCode(Code.CodeInternalError);
    expect(largeBlobListReport(list)).toBeNull();
    expect(largeBlobReadReport(read)).toBeNull();
  });

  it("preserves a meaningful mutation preview on error but rejects the generated zero preview", () => {
    const capacity = {
      operationId: "op-capacity",
      selectionId: "authenticator-1",
      kind: OperationKind.OperationWriteLargeBlob,
      error: failureForCode(Code.CodeLargeBlobArrayTooLarge),
      result: {
        preview: {
          operation: MutationOperation.MutationCreate,
          serializedLargeBlobArraySizeBefore: 0,
          serializedLargeBlobArraySizeAfter: 2049,
          serializedLargeBlobArrayLimit: 0,
          warnings: [],
        },
        result: null,
      },
    } as unknown as LargeBlobMutationEnvelope;

    expect(largeBlobMutationPreview(capacity)?.serializedLargeBlobArraySizeAfter).toBe(2049);
    expect(largeBlobMutationPreview(capacity)?.serializedLargeBlobArrayLimit).toBe(0);
    expect(largeBlobMutationResult(capacity)).toBeNull();
    capacity.result!.preview.operation = MutationOperation.$zero;
    expect(largeBlobMutationPreview(capacity)).toBeNull();
  });

  it("extracts a completed large blob result only when the envelope itself succeeded", () => {
    const envelope = {
      kind: OperationKind.OperationDeleteLargeBlob,
      result: {
        preview: { operation: MutationOperation.MutationDelete },
        result: { operation: MutationOperation.MutationDelete, credentialIDHex: "cafe", noBlob: false },
      },
    } as LargeBlobMutationEnvelope;

    expect(largeBlobMutationResult(envelope)?.credentialIDHex).toBe("cafe");
    envelope.error = failureForCode(Code.CodeTransportFailure);
    expect(largeBlobMutationResult(envelope)).toBeNull();
  });

  it("extracts credential mutation previews and completed results without generic traversal", () => {
    const update = {
      kind: OperationKind.OperationUpdateCredentialUser,
      result: {
        preview: {
          credentialIDHex: "cafe",
          rpID: "example.test",
          current: { userIDHex: "01" },
          proposed: { userIDHex: "02" },
        },
        result: {
          deviceFingerprint: "dev-1",
          credentialIDHex: "cafe",
          rpID: "example.test",
          previous: { userIDHex: "01" },
          current: { userIDHex: "02" },
        },
      },
    } as CredentialUpdateEnvelope;
    const deletion = {
      kind: OperationKind.OperationDeleteCredential,
      result: {
        preview: { credentialIDHex: "cafe", rpID: "example.test" },
        result: { deviceFingerprint: "dev-1", credentialIDHex: "cafe", rpID: "example.test" },
      },
    } as CredentialDeleteEnvelope;

    expect(credentialUpdatePreview(update)?.proposed.userIDHex).toBe("02");
    expect(credentialUpdateResult(update)?.current.userIDHex).toBe("02");
    expect(credentialDeletePreview(deletion)?.credentialIDHex).toBe("cafe");
    expect(credentialDeleteResult(deletion)?.deviceFingerprint).toBe("dev-1");
  });

  it("extracts MakeCredential preview and completed result from its typed envelope", () => {
    const preview = new MakeCredentialPreview({
      device,
      input: new MakeCredentialInput({
        rp: { id: "example.com", name: "Example" },
        user: { id: "AQ==", name: "alice", displayName: "Alice" },
        pubKeyCredParams: [{ type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 }],
      }),
      warnings: [],
    });
    const result = new MakeCredentialResult({
      deviceFingerprint: "dev-1",
      rpID: "example.com",
      fmt: AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierPacked,
      credentialIDHex: "cafe",
      publicKeyCOSEHex: "a501",
      authenticatorDataHex: "0102",
      attestationObjectCBORHex: "a363",
      signCount: 0,
      userPresent: true,
      userVerified: false,
      enterpriseAttestation: false,
    });
    const envelope = new MakeCredentialEnvelope({
      operationId: "make-1",
      selectionId: "authenticator-1",
      kind: OperationKind.OperationMakeCredential,
      result: new MakeCredentialOutput({ preview, result }),
    });

    expect(makeCredentialPreview(envelope)).toBe(preview);
    expect(makeCredentialResult(envelope)).toBe(result);

    envelope.error = failureForCode(Code.CodeCredentialCreationDenied);
    expect(makeCredentialPreview(envelope)).toBeNull();
    expect(makeCredentialResult(envelope)).toBeNull();

    delete envelope.error;
    envelope.result!.result = null;
    expect(makeCredentialPreview(envelope)).toBe(preview);
    expect(makeCredentialResult(envelope)).toBeNull();
  });

  it("extracts GetAssertion result from its successful typed envelope", () => {
    const result = new GetAssertionResult({
      deviceFingerprint: "dev-1",
      rpID: "example.com",
      assertions: [],
    });
    const envelope = new GetAssertionEnvelope({
      operationId: "get-1",
      selectionId: "authenticator-1",
      kind: OperationKind.OperationGetAssertion,
      result: new GetAssertionOutput({ result }),
    });

    expect(getAssertionResult(envelope)).toBe(result);

    envelope.error = failureForCode(Code.CodeAssertionDenied);
    expect(getAssertionResult(envelope)).toBeNull();
    expect(getAssertionResult(null)).toBeNull();
  });
});
