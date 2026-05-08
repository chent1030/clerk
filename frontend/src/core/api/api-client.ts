"use client";

import { Client as LangGraphClient } from "@langchain/langgraph-sdk/client";

import { getLangGraphBaseURL } from "../config";

import { authFetch } from "./auth-fetch";
import { sanitizeRunStreamOptions } from "./stream-mode";

function createCompatibleClient(isMock?: boolean): LangGraphClient {
  const client = new LangGraphClient({
    apiUrl: getLangGraphBaseURL(isMock),
    callerOptions: {
      fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
    },
  });

  const originalRunStream = client.runs.stream.bind(client.runs);
  client.runs.stream = ((threadId, assistantId, payload) =>
    originalRunStream(
      threadId,
      assistantId,
      sanitizeRunStreamOptions(payload),
    )) as typeof client.runs.stream;

  const originalJoinStream = client.runs.joinStream.bind(client.runs);
  client.runs.joinStream = ((threadId, runId, options) =>
    originalJoinStream(
      threadId,
      runId,
      sanitizeRunStreamOptions(options),
    )) as typeof client.runs.joinStream;

  if (!isMock) {
    client.threads.getHistory = (async (threadId, options) => {
      const response = await authFetch(
        `/api/threads/${encodeURIComponent(threadId)}/history`,
        {
          method: "POST",
          body: JSON.stringify({
            limit: options?.limit ?? 10,
            before: options?.before,
            metadata: options?.metadata,
            checkpoint: options?.checkpoint,
          }),
          signal: options?.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch thread history: ${response.status}`);
      }

      return response.json();
    }) as typeof client.threads.getHistory;
  }

  return client;
}

const _clients = new Map<string, LangGraphClient>();
export function getAPIClient(isMock?: boolean): LangGraphClient {
  const cacheKey = isMock ? "mock" : "default";
  let client = _clients.get(cacheKey);

  if (!client) {
    client = createCompatibleClient(isMock);
    _clients.set(cacheKey, client);
  }

  return client;
}
