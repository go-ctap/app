import { describe, expect, it } from "vitest";

import { AttestationStatementFormatIdentifier } from "../../bindings/github.com/go-ctap/ctap/attestation";
import { PublicKeyCredentialType } from "../../bindings/github.com/go-ctap/ctap/credential";
import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import {
  Assessment,
  type Result as InspectResult,
} from "../../bindings/github.com/go-ctap/kit/model/inspect";
import {
  AuthenticatorConfigOperation,
  BioModality,
  BioMutationOperation,
  StateValue,
  type BioSensorReport,
} from "../../bindings/github.com/go-ctap/kit/model/config";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { MutationOperation } from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
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
  type LargeBlobDecodeEnvelope,
  type LargeBlobListEnvelope,
  type LargeBlobMutationEnvelope,
  type LargeBlobReadEnvelope,
  type ResetFactoryEnvelope,
} from "../../bindings/telesma/service";
import {
  GetAssertionOutput,
  GetAssertionResult,
  MakeCredentialOutput,
  MakeCredentialInput,
  MakeCredentialPreview,
  MakeCredentialResult,
} from "../../bindings/github.com/go-ctap/kit/model/webauthn";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { failureForCode } from "$lib/test-support/failure";

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
  largeBlobDecodeResult,
  largeBlobListReport,
  largeBlobMutationPreview,
  largeBlobMutationResult,
  largeBlobReadReport,
  makeCredentialPreview,
  makeCredentialResult,
  resetFactoryPreview,
  resetFactoryResult,
} from "$lib/ctapkit-results";

const device = new DeviceReport({
  attachment: {
    id: "dev-1",
    transport: Mode.ModeHID,
    usb: { vendorId: 1, productId: 2 },
  },
});

