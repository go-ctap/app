import { describe, expect, it } from "vitest";

import {
  Category,
  Code,
  Failure,
} from "../../bindings/github.com/go-ctap/kit/model/failure";

import { failureMessage, runtimeFailureFrom } from "./failure.js";

describe("runtimeFailureFrom", () => {
  it("extracts the machine-readable code from the Wails Error cause", () => {
    const error = new Error("CtapkitService.Session failed", {
      cause: {
        code: Code.CodeSessionClosed,
        category: Category.CategoryInvalidSession,
        operation: "session.open",
      },
    });

    expect(runtimeFailureFrom(error)).toEqual(new Failure({
      code: Code.CodeSessionClosed,
      category: Category.CategoryInvalidSession,
    }));
  });

  it("drops non-contract and potentially sensitive Wails cause fields", () => {
    const error = new Error(Code.CodePINInvalid, {
      cause: {
        code: Code.CodePINInvalid,
        category: Category.CategoryInvalidState,
        message: "PIN 123456",
        pinUvAuthToken: "secret-token",
        params: { pin: "123456" },
        related: [{ code: Code.CodeInternalError, message: "reset phrase" }],
      },
    });

    const failure = runtimeFailureFrom(error);

    expect(failure).toEqual(new Failure({
      code: Code.CodePINInvalid,
      category: Category.CategoryInvalidState,
    }));
    expect(JSON.stringify(failure)).not.toMatch(/123456|secret-token|reset phrase/);
  });

  it("accepts a machine-readable code as the Wails fallback message", () => {
    expect(runtimeFailureFrom(new Error(Code.CodeOperationTimeout))).toEqual(new Failure({
      code: Code.CodeOperationTimeout,
      category: Category.CategoryTimeout,
    }));
  });

  it.each([
    "fetch MDS blob: network timeout",
    "PIN 123456",
    "pinUvAuthToken=secret",
    "reset phrase: factory reset",
  ])("does not expose unknown or sensitive prose: %s", (message) => {
    const failure = runtimeFailureFrom(new Error(message));

    expect(failure).toEqual(new Failure({
      code: Code.CodeInternalError,
      category: Category.CategoryInternal,
    }));
    expect(JSON.stringify(failure)).not.toContain(message);
  });

  it("localizes failures by code instead of rendering runtime prose", () => {
    expect(failureMessage(new Failure({
      code: Code.CodeOperationTimeout,
      category: Category.CategoryTimeout,
    }))).toBe("The operation timed out.");
  });
});
