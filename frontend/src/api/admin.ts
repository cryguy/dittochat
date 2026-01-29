import { api } from './client';
import type { AdminUser, AppSettings, InviteCode } from '../types';

export async function getAppSettings(): Promise<AppSettings> {
  return api<AppSettings>('/api/admin/settings');
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  return api<AppSettings>('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function getUsers(): Promise<AdminUser[]> {
  return api<AdminUser[]>('/api/admin/users');
}

export async function deleteUser(userId: number): Promise<void> {
  await api(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function setUserAdmin(userId: number, isAdmin: boolean): Promise<void> {
  await api(`/api/admin/users/${userId}/admin`, {
    method: 'PUT',
    body: JSON.stringify({ isAdmin }),
  });
}

export async function getInviteCodes(): Promise<InviteCode[]> {
  return api<InviteCode[]>('/api/admin/invites');
}

export async function createInviteCode(options: { maxUses?: number; expiresInDays?: number } = {}): Promise<InviteCode> {
  return api<InviteCode>('/api/admin/invites', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function deleteInviteCode(inviteId: number): Promise<void> {
  await api(`/api/admin/invites/${inviteId}`, {
    method: 'DELETE',
  });
}
