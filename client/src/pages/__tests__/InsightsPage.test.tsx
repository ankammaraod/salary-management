import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsightsPage from '../InsightsPage';

vi.mock('../../hooks/useInsights');
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
  Tooltip: () => null,
}));

import { useCountries, useInsights } from '../../hooks/useInsights';

const MOCK_INSIGHTS = {
  headcount: 3,
  genderBreakdown: { Male: 1, Female: 2, Other: 0 },
  employmentTypeBreakdown: { 'Full-time': 2, Contractor: 1 },
  avgSalary: 80000,
  minSalary: 70000,
  maxSalary: 90000,
  totalPayroll: 240000,
  departmentBreakdown: [{ department: 'Engineering', headcount: 2, avgSalary: 85000 }],
};

beforeEach(() => {
  vi.mocked(useCountries).mockReturnValue({
    data: ['Germany', 'USA'],
    isLoading: false,
    isError: false,
  } as any);
  vi.mocked(useInsights).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  } as any);
});

describe('InsightsPage', () => {
  it('renders the page title', () => {
    render(<InsightsPage />);
    expect(screen.getByText('Salary Insights')).toBeInTheDocument();
  });

  it('renders empty state before a country is selected', () => {
    render(<InsightsPage />);
    expect(screen.getByText('Select a country to view salary insights')).toBeInTheDocument();
  });

  it('does not show error alert when no country is selected', () => {
    vi.mocked(useInsights).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);
    render(<InsightsPage />);
    expect(screen.queryByText('Failed to load insights')).not.toBeInTheDocument();
  });
});
