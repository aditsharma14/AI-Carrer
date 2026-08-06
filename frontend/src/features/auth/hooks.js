import { useMutation } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

// Thin useMutation wrappers around AuthContext methods — login/signup mutate
// global auth state (not the React Query cache), but routing through
// useMutation still gives LoginPage/SignupPage the same isPending/error shape
// every other form in the app uses.
export function useLogin() {
  const { login } = useAuth();
  return useMutation({ mutationFn: login });
}

export function useSignup() {
  const { signup } = useAuth();
  return useMutation({ mutationFn: signup });
}
