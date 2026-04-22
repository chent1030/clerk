import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDepartmentTree, createDepartment, updateDepartment, deleteDepartment } from '../api/departments';

export function useDepartmentTree() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: getDepartmentTree,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; parent_id?: string }) => createDepartment(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; parent_id?: string } }) =>
      updateDepartment(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); },
  });
}
