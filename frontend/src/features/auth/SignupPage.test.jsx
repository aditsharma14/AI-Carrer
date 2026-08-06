import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignupPage } from './SignupPage';
import { AuthProvider } from './AuthContext';
import { authApi } from './api';

// AuthProvider calls authApi.refresh()/me() on mount, and SignupPage submits
// through authApi.signup() — mocking the API module (not axios itself) keeps
// this a real render of the actual form/validation/context wiring without
// hitting a network that doesn't exist in this environment.
vi.mock('./api', () => ({
  authApi: {
    refresh: vi.fn(),
    me: vi.fn(),
    signup: vi.fn(),
  },
}));

function renderSignupPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <SignupPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SignupPage', () => {
  beforeEach(() => {
    authApi.refresh.mockRejectedValue(new Error('no session'));
    authApi.signup.mockReset();
  });

  it('defaults to the "job seeking" role and labels the workspace field accordingly', () => {
    renderSignupPage();
    expect(screen.getByText('A name for your workspace')).toBeInTheDocument();
  });

  it('relabels the workspace field when the "I\'m hiring" role is selected', async () => {
    renderSignupPage();

    await userEvent.click(screen.getByRole('button', { name: "I'm hiring" }));

    expect(screen.getByText('Company name')).toBeInTheDocument();
    expect(screen.queryByText('A name for your workspace')).not.toBeInTheDocument();
  });

  it('shows zod validation errors instead of submitting when required fields are empty', async () => {
    renderSignupPage();

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(authApi.signup).not.toHaveBeenCalled();
  });

  it('submits valid input through authApi.signup', async () => {
    authApi.signup.mockResolvedValue({
      accessToken: 'token',
      user: { id: '1', name: 'Jane Doe', email: 'jane@example.com' },
    });

    renderSignupPage();

    await userEvent.type(screen.getByLabelText('Full name'), 'Jane Doe');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('A name for your workspace'), 'My Workspace');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(authApi.signup).toHaveBeenCalledTimes(1));
    expect(authApi.signup).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane Doe', email: 'jane@example.com', role: 'seeker' })
    );
  });
});
