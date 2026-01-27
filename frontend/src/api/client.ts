type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

let logoutCallback: (() => void) | null = null;

export function setLogoutCallback(callback: () => void) {
  logoutCallback = callback;
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getUsername(): string | null {
  return localStorage.getItem('username');
}

export function setUsername(username: string | null) {
  if (username) {
    localStorage.setItem('username', username);
  } else {
    localStorage.removeItem('username');
  }
}

export async function api<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  const token = getToken();
  if (token && !skipAuth) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && !skipAuth) {
    logoutCallback?.();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function apiRaw(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  const token = getToken();
  if (token && !skipAuth) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && !skipAuth) {
    logoutCallback?.();
    throw new Error('Session expired');
  }

  return response;
}
