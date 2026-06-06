import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../api/employees';

export function useEmployees() {
  return useQuery({ queryKey: ['employees'], queryFn: fetchEmployees });
}
