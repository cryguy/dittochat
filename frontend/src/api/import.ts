import { api } from './client';
import type { Message } from '../types';

interface ImportChatRequest {
  id: string;
  title: string;
  messages: Message[];
  model?: string;
  preset?: string;
}

interface ImportChatResponse {
  id: string;
  title: string;
  messageCount: number;
}

export async function importChat(data: ImportChatRequest): Promise<ImportChatResponse> {
  return api<ImportChatResponse>('/api/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
