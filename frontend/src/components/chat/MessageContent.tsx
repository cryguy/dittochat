import { useMemo } from 'react';
import { ThinkingBlock } from './ThinkingBlock';
import { extractThinkingBlocks, hasUnclosedThinkingTag } from '../../utils/thinking';
import { renderMarkdown } from '../../utils/markdown';

interface MessageContentProps {
  content: string;
  role: 'user' | 'assistant';
  isStreaming?: boolean;
}

export function MessageContent({ content, role, isStreaming = false }: MessageContentProps) {
  const { visible, blocks } = useMemo(
    () => extractThinkingBlocks(content),
    [content]
  );

  const hasUnclosed = useMemo(
    () => hasUnclosedThinkingTag(content),
    [content]
  );

  if (role === 'user') {
    return <div className="message-content">{content}</div>;
  }

  // Assistant message
  if (blocks.length === 0 && !visible) {
    return <div className="message-content plain-text">{content}</div>;
  }

  return (
    <div className="message-content">
      {blocks.map((block, idx) => (
        <ThinkingBlock
          key={idx}
          content={block}
          isStreaming={isStreaming}
          isLast={idx === blocks.length - 1}
          hasUnclosedTag={hasUnclosed}
        />
      ))}
      {visible && (
        <div
          className="assistant-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(visible) }}
        />
      )}
    </div>
  );
}
