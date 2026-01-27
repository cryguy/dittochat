import { api, apiRaw, setToken, setUsername, getToken } from './client';
import type { User } from '../types';

interface AuthResponse {
  token: string;
  username: string;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const data = await api<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    skipAuth: true,
  });

  setToken(data.token);
  setUsername(data.username);
  return data;
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  const data = await api<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    skipAuth: true,
  });

  setToken(data.token);
  setUsername(data.username);
  return data;
}

export async function verifyToken(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    return await api<User>('/api/auth/me');
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRaw('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore logout errors
  }
  setToken(null);
  setUsername(null);
}
