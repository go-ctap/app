import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";

import { OperationKind } from "../../../../bindings/github.com/go-ctap/kit/model";
import { Code, type Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  BioSensorEnvelope,
  ConfigStatusEnvelope,
} from "../../../../bindings/fidobench/service";

import { failureForCode } from "../../test-failure";

import {
  beginSecurityStatusLoad,
  completeSecurityStatusLoad,
  failSecurityBioSensorLoadAtRuntime,
  failSecurityStatusLoadWithResponse,
  resetSecurityStateForTest,
  securitySensor,
  securityStatus,
} from "./state";

describe("security state", () => {
  beforeEach(() => resetSecurityStateForTest());

  it("retains last-known-good status separately from a failed service response", () => {
    const successful = {
      operationId: "status-1",
      selectionId: "authenticator-1",
      kind: OperationKind.OperationConfigStatus,
      result: { report: {} },
    } as ConfigStatusEnvelope;
    const failed = {
      operationId: "status-2",
      selectionId: "authenticator-1",
      kind: OperationKind.OperationConfigStatus,
      error: failureForCode(Code.CodeOperationUnsupported),
    } as ConfigStatusEnvelope;

    beginSecurityStatusLoad();
    expect(get(securityStatus).phase).toBe("loading");

    completeSecurityStatusLoad(successful);
    beginSecurityStatusLoad();
    expect(get(securityStatus).phase).toBe("refreshing");

    failSecurityStatusLoadWithResponse(failed);
    expect(get(securityStatus)).toMatchObject({
      phase: "unsupported",
      lastSuccessfulEnvelope: successful,
      responseEnvelope: failed,
      runtimeError: null,
    });
  });

  it("keeps thrown runtime failures separate from generated envelopes", () => {
    const error: Failure = failureForCode(Code.CodeInternalError);

    failSecurityBioSensorLoadAtRuntime(error);

    expect(get(securitySensor)).toEqual({
      phase: "error",
      lastSuccessfulEnvelope: null,
      responseEnvelope: null,
      runtimeError: error,
    });
  });

  it("types biometric sensor state with the generated envelope contract", () => {
    const envelope = {
      operationId: "sensor-1",
      selectionId: "authenticator-1",
      kind: OperationKind.OperationBioSensorInfo,
    } as BioSensorEnvelope;

    securitySensor.update((current) => ({ ...current, responseEnvelope: envelope }));

    expect(get(securitySensor).responseEnvelope).toBe(envelope);
  });
});
