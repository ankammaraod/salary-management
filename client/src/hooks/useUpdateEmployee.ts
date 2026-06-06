import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEmployee } from '../api/employees';
import type { CreateEmployeeDto } from '../types/employee';

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CreateEmployeeDto }) => updateEmployee(id, dto),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
  });
}
