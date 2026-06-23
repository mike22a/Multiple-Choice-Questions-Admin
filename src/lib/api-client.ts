import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiClient(endpoint: string, options: FetchOptions = {}) {
  const { token, setAuth, clearAuth, setSessionExpired } = useAuthStore.getState();
  
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let url = `${API_URL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  let response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  // If 401 Unauthorized, try to refresh token silently using cookies
  if (response.status === 401 && endpoint !== '/api/auth/admin/login' && endpoint !== '/api/auth/admin/refresh') {
    try {
      const refreshRes = await fetch(`${API_URL}/api/auth/admin/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData?.data?.token || refreshData?.token;
        if (newToken) {
          const { profile } = useAuthStore.getState();
          if (profile) {
            setAuth(newToken, profile);
          }
          
          headers.set('Authorization', `Bearer ${newToken}`);
          response = await fetch(url, {
            credentials: 'include',
            ...options,
            headers,
          });
        }
      } else {
        setSessionExpired(true);
      }
    } catch (err) {
      setSessionExpired(true);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
