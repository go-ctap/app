import { describe, expect, it } from "vitest";

import { ErrorCategory } from "../../bindings/github.com/go-ctap/kit/model";
import { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { runtimeErrorFrom } from "./runtime-error";

describe("runtimeErrorFrom", () => {
  it("keeps RuntimeErrorEnvelope messages unchanged", () => {
    const envelope = new RuntimeErrorEnvelope({
      category: ErrorCategory.ErrorTransportFailure,
      message: "ctapkit: fetch MDS blob: unexpected HTTP status 429 Too Many Requests",
    });

    expect(runtimeErrorFrom(envelope)).toMatchObject({
      category: "transport-failure",
      message: "ctapkit: fetch MDS blob: unexpected HTTP status 429 Too Many Requests",
    });
  });

  it("keeps Error messages unchanged when bridging catch values", () => {
    expect(runtimeErrorFrom(new Error("fetch MDS blob: network timeout")).message)
      .toBe("fetch MDS blob: network timeout");
  });

  it("extracts the typed service error from the Wails Error cause", () => {
    const error = new Error("CtapkitService.Session failed", {
      cause: {
        category: ErrorCategory.ErrorInvalidSession,
        message: "session closed",
      },
    });

    expect(runtimeErrorFrom(error)).toMatchObject({
      category: "invalid-session",
      message: "session closed",
    });
  });
});
