import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

function Harness({ onClose = vi.fn() } = {}) {
  return (
    <Modal open title="Confirm" onClose={onClose}>
      <button type="button">First</button>
      <button type="button">Last</button>
    </Modal>
  );
}

describe('Modal', () => {
  it('does not render when closed', () => {
    render(
      <Modal open={false} title="Confirm" onClose={vi.fn()}>
        content
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders as an accessible dialog when open', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Confirm');
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-focuses the first focusable element on open', async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus());
  });

  it('traps Tab focus inside the dialog (wraps from last back to first)', async () => {
    render(<Harness />);

    // Close / First / Last are the three focusable elements, in DOM order.
    const closeButton = screen.getByRole('button', { name: 'Close' });
    const lastButton = screen.getByRole('button', { name: 'Last' });

    lastButton.focus();
    expect(lastButton).toHaveFocus();

    await userEvent.tab();
    expect(closeButton).toHaveFocus();
  });
});
