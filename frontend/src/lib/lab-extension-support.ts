import { ExtensionIdentifier } from "../../bindings/github.com/go-ctap/ctap/extension";
import { Option } from "../../bindings/github.com/go-ctap/ctap/protocol";
import type { Info } from "../../bindings/github.com/go-ctap/kit/model/inspect";

export function authenticatorSupportsLabExtension(
  info: Info,
  identifier: ExtensionIdentifier,
): boolean {
  const extensions = info.extensions ?? [];
  if (identifier !== ExtensionIdentifier.ExtensionIdentifierLargeBlob) {
    return extensions.includes(identifier);
  }

  const direct = extensions.includes(ExtensionIdentifier.ExtensionIdentifierLargeBlob);
  const arrayBacked = extensions.includes(ExtensionIdentifier.ExtensionIdentifierLargeBlobKey)
    && info.options?.[Option.OptionLargeBlobs] === true;

  return direct || arrayBacked;
}
