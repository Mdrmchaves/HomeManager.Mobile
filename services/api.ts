import { Config } from '../constants/config';

let authTokenGetter: (() => Promise<string | null>) | null = null;
let signOutHandler: (() => Promise<void>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter;
}

export function setSignOutHandler(handler: () => Promise<void>) {
  signOutHandler = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const t0 = Date.now();
  const token = authTokenGetter ? await authTokenGetter() : null;

  const t1 = Date.now();
  const response = await fetch(`${Config.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await signOutHandler?.();
      throw new Error('SESSION_EXPIRED');
    }
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
