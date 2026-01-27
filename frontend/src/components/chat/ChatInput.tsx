import { useState, useRef, useCallback, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !isStreaming) {
      onSend(trimmed);
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [value, isStreaming, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSend();
      }
    }
  };

  const handleButtonClick = () => {
    if (isStreaming) {
      onStop();
    } else {
      handleSend();
    }
  };

  return (
    <div className="input-area">
      <textarea
        ref={textareaRef}
        className="user-input"
        placeholder="Type your message..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        disabled={isStreaming}
      />
      <button
        className={`send-btn ${isStreaming ? 'stop' : ''}`}
        onClick={handleButtonClick}
        disabled={!isStreaming && !value.trim()}
      >
        <i className={`fas ${isStreaming ? 'fa-stop' : 'fa-paper-plane'}`}></i>
      </button>
    </div>
  );
}
