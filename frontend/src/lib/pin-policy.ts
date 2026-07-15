import type { PINStatus } from "../../bindings/github.com/go-ctap/kit/model/config";

const DEFAULT_CLIENT_PIN_MAX_LENGTH = 63;

export function effectiveClientPINMaxLength(pin: PINStatus) {
  return pin.maxPINLength ?? DEFAULT_CLIENT_PIN_MAX_LENGTH;
}
