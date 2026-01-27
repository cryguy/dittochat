import type { Message } from '../types';

export interface ParsedImport {
  title: string;
  messages: Message[];
}

export type ParseResult = {
  success: true;
  data: ParsedImport;
} | {
  success: false;
  error: string;
}

export function parseImportMarkdown(markdown: string): ParseResult {
  const lines = markdown.split('\n');

  if (lines.length === 0) {
    return { success: false, error: 'Empty file' };
  }

  // Extract title from first line (# Title) or generate one
  const titleLine = lines[0].trim();
  let title = '';
  if (titleLine.startsWith('# ')) {
    title = titleLine.slice(2).trim();
  }
  if (!title) {
    // Generate timestamp-based title
    const now = new Date();
    title = `Imported ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Parse sections
  const messages: Message[] = [];
  let currentRole: 'user' | 'assistant' | null = null;
  let currentContent: string[] = [];
  let isCollectingThinking = false;
  let thinkingContent: string[] = [];

  const flushMessage = () => {
    if (currentRole && currentContent.length > 0) {
      let content = currentContent.join('\n').trim();

      // If we have accumulated thinking content, prepend it with markers
      if (thinkingContent.length > 0 && currentRole === 'assistant') {
        const thinking = thinkingContent.join('\n').trim();
        if (thinking) {
          content = `<thinking>\n${thinking}\n</thinking>\n\n${content}`;
        }
      }

      if (content) {
        messages.push({ role: currentRole, content });
      }
    }
    currentContent = [];
    thinkingContent = [];
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip metadata lines (Created/Updated dates)
    if (trimmedLine.startsWith('*Created:') || trimmedLine.startsWith('*Updated:')) {
      continue;
    }

    // Skip horizontal rules
    if (trimmedLine === '---') {
      continue;
    }

    // Check for section headers
    if (trimmedLine.startsWith('## ')) {
      const header = trimmedLine.slice(3).trim();

      if (header === 'User') {
        // Flush any previous message
        flushMessage();
        currentRole = 'user';
        isCollectingThinking = false;
      } else if (header === 'Assistant (Thinking)') {
        // Flush any previous message (like user message)
        flushMessage();
        // Start collecting thinking content
        isCollectingThinking = true;
        currentRole = null; // Will be set when we see ## Assistant
      } else if (header === 'Assistant') {
        if (isCollectingThinking) {
          // We were collecting thinking content, save it
          thinkingContent = [...currentContent];
          currentContent = [];
          isCollectingThinking = false;
        } else {
          // No thinking section before this, flush previous message
          flushMessage();
        }
        currentRole = 'assistant';
      }
      continue;
    }

    // Add content to current section
    if (currentRole !== null || isCollectingThinking) {
      currentContent.push(line);
    }
  }

  // Flush final message
  flushMessage();

  if (messages.length === 0) {
    return { success: false, error: 'No messages found in file' };
  }

  return {
    success: true,
    data: { title, messages },
  };
}
