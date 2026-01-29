import { api, apiRaw, setToken, setUsername, getToken } from './client';
import type { RegistrationStatus } from '../types';

interface AuthResponse {
  token: string;
  username: string;
  isAdmin?: boolean;
}

interface MeResponse {
  username: string;
  isAdmin: boolean;
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

export async function register(username: string, password: string, inviteCode?: string): Promise<AuthResponse> {
  const data = await api<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, inviteCode }),
    skipAuth: true,
  });

  setToken(data.token);
  setUsername(data.username);
  return data;
}

export async function verifyToken(): Promise<MeResponse | null> {
  const token = getToken();
  if (!token) return null;

  try {
    return await api<MeResponse>('/api/auth/me');
  } catch {
    return null;
  }
}

export async function getRegistrationStatus(): Promise<RegistrationStatus> {
  return api<RegistrationStatus>('/api/auth/registration-status', { skipAuth: true });
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
