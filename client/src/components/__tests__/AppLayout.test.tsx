import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '../AppLayout';

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter initialEntries={['/employees']}>{ui}</MemoryRouter>);
}

describe('AppLayout', () => {
  it('renders the product name', () => {
    renderWithRouter(<AppLayout><div>content</div></AppLayout>);
    expect(screen.getByText('ACME Salary Management')).toBeInTheDocument();
  });

  it('renders the Employees nav link', () => {
    renderWithRouter(<AppLayout><div>content</div></AppLayout>);
    expect(screen.getByText('Employees')).toBeInTheDocument();
  });

  it('renders children in the page area', () => {
    renderWithRouter(<AppLayout><div>page content</div></AppLayout>);
    expect(screen.getByText('page content')).toBeInTheDocument();
  });
});
