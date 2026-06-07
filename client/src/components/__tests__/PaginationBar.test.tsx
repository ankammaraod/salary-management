import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaginationBar from '../PaginationBar';

function renderBar(overrides: {
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
} = {}) {
  const onPageChange = overrides.onPageChange ?? vi.fn();
  const onPageSizeChange = overrides.onPageSizeChange ?? vi.fn();
  render(
    <PaginationBar
      page={overrides.page ?? 1}
      pageSize={overrides.pageSize ?? 20}
      total={overrides.total ?? 500}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />,
  );
  return { onPageChange, onPageSizeChange };
}

describe('PaginationBar', () => {
  it('shows range "1–20 of 500" on page 1 with pageSize 20', () => {
    renderBar();
    expect(screen.getByText('1–20 of 500')).toBeInTheDocument();
  });

  it('shows range "21–40 of 500" on page 2', () => {
    renderBar({ page: 2 });
    expect(screen.getByText('21–40 of 500')).toBeInTheDocument();
  });

  it('caps end at total on last page "481–500 of 500"', () => {
    renderBar({ page: 25, pageSize: 20, total: 500 });
    expect(screen.getByText('481–500 of 500')).toBeInTheDocument();
  });

  it('disables prev button on page 1', () => {
    renderBar({ page: 1 });
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
  });

  it('disables next button on last page', () => {
    renderBar({ page: 25, pageSize: 20, total: 500 });
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('enables prev button on page 2', () => {
    renderBar({ page: 2 });
    expect(screen.getByRole('button', { name: /previous page/i })).not.toBeDisabled();
  });

  it('enables next button when more pages remain', () => {
    renderBar({ page: 1, pageSize: 20, total: 500 });
    expect(screen.getByRole('button', { name: /next page/i })).not.toBeDisabled();
  });

  it('calls onPageChange(page - 1) when prev is clicked', () => {
    const { onPageChange } = renderBar({ page: 3 });
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange(page + 1) when next is clicked', () => {
    const { onPageChange } = renderBar({ page: 3 });
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});
