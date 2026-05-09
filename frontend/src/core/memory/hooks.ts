import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadCurrentUsername } from "../auth";

import {
  clearMemory,
  createMemoryFact,
  deleteMemoryFact,
  importMemory,
  loadMemory,
  updateMemoryFact,
} from "./api";
import type {
  MemoryFactInput,
  MemoryFactPatchInput,
  UserMemory,
} from "./types";

const memoryQueryKey = (username: string | undefined) => [
  "memory",
  username ?? "anonymous",
] as const;

function useCurrentUsername() {
  return useQuery({
    queryKey: ["auth", "current-username"],
    queryFn: () => loadCurrentUsername(),
    gcTime: 0,
  });
}

export function useMemory() {
  const { data: username, isLoading: isUsernameLoading } = useCurrentUsername();
  const { data, isLoading, error } = useQuery({
    queryKey: memoryQueryKey(username),
    queryFn: () => loadMemory(),
    enabled: !isUsernameLoading,
  });
  return {
    memory: data ?? null,
    isLoading: isUsernameLoading || isLoading,
    error,
  };
}

export function useClearMemory() {
  const queryClient = useQueryClient();
  const { data: username } = useCurrentUsername();

  return useMutation({
    mutationFn: () => clearMemory(),
    onSuccess: (memory) => {
      queryClient.setQueryData<UserMemory>(memoryQueryKey(username), memory);
    },
  });
}

export function useDeleteMemoryFact() {
  const queryClient = useQueryClient();
  const { data: username } = useCurrentUsername();

  return useMutation({
    mutationFn: (factId: string) => deleteMemoryFact(factId),
    onSuccess: (memory) => {
      queryClient.setQueryData<UserMemory>(memoryQueryKey(username), memory);
    },
  });
}

export function useImportMemory() {
  const queryClient = useQueryClient();
  const { data: username } = useCurrentUsername();

  return useMutation({
    mutationFn: (memory: UserMemory) => importMemory(memory),
    onSuccess: (memory) => {
      queryClient.setQueryData<UserMemory>(memoryQueryKey(username), memory);
    },
  });
}

export function useCreateMemoryFact() {
  const queryClient = useQueryClient();
  const { data: username } = useCurrentUsername();

  return useMutation({
    mutationFn: (input: MemoryFactInput) => createMemoryFact(input),
    onSuccess: (memory) => {
      queryClient.setQueryData<UserMemory>(memoryQueryKey(username), memory);
    },
  });
}

export function useUpdateMemoryFact() {
  const queryClient = useQueryClient();
  const { data: username } = useCurrentUsername();

  return useMutation({
    mutationFn: ({
      factId,
      input,
    }: {
      factId: string;
      input: MemoryFactPatchInput;
    }) => updateMemoryFact(factId, input),
    onSuccess: (memory) => {
      queryClient.setQueryData<UserMemory>(memoryQueryKey(username), memory);
    },
  });
}
