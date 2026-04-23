import { authFetch } from "@/core/api/auth-fetch";

import type { MCPConfig } from "./types";

export async function loadMCPConfig() {
  const response = await authFetch("/api/mcp/config");
  return response.json() as Promise<MCPConfig>;
}

export async function updateMCPConfig(config: MCPConfig) {
  const response = await authFetch("/api/mcp/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
  return response.json();
}
