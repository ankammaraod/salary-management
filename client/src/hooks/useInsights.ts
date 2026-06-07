import { useQuery } from '@tanstack/react-query';
import { fetchCountries, fetchInsights } from '../api/insights';
import type { InsightsDto } from '../types/insights';

export function useCountries() {
  return useQuery<string[]>({
    queryKey: ['insights', 'countries'],
    queryFn: fetchCountries,
  });
}

export function useInsights(country: string) {
  return useQuery<InsightsDto>({
    queryKey: ['insights', country],
    queryFn: () => fetchInsights(country),
    enabled: !!country,
  });
}
