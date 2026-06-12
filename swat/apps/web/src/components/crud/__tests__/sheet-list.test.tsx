import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  ALL_FILTER,
  FilterSelect,
  LoadMoreButton,
  SheetFilterBar,
  useWindowedList,
} from '../sheet-list';

describe('useWindowedList', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it('windows to the page size and reports the remainder', () => {
    const { result } = renderHook(() => useWindowedList(items, 'a', 10));
    expect(result.current.windowed).toHaveLength(10);
    expect(result.current.windowed[0]).toBe(0);
    expect(result.current.remaining).toBe(15);
  });

  it('loadMore grows the window by one page', () => {
    const { result } = renderHook(() => useWindowedList(items, 'a', 10));
    act(() => result.current.loadMore());
    expect(result.current.windowed).toHaveLength(20);
    expect(result.current.remaining).toBe(5);
  });

  it('resets to the first page when the reset key changes', () => {
    const { result, rerender } = renderHook(({ key }) => useWindowedList(items, key, 10), {
      initialProps: { key: 'a' },
    });
    act(() => result.current.loadMore());
    expect(result.current.windowed).toHaveLength(20);
    rerender({ key: 'b' });
    expect(result.current.windowed).toHaveLength(10);
    expect(result.current.remaining).toBe(15);
  });

  it('shows everything (remaining 0) when the list is shorter than a page', () => {
    const { result } = renderHook(() => useWindowedList([1, 2], 'a', 10));
    expect(result.current.windowed).toHaveLength(2);
    expect(result.current.remaining).toBe(0);
  });
});

describe('LoadMoreButton', () => {
  it('renders nothing when nothing remains', () => {
    const { container } = render(<LoadMoreButton remaining={0} onClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the remaining count and fires onClick', async () => {
    const onClick = vi.fn();
    render(<LoadMoreButton remaining={7} onClick={onClick} />);
    const button = screen.getByRole('button', { name: /muat lebih banyak \(7 lagi\)/i });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('SheetFilterBar', () => {
  it('renders its controls and the summary', () => {
    render(
      <SheetFilterBar summary="3 catatan">
        <button type="button">filter</button>
      </SheetFilterBar>,
    );
    expect(screen.getByRole('button', { name: 'filter' })).toBeInTheDocument();
    expect(screen.getByText('3 catatan')).toBeInTheDocument();
  });
});

describe('FilterSelect', () => {
  it('renders a combobox trigger', () => {
    render(
      <FilterSelect
        value={ALL_FILTER}
        onValueChange={vi.fn()}
        allLabel="Semua Status"
        options={[{ value: 'OPEN', label: 'Terbuka' }]}
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
