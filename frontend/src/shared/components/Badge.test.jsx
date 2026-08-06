import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Open</Badge>);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it.each(['neutral', 'success', 'warning', 'danger', 'info', 'ai', 'gradient'])(
    'renders the %s variant without crashing',
    (variant) => {
      render(<Badge variant={variant}>Status</Badge>);
      expect(screen.getByText('Status')).toBeInTheDocument();
    }
  );

  it('merges a custom className with the variant classes instead of replacing them', () => {
    render(<Badge className="ml-2">Status</Badge>);
    const badge = screen.getByText('Status');
    // bg-slate-100 comes from the default 'neutral' variant — asserting it
    // survived alongside the custom className proves cn() merged rather than
    // clobbered, which is the whole reason every shared component uses it.
    expect(badge.className).toContain('bg-slate-100');
    expect(badge.className).toContain('ml-2');
  });
});
