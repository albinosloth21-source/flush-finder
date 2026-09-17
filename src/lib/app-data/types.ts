export const CONNECTOR_TOKEN_HEADER = "x-connector-access-token";
export const CONNECTOR_TOKEN_PENDING_CODE = "connector_token_pending";
export const CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";

export const ConnectorType = {
  GoogleDrive: "GoogleDrive",
  Gmail: "Gmail",
  GoogleCalendar: "GoogleCalendar",
  Outlook: "Outlook",
  OutlookCalendar: "OutlookCalendar",
  MicrosoftTeams: "MicrosoftTeams",
  Mcp: "Mcp",
} as const;

export type ConnectorTypeName = (typeof ConnectorType)[keyof typeof ConnectorType];

export type CallToolResult<T = unknown> = {
  ok: boolean;
  data: T | null;
  errorMessage?: string;
  loginRequired?: boolean;
  loginUrl?: string;
  pending?: boolean;
};
