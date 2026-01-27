import { api } from './client';
import type { Settings } from '../types';

export async function fetchSettings(): Promise<Settings> {
  return api<Settings>('/api/settings');
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  await api('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
