import { authFetch } from "../api/auth-fetch";

import type { Model } from "./types";

export async function loadModels() {
  const res = await authFetch("/api/models");
  const { models } = (await res.json()) as { models: Model[] };
  return models;
}
