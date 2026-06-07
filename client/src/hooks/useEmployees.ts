import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../api/employees';

export function useEmployees(page: number, pageSize: number, search = '') {
  return useQuery({
    queryKey: ['employees', page, pageSize, search],
    queryFn: () => fetchEmployees(page, pageSize, search),
  });
}
