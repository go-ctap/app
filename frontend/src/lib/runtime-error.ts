import type { ErrorCategory } from "../../bindings/github.com/go-ctap/kit/model";
import { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

export function runtimeErrorFrom(error: unknown): RuntimeErrorEnvelope {
  if (error instanceof RuntimeErrorEnvelope) return error;

  if (error instanceof Error) {
    const cause = runtimeErrorCause(error.cause);
    if (cause) return cause;
    return new RuntimeErrorEnvelope({ message: error.message });
  }

  return new RuntimeErrorEnvelope({ message: stringMessage(error) || "operation failed" });
}

function runtimeErrorCause(value: unknown) {
  if (value instanceof RuntimeErrorEnvelope) return value;
  if (!value || typeof value !== "object") return null;

  const cause = value as { category?: unknown; message?: unknown };
  const message = stringMessage(cause.message);
  if (!message) return null;

  return new RuntimeErrorEnvelope({
    category: typeof cause.category === "string" ? cause.category as ErrorCategory : undefined,
    message,
  });
}

function stringMessage(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "";
}
