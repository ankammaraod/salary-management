import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkUpload } from '../api/upload';
import type { BulkApiError } from '../types/upload';
import type { CreateEmployeeDto } from '../types/employee';

export function useUpload() {
  const queryClient = useQueryClient();
  return useMutation<{ inserted: number }, BulkApiError, CreateEmployeeDto[]>({
    mutationFn: bulkUpload,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}
