import { describe, expect, it } from "vitest";
import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import type { OperationEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import type { LookupResult } from "../../bindings/github.com/go-ctap/kit/model/mds";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import { bioSensorReport, inspectResult, mdsLookupResult, operationEnvelopeLogData, operationError } from "./ctapkit-results";
import type { OverviewBioSensorReport, OverviewInspectResult } from "./overview-types";
import type { MDSLookupState } from "./stores";

const device: DeviceReport = {
  deviceId: "dev-1",
  stableId: true,
  transport: "hid" as DeviceReport["transport"],
  path: "path",
  vendorId: 1,
  productId: 2,
};

describe("ctapkit result extractors", () => {
  it("extracts the nested inspect result from an operation envelope", () => {
    const result: OverviewInspectResult = {
      device,
      info: {
        versions: ["FIDO_2_1" as Version],
        aaguid: "00000000-0000-0000-0000-000000000000",
        conformanceFindings: [],
      },
    };

    const envelope = { kind: OperationKind.OperationInspect, result: { result } } as OperationEnvelope;

    expect(inspectResult(envelope)).toBe(result);
  });

  it("does not extract inspect output from another operation kind", () => {
    const envelope = {
      kind: OperationKind.OperationBioSensorInfo,
      result: { result: { device, info: { versions: [], aaguid: "", conformanceFindings: [] } } },
    } as OperationEnvelope;

    expect(inspectResult(envelope)).toBeNull();
  });

  it("extracts the nested bio sensor report from an operation envelope", () => {
    const report: OverviewBioSensorReport = {
      device,
      supported: true,
      previewOnly: false,
      modality: "fingerprint",
    };

    const envelope = { kind: OperationKind.OperationBioSensorInfo, result: { report } } as OperationEnvelope;

    expect(bioSensorReport(envelope)).toBe(report);
  });

  it("summarizes operation log data without generic result sniffing", () => {
    const envelope = {
      operationId: "op-1",
      sessionId: "session-1",
      kind: OperationKind.OperationListCredentials,
      result: {
        report: {
          summary: { totalCredentials: 2 },
          groups: [{ rpID: "example.test" }],
        },
      },
    } as OperationEnvelope;

    expect(operationEnvelopeLogData(envelope)).toEqual({
      operationId: "op-1",
      sessionId: "session-1",
      kind: OperationKind.OperationListCredentials,
      result: {
        kind: OperationKind.OperationListCredentials,
        counts: {
          groups: 1,
          credentials: 2,
        },
      },
    });
  });

  it("uses typed MDS lookup state directly", () => {
    const result: LookupResult = {
      aaguid: "00000000-0000-0000-0000-000000000000",
      found: false,
      blobNumber: 1,
      source: "https://mds.example.test",
      cached: true,
      cachedAt: "2026-06-21T00:00:00Z",
    };
    const state: MDSLookupState = { result };

    expect(mdsLookupResult(state)).toBe(result);
    expect(operationError(state)).toBeNull();
  });
});
