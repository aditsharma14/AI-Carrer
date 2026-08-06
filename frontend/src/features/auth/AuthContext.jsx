import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from './api';
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

const AuthContext = createContext(null);

// Rarely-changing, cross-cutting global (current user) — exactly the case
// React Context is for. Everything else (resumes, jobs, candidates) is server
// state and goes through React Query instead.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous

  useEffect(() => {
    authApi
      .refresh()
      .then(async (data) => {
        setAccessToken(data.accessToken);
        const me = await authApi.me();
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        setStatus('anonymous');
      });
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const data = await authApi.signup(payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    clearAccessToken();
    setUser(null);
    setStatus('anonymous');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, signup, logout, hasToken: !!getAccessToken() }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook are co-located intentionally
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
