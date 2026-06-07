import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../api/employees';

export function useEmployees(page: number, pageSize: number, search = '', order: 'asc' | 'desc' = 'desc') {
  return useQuery({
    queryKey: ['employees', page, pageSize, search, order],
    queryFn: () => fetchEmployees(page, pageSize, search, order),
  });
}
