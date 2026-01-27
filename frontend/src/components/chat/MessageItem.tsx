import { useState, memo } from 'react';
import { MessageContent } from './MessageContent';
import { MessageEditor } from './MessageEditor';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  index: number;
  isStreaming?: boolean;
  onEdit: (index: number, content: string) => void;
  onRetry: (index: number) => void;
  disabled?: boolean;
}

export const MessageItem = memo(function MessageItem({
  message,
  index,
  isStreaming = false,
  onEdit,
  onRetry,
  disabled = false,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  const avatar =
    message.role === 'user' ? (
      <i className="fas fa-user"></i>
    ) : (
      <i className="fas fa-robot"></i>
    );

  let roleLabel = 'You';
  if (message.role === 'assistant') {
    const parts = ['Assistant'];
    if (message.model) parts.push(message.model);
    if (message.preset) parts.push(message.preset);
    roleLabel = parts.join(' - ');
  }

  const handleEdit = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleSave = (content: string) => {
    setIsEditing(false);
    onEdit(index, content);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleRetry = () => {
    if (!disabled) {
      onRetry(index);
    }
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-inner">
        <div className="message-avatar">{avatar}</div>
        <div className="message-body">
          <div className="message-header">
            <div className="message-role">{roleLabel}</div>
            <div className="message-actions">
              <button
                className="msg-action-btn msg-edit-btn"
                title="Edit"
                onClick={handleEdit}
                disabled={disabled}
              >
                <i className="fas fa-pen"></i>
              </button>
              {message.role === 'user' && (
                <button
                  className="msg-action-btn msg-retry-btn"
                  title="Retry"
                  onClick={handleRetry}
                  disabled={disabled}
                >
                  <i className="fas fa-rotate-right"></i>
                </button>
              )}
            </div>
          </div>
          {isEditing ? (
            <MessageEditor
              initialContent={message.content}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <MessageContent
              content={message.content}
              role={message.role}
              isStreaming={isStreaming}
            />
          )}
        </div>
      </div>
    </div>
  );
});
