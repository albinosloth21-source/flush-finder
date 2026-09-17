import type { CallToolResult } from "./types.ts";
import { isConnectorPending, isLoginRequired } from "./login.ts";

export type CallToolErrorKind = "pending" | "login" | "not_connected" | "scope_denied" | "access_denied" | "error";

export type CallToolErrorState = {
  kind: CallToolErrorKind;
  message: string;
  detail?: string;
};

export function classifyCallToolError(result: CallToolResult): CallToolErrorState | null {
  if (result.ok) return null;
  const detail = result.errorMessage || undefined;
  const raw = (result.errorMessage ?? "").toLowerCase();
  if (isConnectorPending(result)) return { kind: "pending", message: "Connecting to your data…", detail };
  if (isLoginRequired(result)) return { kind: "login", message: "Continue with Grok to load your data.", detail };
  return { kind: "error", message: detail ?? "Something went wrong. Try again.", detail };
}
