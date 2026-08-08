import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";

import { Kind as OperationKind } from "../../../../bindings/github.com/telesma-app/kit/model/operation";
import { Code, type Failure } from "../../../../bindings/github.com/telesma-app/kit/model/failure";
import type { ConfigStatusEnvelope } from "../../../../bindings/telesma/service";

import { failureForCode } from "$lib/test-support/failure";

import {
  beginSecurityResourceLoad,
  completeSecurityResourceLoad,
  failSecurityResourceLoadAtRuntime,
  failSecurityResourceLoadWithResponse,
  resetSecurityDeviceState,
  securitySensor,
  securityStatus,
} from "$lib/features/security/state";

describe("security state", () => {
  beforeEach(() => resetSecurityDeviceState());

  it("retains last-known-good status separately from a failed service response", () => {
    const successful = {
      operationId: "status-1",
      selectionId: "authenticator-1",
      kind: OperationKind.ConfigStatus,
      result: {},
    } as ConfigStatusEnvelope;
    const failed = {
      operationId: "status-2",
      selectionId: "authenticator-1",
      kind: OperationKind.ConfigStatus,
      error: failureForCode(Code.CodeOperationUnsupported),
    } as ConfigStatusEnvelope;

    beginSecurityResourceLoad(securityStatus);
    expect(get(securityStatus).phase).toBe("loading");

    completeSecurityResourceLoad(securityStatus, successful);
    beginSecurityResourceLoad(securityStatus);
    expect(get(securityStatus).phase).toBe("refreshing");

    failSecurityResourceLoadWithResponse(securityStatus, failed);
    expect(get(securityStatus)).toMatchObject({
      phase: "unsupported",
      lastSuccessfulEnvelope: successful,
      responseEnvelope: failed,
      runtimeError: null,
    });
  });

  it("keeps thrown runtime failures separate from generated envelopes", () => {
    const error: Failure = failureForCode(Code.CodeInternalError);

    failSecurityResourceLoadAtRuntime(securitySensor, error);

    expect(get(securitySensor)).toEqual({
      phase: "error",
      lastSuccessfulEnvelope: null,
      responseEnvelope: null,
      runtimeError: error,
    });
  });
});
