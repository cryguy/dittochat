import { useRef, useEffect, useCallback, useState } from 'react';
import { renderMarkdown } from '../../utils/markdown';

interface ThinkingBlockProps {
  content: string;
  isStreaming: boolean;
  isLast: boolean;
  hasUnclosedTag: boolean;
}

export function ThinkingBlock({
  content,
  isStreaming,
  isLast,
  hasUnclosedTag,
}: ThinkingBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const userToggledRef = useRef(false);
  const userWantsOpenRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const userScrolledAwayRef = useRef(false);

  const isThinkingInProgress = isStreaming && isLast && hasUnclosedTag;

  // Determine if block should be open
  const shouldBeOpen = userToggledRef.current
    ? userWantsOpenRef.current
    : isThinkingInProgress;

  const [isOpen, setIsOpen] = useState(shouldBeOpen);

  // Check if scroll is at absolute bottom
  const checkAtBottom = useCallback(() => {
    const el = contentRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom < 5;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = contentRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      isAtBottomRef.current = true;
      userScrolledAwayRef.current = false;
    }
  }, []);

  // Update open state when streaming status changes
  useEffect(() => {
    if (!userToggledRef.current) {
      setIsOpen(isThinkingInProgress);
    }
  }, [isThinkingInProgress]);

  // Follow content if at bottom during streaming
  useEffect(() => {
    if (isThinkingInProgress && isAtBottomRef.current && !userScrolledAwayRef.current) {
      scrollToBottom();
    }
  }, [content, isThinkingInProgress, scrollToBottom]);

  const handleToggle = useCallback(() => {
    userToggledRef.current = true;
    userWantsOpenRef.current = !isOpen;
    setIsOpen(!isOpen);
    // Reset scroll state when opening
    if (!isOpen) {
      isAtBottomRef.current = true;
      userScrolledAwayRef.current = false;
    }
  }, [isOpen]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = e.currentTarget;
    if (el.scrollHeight <= el.clientHeight) {
      e.preventDefault();
    }
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = checkAtBottom();

    // If user scrolled away from bottom, mark it
    if (!atBottom && isAtBottomRef.current) {
      userScrolledAwayRef.current = true;
    }

    // If user scrolled back to bottom, reset
    if (atBottom) {
      userScrolledAwayRef.current = false;
    }

    isAtBottomRef.current = atBottom;
  }, [checkAtBottom]);

  return (
    <details className="thinking-block" open={isOpen}>
      <summary onClick={(e) => { e.preventDefault(); handleToggle(); }}>
        {isThinkingInProgress ? 'Thinking...' : 'Thinking'}
      </summary>
      <div
        ref={contentRef}
        className="thinking-content"
        onWheel={handleWheel}
        onScroll={handleScroll}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </details>
  );
}
