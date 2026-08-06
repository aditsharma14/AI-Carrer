import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '../../features/auth/tokenStore';
import { getActiveOrgId } from '../../features/organizations/orgStore';
import { toApiError } from './apiError';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // refresh token travels as an httpOnly cookie
});

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const orgId = getActiveOrgId();
  if (orgId) config.headers['X-Org-Id'] = orgId;

  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  // Dedupe concurrent 401s into a single refresh call instead of firing one
  // refresh request per failed request.
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return axiosClient(original);
      } catch {
        clearAccessToken();
        window.location.assign('/login');
        return Promise.reject(toApiError(error));
      }
    }
    return Promise.reject(toApiError(error));
  }
);
