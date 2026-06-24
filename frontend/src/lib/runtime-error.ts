import type { ErrorCategory } from "../../bindings/github.com/go-ctap/kit/model";
import { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

export function runtimeErrorFrom(error: unknown): RuntimeErrorEnvelope {
  if (error instanceof RuntimeErrorEnvelope) return error;

  if (error instanceof Error) {
    return new RuntimeErrorEnvelope({ message: error.message });
  }

  const source = error && typeof error === "object" ? error as { category?: ErrorCategory; message?: unknown; error?: { message?: unknown } } : null;
  const message = stringMessage(source?.message)
    || stringMessage(source?.error?.message)
    || stringMessage(error)
    || "operation failed";

  return new RuntimeErrorEnvelope({
    category: source?.category,
    message,
  });
}

function stringMessage(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "";
}
