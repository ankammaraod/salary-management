import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../api/employees';

export function useEmployees(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['employees', page, pageSize],
    queryFn: () => fetchEmployees(page, pageSize),
  });
}
