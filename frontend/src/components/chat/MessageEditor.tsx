import { useState, useRef, useEffect, useCallback } from 'react';

interface MessageEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export function MessageEditor({ initialContent, onSave, onCancel }: MessageEditorProps) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
    }
  }, []);

  useEffect(() => {
    autoResize();
    textareaRef.current?.focus();
  }, [autoResize]);

  const handleSave = () => {
    const trimmed = content.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  return (
    <div className="message-edit-area">
      <textarea
        ref={textareaRef}
        className="message-edit-input"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          autoResize();
        }}
      />
      <div className="message-edit-buttons">
        <button className="msg-save-btn" onClick={handleSave}>
          Save & Submit
        </button>
        <button className="msg-cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