describe("ctapkit result extractors", () => {
  it("extracts a local large blob decode result", () => {
    const result = { mode: "json", value: { hello: true } };

    expect(largeBlobDecodeResult({ result } as LargeBlobDecodeEnvelope)).toBe(result);
    expect(largeBlobDecodeResult({ error: failureForCode(Code.CodeInternalError) })).toBeNull();
  });

  it("extracts the direct inspect result from an operation envelope", () => {
    const result: InspectResult = {
      device,
      info: {
        versions: ["FIDO_2_1" as Version],
        aaguid: "00000000-0000-0000-0000-000000000000",
        assessment: new Assessment(),
        conformance: new Report(),
      },
    };

    const envelope = { kind: OperationKind.Inspect, result } as unknown as InspectEnvelope;

    expect(inspectResult(envelope)).toBe(result);
  });

  it("extracts the direct bio sensor report from an operation envelope", () => {
    const report: BioSensorReport = {
      device,
      supported: true,
      previewOnly: false,
      modality: BioModality.BioModalityFingerprint,
    };

    const envelope = {
      kind: OperationKind.BioSensorInfo,
      result: report,
    } as unknown as BioSensorEnvelope;

    expect(bioSensorReport(envelope)).toBe(report);
  });

  it("extracts config status and biometric inventory only from successful envelopes", () => {
    const status = {
      kind: OperationKind.ConfigStatus,
      result: {
        device,
        pin: { state: StateValue.StateConfigured },
        bio: { state: StateValue.StateSupported },
      },
    } as unknown as ConfigStatusEnvelope;
    const list = {
      kind: OperationKind.BioList,
      result: {
        device,
        supported: true,
        previewOnly: false,
        enrollments: [{ templateIDHex: "cafe", friendlyName: "Right index" }],
      },
    } as unknown as BioListEnvelope;

    expect(configStatusReport(status)).toBe(status.result);
    expect(bioListReport(list)).toBe(list.result);

    expect(
      configStatusReport({
        kind: OperationKind.ConfigStatus,
        error: failureForCode(Code.CodeInternalError),
      } as ConfigStatusEnvelope),
    ).toBeNull();
    expect(
      bioListReport({
        kind: OperationKind.BioList,
        error: failureForCode(Code.CodeInternalError),
      } as BioListEnvelope),
    ).toBeNull();
  });

  it("extracts generated security previews", () => {
    const authenticatorConfig = {
      kind: OperationKind.SetAlwaysUV,
      result: {
        preview: { operation: AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV },
        result: null,
      },
    } as unknown as AuthenticatorConfigEnvelope;
    const enroll = {
      kind: OperationKind.BioEnroll,
      result: {
        preview: { mode: PreviewMode.PreviewModeDryRun },
        result: null,
      },
    } as unknown as BioEnrollEnvelope;
    const bioMutation = {
      kind: OperationKind.BioRename,
      result: {
        preview: { operation: BioMutationOperation.BioMutationRename },
        result: null,
      },
    } as unknown as BioMutationEnvelope;
    const reset = {
      kind: OperationKind.ResetFactory,
      result: {
        preview: { mode: PreviewMode.PreviewModeDryRun },
        result: null,
      },
    } as unknown as ResetFactoryEnvelope;

    expect(authenticatorConfigPreview(authenticatorConfig)).toBe(
      authenticatorConfig.result!.preview,
    );
    expect(bioEnrollPreview(enroll)).toBe(enroll.result!.preview);
    expect(bioMutationPreview(bioMutation)).toBe(bioMutation.result!.preview);
    expect(resetFactoryPreview(reset)).toBe(reset.result!.preview);
  });

  it("extracts generated security mutation results", () => {
    const authenticatorConfig = {
      kind: OperationKind.SetMinPINLength,
      result: {
        preview: { operation: AuthenticatorConfigOperation.AuthenticatorConfigMinPINLength },
        result: {
          operation: AuthenticatorConfigOperation.AuthenticatorConfigMinPINLength,
          attachmentId: "dev-1",
        },
      },
    } as unknown as AuthenticatorConfigEnvelope;
    const enroll = {
      kind: OperationKind.BioEnroll,
      result: {
        preview: { mode: PreviewMode.PreviewModeExecute },
        result: {
          attachmentId: "dev-1",
          templateIDHex: "",
          samples: [{ status: "good" }],
          remainingSamples: 2,
        },
      },
    } as unknown as BioEnrollEnvelope;
    const bioMutation = {
      kind: OperationKind.BioRemove,
      result: {
        preview: { operation: BioMutationOperation.BioMutationRemove },
        result: {
          operation: BioMutationOperation.BioMutationRemove,
          attachmentId: "dev-1",
          templateIDHex: "cafe",
        },
      },
    } as unknown as BioMutationEnvelope;
    const reset = {
      kind: OperationKind.ResetFactory,
      result: {
        preview: { mode: PreviewMode.PreviewModeExecute },
        result: { attachmentId: "dev-1", reset: true },
      },
    } as unknown as ResetFactoryEnvelope;

    expect(authenticatorConfigResult(authenticatorConfig)).toBe(authenticatorConfig.result!.result);
    expect(bioEnrollResult(enroll)).toBe(enroll.result!.result);
    expect(bioMutationResult(bioMutation)).toBe(bioMutation.result!.result);
    expect(resetFactoryResult(reset)).toBe(reset.result!.result);
  });

  it("extracts typed large blob list and read reports only from successful envelopes", () => {
    const list = {
      kind: OperationKind.ListLargeBlobs,
      result: {
        device,
        support: { largeBlobs: true, largeBlobKeyExtension: true },
        array: {
          read: true,
          blobCount: 1,
          matchedBlobCount: 1,
          orphanedBlobCount: 0,
          nonconformingBlobCount: 0,
          corruptBlobCount: 0,
        },
        entries: [],
      },
    } as unknown as LargeBlobListEnvelope;
    const read = {
      kind: OperationKind.ReadLargeBlob,
      result: {
        device,
        target: { credentialIDHex: "cafe", rp: { id: "example.test" }, user: {} },
        state: "present",
        rawByteCount: 0,
      },
    } as unknown as LargeBlobReadEnvelope;

    expect(largeBlobListReport(list)).toBe(list.result);
    expect(largeBlobReadReport(read)).toBe(read.result);

    expect(
      largeBlobListReport({
        kind: OperationKind.ListLargeBlobs,
        error: failureForCode(Code.CodeInternalError),
      } as LargeBlobListEnvelope),
    ).toBeNull();
    expect(
      largeBlobReadReport({
        kind: OperationKind.ReadLargeBlob,
        error: failureForCode(Code.CodeInternalError),
      } as LargeBlobReadEnvelope),
    ).toBeNull();
  });

  it("extracts a large blob preview", () => {
    const capacity = {
      operationId: "op-capacity",
      selectionId: "authenticator-1",
      kind: OperationKind.WriteLargeBlob,
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
  });

  it("extracts a completed large blob result", () => {
    const envelope = {
      kind: OperationKind.DeleteLargeBlob,
      result: {
        preview: { operation: MutationOperation.MutationDelete },
        result: {
          operation: MutationOperation.MutationDelete,
          credentialIDHex: "cafe",
          noBlob: false,
        },
      },
    } as LargeBlobMutationEnvelope;

    expect(largeBlobMutationResult(envelope)?.credentialIDHex).toBe("cafe");
  });

  it("extracts credential mutation previews and completed results without generic traversal", () => {
    const update = {
      kind: OperationKind.UpdateCredentialUser,
      result: {
        preview: {
          credentialIDHex: "cafe",
          rpID: "example.test",
          current: { userIDHex: "01" },
          proposed: { userIDHex: "02" },
        },
        result: {
          attachmentId: "dev-1",
          credentialIDHex: "cafe",
          rpID: "example.test",
          previous: { userIDHex: "01" },
          current: { userIDHex: "02" },
        },
      },
    } as CredentialUpdateEnvelope;
    const deletion = {
      kind: OperationKind.DeleteCredential,
      result: {
        preview: { credentialIDHex: "cafe", rpID: "example.test" },
        result: { attachmentId: "dev-1", credentialIDHex: "cafe", rpID: "example.test" },
      },
    } as CredentialDeleteEnvelope;

    expect(credentialUpdatePreview(update)?.proposed.userIDHex).toBe("02");
    expect(credentialUpdateResult(update)?.current.userIDHex).toBe("02");
    expect(credentialDeletePreview(deletion)?.credentialIDHex).toBe("cafe");
    expect(credentialDeleteResult(deletion)?.attachmentId).toBe("dev-1");
  });

  it("extracts MakeCredential preview and completed result from its typed envelope", () => {
    const preview = new MakeCredentialPreview({
      device,
      input: new MakeCredentialInput({
        rp: { id: "example.com", name: "Example" },
        user: { id: "AQ==", name: "alice", displayName: "Alice" },
        pubKeyCredParams: [
          { type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 },
        ],
      }),
      warnings: [],
    });
    const result = new MakeCredentialResult({
      attachmentId: "dev-1",
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
      kind: OperationKind.MakeCredential,
      result: new MakeCredentialOutput({ preview, result }),
    });

    expect(makeCredentialPreview(envelope)).toBe(preview);
    expect(makeCredentialResult(envelope)).toBe(result);

    envelope.result!.result = null;
    expect(makeCredentialPreview(envelope)).toBe(preview);
    expect(makeCredentialResult(envelope)).toBeNull();
  });

  it("extracts GetAssertion result from its successful typed envelope", () => {
    const result = new GetAssertionResult({
      attachmentId: "dev-1",
      rpID: "example.com",
      assertions: [],
    });
    const envelope = new GetAssertionEnvelope({
      operationId: "get-1",
      selectionId: "authenticator-1",
      kind: OperationKind.GetAssertion,
      result: new GetAssertionOutput({ result }),
    });

    expect(getAssertionResult(envelope)).toBe(result);

    expect(getAssertionResult(null)).toBeNull();
  });
});
