import { useEffect, useRef, useCallback } from 'react';
import { VList, type VListHandle } from 'virtua';
import { MessageItem } from './MessageItem';
import { MessageContent } from './MessageContent';
import type { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  streamError: string | null;
  selectedModel: string;
  presetName: string;
  onEdit: (index: number, content: string) => void;
  onRetry: (index: number) => void;
  onRetryStream: () => void;
  onResumeStream: () => void;
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  streamError,
  selectedModel,
  presetName,
  onEdit,
  onRetry,
  onRetryStream,
  onResumeStream,
}: MessageListProps) {
  const listRef = useRef<VListHandle>(null);
  const isAtBottomRef = useRef(true);
  const userScrolledAwayRef = useRef(false);

  // Check if scroll is at absolute bottom (within small tolerance for rounding)
  const checkAtBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return true;

    const scrollOffset = list.scrollOffset;
    const scrollSize = list.scrollSize;
    const viewportSize = list.viewportSize;

    // Small tolerance (5px) for rounding errors
    const distanceFromBottom = scrollSize - scrollOffset - viewportSize;
    return distanceFromBottom < 5;
  }, []);

  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (list) {
      list.scrollToIndex(Infinity, { align: 'end' });
      isAtBottomRef.current = true;
      userScrolledAwayRef.current = false;
    }
  }, []);

  // Follow streaming content only if user is at bottom
  useEffect(() => {
    if (isStreaming && streamingContent && isAtBottomRef.current && !userScrolledAwayRef.current) {
      scrollToBottom();
    }
  }, [streamingContent, isStreaming, scrollToBottom]);

  // Scroll to bottom on new messages (if at bottom)
  useEffect(() => {
    if (isAtBottomRef.current && !userScrolledAwayRef.current) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

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

  // Build items array including streaming message
  const items = [...messages];
  const showStreamingMessage = isStreaming || streamingContent || streamError;

  if (messages.length === 0 && !showStreamingMessage) {
    return (
      <div className="welcome-screen">
        <h1>What can I help you with?</h1>
      </div>
    );
  }

  return (
    <VList
      ref={listRef}
      className="message-list"
      onScroll={handleScroll}
    >
      {items.map((message, index) => (
        <MessageItem
          key={index}
          message={message}
          index={index}
          isStreaming={false}
          onEdit={onEdit}
          onRetry={onRetry}
          disabled={isStreaming}
        />
      ))}
      {showStreamingMessage && (
        <div className="message assistant">
          <div className="message-inner">
            <div className="message-avatar">
              <i className="fas fa-robot"></i>
            </div>
            <div className="message-body">
              <div className="message-header">
                <div className="message-role">
                  Assistant - {selectedModel} - {presetName}
                </div>
                <div className="message-actions"></div>
              </div>
              {streamingContent && (
                <MessageContent
                  content={streamingContent}
                  role="assistant"
                  isStreaming={isStreaming}
                />
              )}
              {streamError && (
                <div className="stream-error">
                  <div className="stream-error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    {streamError}
                  </div>
                  <div className="stream-error-actions">
                    {streamingContent && (
                      <button className="btn-resume" onClick={onResumeStream}>
                        <i className="fas fa-play"></i> Resume
                      </button>
                    )}
                    <button className="btn-retry" onClick={onRetryStream}>
                      <i className="fas fa-rotate-right"></i> Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </VList>
  );
}
