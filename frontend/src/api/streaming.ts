import { getToken } from './client';
import type { Message, StreamChunk } from '../types';

interface StreamOptions {
  chatId: string;
  messages: Message[];
  model: string;
  systemPrompt: string;
  suffix: string;
  preset: string;
  onChunk: (content: string) => void;
  onError: (error: string) => void;
  onDone: () => void;
  onStreamId?: (streamId: string) => void;
  signal?: AbortSignal;
}

async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  initialContent: string,
  onChunk: (content: string) => void,
  onError: (error: string) => void,
  onDone: () => void,
  onStreamId?: (streamId: string) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let fullContent = initialContent;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed: StreamChunk & { streamId?: string } = JSON.parse(data);
            if (parsed.streamId && onStreamId) {
              onStreamId(parsed.streamId);
            }
            if (parsed.content) {
              fullContent += parsed.content;
              onChunk(fullContent);
            }
            if (parsed.error) {
              onError(parsed.error);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onDone();
}

export async function streamChat({
  chatId,
  messages,
  model,
  systemPrompt,
  suffix,
  preset,
  onChunk,
  onError,
  onDone,
  onStreamId,
  signal,
}: StreamOptions): Promise<void> {
  const token = getToken();

  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      chatId,
      messages,
      model,
      systemPrompt,
      suffix,
      preset,
    }),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  await processStream(reader, '', onChunk, onError, onDone, onStreamId);
}

export async function abortStream(chatId: string): Promise<boolean> {
  const token = getToken();

  const response = await fetch('/api/chat/stream/abort', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chatId }),
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.success;
}

interface CheckActiveStreamOptions {
  chatId: string;
  onChunk: (content: string) => void;
  onError: (error: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}

// Check if there's an active stream for this chat and connect to it
// Returns true if there was an active stream, false otherwise
export async function checkAndResumeStream({
  chatId,
  onChunk,
  onError,
  onDone,
  signal,
}: CheckActiveStreamOptions): Promise<boolean> {
  const token = getToken();

  const response = await fetch(`/api/chats/${chatId}/stream`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  // 204 No Content = no active stream
  if (response.status === 204) {
    return false;
  }

  if (!response.ok) {
    return false;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return false;
  }

  await processStream(reader, '', onChunk, onError, onDone);
  return true;
}
