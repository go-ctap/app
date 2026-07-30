import { describe, expect, it } from "vitest";

import { ExtensionIdentifier } from "../../bindings/github.com/go-ctap/ctap/extension";
import { Option } from "../../bindings/github.com/go-ctap/ctap/protocol";
import type { Info } from "../../bindings/github.com/go-ctap/kit/model/inspect";

import { authenticatorSupportsLabExtension } from "$lib/lab-extension-support";

describe("authenticatorSupportsLabExtension", () => {
  it.each([
    [[ExtensionIdentifier.ExtensionIdentifierLargeBlob], undefined, true],
    [
      [ExtensionIdentifier.ExtensionIdentifierLargeBlobKey],
      { [Option.OptionLargeBlobs]: true },
      true,
    ],
    [[ExtensionIdentifier.ExtensionIdentifierLargeBlobKey], undefined, false],
    [[ExtensionIdentifier.ExtensionIdentifierHMACSecret], undefined, false],
  ])("resolves direct and array-backed extension support", (extensions, options, expected) => {
    expect(
      authenticatorSupportsLabExtension(
        { extensions, options } as Info,
        ExtensionIdentifier.ExtensionIdentifierLargeBlob,
      ),
    ).toBe(expected);
  });
});
