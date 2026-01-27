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

  // Extract title from first line (# Title)
  const titleLine = lines[0].trim();
  if (!titleLine.startsWith('# ')) {
    return { success: false, error: 'Missing title (expected "# Title" on first line)' };
  }
  const title = titleLine.slice(2).trim();
  if (!title) {
    return { success: false, error: 'Empty title' };
  }

  // Parse sections
  const messages: Message[] = [];
  let currentRole: 'user' | 'assistant' | null = null;
  let currentContent: string[] = [];
  let isThinkingSection = false;
  let thinkingContent: string[] = [];

  const flushSection = () => {
    if (currentRole && currentContent.length > 0) {
      let content = currentContent.join('\n').trim();

      // If we have accumulated thinking content, prepend it with markers
      if (thinkingContent.length > 0 && currentRole === 'assistant') {
        const thinking = thinkingContent.join('\n').trim();
        content = `<thinking>\n${thinking}\n</thinking>\n\n${content}`;
        thinkingContent = [];
      }

      if (content) {
        messages.push({ role: currentRole, content });
      }
    }
    currentContent = [];
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
        // Flush previous section
        flushSection();
        currentRole = 'user';
        isThinkingSection = false;
      } else if (header === 'Assistant (Thinking)') {
        // Don't flush yet - thinking content will be prepended to the next assistant message
        isThinkingSection = true;
      } else if (header === 'Assistant') {
        if (isThinkingSection) {
          // We were in a thinking section, now entering the actual assistant content
          // Store thinking content to prepend later
          thinkingContent = [...currentContent];
          currentContent = [];
          isThinkingSection = false;
        } else {
          // Flush previous section
          flushSection();
        }
        currentRole = 'assistant';
      }
      continue;
    }

    // Add content to current section
    if (currentRole !== null || isThinkingSection) {
      currentContent.push(line);
    }
  }

  // Flush final section
  flushSection();

  if (messages.length === 0) {
    return { success: false, error: 'No messages found in file' };
  }

  return {
    success: true,
    data: { title, messages },
  };
}
