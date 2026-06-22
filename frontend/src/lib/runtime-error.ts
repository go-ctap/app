import type { ErrorCategory } from "../../bindings/github.com/go-ctap/kit/model";
import { RuntimeErrorEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

export function runtimeErrorFrom(error: unknown): RuntimeErrorEnvelope {
  const source = error as { category?: ErrorCategory; message?: string; error?: { message?: string } };
  const nestedMessage = source.error ? source.error.message : "";
  return new RuntimeErrorEnvelope({
    category: source.category,
    message: source.message || nestedMessage || (error instanceof Error ? error.message : String(error || "operation failed")),
  });
}
