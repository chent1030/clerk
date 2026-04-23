import { authFetch } from "@/core/api/auth-fetch";

import type { Skill } from "./type";

export async function loadSkills() {
  const skills = await authFetch("/api/skills");
  const json = await skills.json();
  return json.skills as Skill[];
}

export async function enableSkill(skillName: string, enabled: boolean) {
  const response = await authFetch(`/api/skills/${skillName}`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
  return response.json();
}

export interface InstallSkillRequest {
  thread_id: string;
  path: string;
}

export interface InstallSkillResponse {
  success: boolean;
  skill_name: string;
  message: string;
}

export async function installSkill(
  request: InstallSkillRequest,
): Promise<InstallSkillResponse> {
  const response = await authFetch("/api/skills/install", {
    method: "POST",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData.detail ?? `HTTP ${response.status}: ${response.statusText}`;
    return { success: false, skill_name: "", message: errorMessage };
  }

  return response.json();
}
