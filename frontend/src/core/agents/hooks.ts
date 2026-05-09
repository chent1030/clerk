import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadCurrentUsername } from "../auth";

import {
  createAgent,
  deleteAgent,
  getAgent,
  listAgents,
  updateAgent,
} from "./api";
import type { CreateAgentRequest, UpdateAgentRequest } from "./types";

const agentsQueryKey = (username: string | undefined) => [
  "agents",
  username ?? "anonymous",
] as const;

const agentQueryKey = (
  username: string | undefined,
  name: string | null | undefined,
) => ["agents", username ?? "anonymous", name] as const;

function useCurrentUsername() {
  return useQuery({
    queryKey: ["auth", "current-username"],
    queryFn: () => loadCurrentUsername(),
    gcTime: 0,
  });
}

export function useAgents() {
  const { data: username, isLoading: isUsernameLoading } = useCurrentUsername();
  const { data, isLoading, error } = useQuery({
    queryKey: agentsQueryKey(username),
    queryFn: () => listAgents(),
    enabled: !isUsernameLoading,
  });
  return {
    agents: data ?? [],
    isLoading: isUsernameLoading || isLoading,
    error,
  };
}

export function useAgent(name: string | null | undefined) {
  const { data: username, isLoading: isUsernameLoading } = useCurrentUsername();
  const { data, isLoading, error } = useQuery({
    queryKey: agentQueryKey(username, name),
    queryFn: () => getAgent(name!),
    enabled: !isUsernameLoading && !!name,
  });
  return {
    agent: data ?? null,
    isLoading: isUsernameLoading || isLoading,
    error,
  };
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { data: username } = useCurrentUsername();
  return useMutation({
    mutationFn: (request: CreateAgentRequest) => createAgent(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: agentsQueryKey(username),
      });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const { data: username } = useCurrentUsername();
  return useMutation({
    mutationFn: ({
      name,
      request,
    }: {
      name: string;
      request: UpdateAgentRequest;
    }) => updateAgent(name, request),
    onSuccess: (_data, { name }) => {
      void queryClient.invalidateQueries({
        queryKey: agentsQueryKey(username),
      });
      void queryClient.invalidateQueries({
        queryKey: agentQueryKey(username, name),
      });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const { data: username } = useCurrentUsername();
  return useMutation({
    mutationFn: (name: string) => deleteAgent(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: agentsQueryKey(username),
      });
    },
  });
}
