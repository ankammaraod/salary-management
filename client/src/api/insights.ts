import type { InsightsDto } from '../types/insights';

async function parseError(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error ?? `request failed with status ${res.status}`);
}

export async function fetchCountries(): Promise<string[]> {
  const res = await fetch('/api/insights/countries');
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchInsights(country: string): Promise<InsightsDto> {
  const params = new URLSearchParams({ country });
  const res = await fetch(`/api/insights?${params}`);
  if (!res.ok) await parseError(res);
  return res.json();
}
