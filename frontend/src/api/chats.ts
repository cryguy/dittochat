import { api } from './client';
import type { ChatListItem, Message } from '../types';

interface ChatDetail {
  id: string;
  title: string;
  messages: Message[];
  created_at: number;
  updated_at: number;
}

interface GenerateTitleResponse {
  title: string;
}

export async function fetchChats(): Promise<ChatListItem[]> {
  return api<ChatListItem[]>('/api/chats');
}

export async function fetchChat(chatId: string): Promise<ChatDetail> {
  return api<ChatDetail>(`/api/chats/${chatId}`);
}

export async function createChat(id: string, title: string): Promise<void> {
  await api('/api/chats', {
    method: 'POST',
    body: JSON.stringify({ id, title }),
  });
}

export async function updateChat(
  chatId: string,
  title: string | null,
  messages?: Message[]
): Promise<void> {
  const body: { title?: string; messages?: Message[] } = {};
  if (title !== null) {
    body.title = title;
  }
  if (messages !== undefined) {
    body.messages = messages;
  }
  await api(`/api/chats/${chatId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteChat(chatId: string): Promise<void> {
  await api(`/api/chats/${chatId}`, { method: 'DELETE' });
}

export async function generateTitle(
  chatId: string,
  messages: Message[]
): Promise<string> {
  const data = await api<GenerateTitleResponse>(
    `/api/chats/${chatId}/generate-title`,
    {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }
  );
  return data.title;
}
