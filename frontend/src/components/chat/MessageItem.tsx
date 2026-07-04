import { useState, memo } from 'react';
import { Sparkles, Pencil, RotateCcw, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  const handleEdit = () => {
    if (!disabled) setIsEditing(true);
  };

  const handleSave = (content: string) => {
    setIsEditing(false);
    onEdit(index, content);
  };

  const handleCancel = () => setIsEditing(false);

  const handleRetry = () => {
    if (!disabled) onRetry(index);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const imagesBlock =
    message.images && message.images.length > 0 ? (
      <div className="message-images">
        {message.images.map((src, idx) => (
          <a key={idx} href={src} target="_blank" rel="noreferrer">
            <img className="message-image" src={src} alt={`attachment ${idx + 1}`} />
          </a>
        ))}
      </div>
    ) : null;

  // ===== User message: right-aligned bubble, no avatar/role =====
  if (message.role === 'user') {
    return (
      <div className="message user">
        <div className="message-inner">
          {isEditing ? (
            <div className="message-body">
              <MessageEditor
                initialContent={message.content}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          ) : (
            <div className="user-col">
              {imagesBlock}
              {message.content && <div className="user-bubble">{message.content}</div>}
              <div className="message-actions">
                <button className="msg-action-btn" title="Edit" onClick={handleEdit} disabled={disabled}>
                  <Pencil size={14} strokeWidth={2} />
                </button>
                <button className="msg-action-btn" title="Retry" onClick={handleRetry} disabled={disabled}>
                  <RotateCcw size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== Assistant message: avatar tile + header + prose =====
  const roleParts = ['Assistant'];
  if (message.model) roleParts.push(message.model);
  if (message.preset) roleParts.push(message.preset);

  return (
    <div className="message assistant">
      <div className="message-inner">
        <div className="message-avatar">
          <Sparkles size={18} strokeWidth={2} />
        </div>
        <div className="message-body">
          <div className="message-header">
            <div className="message-role">
              {roleParts.map((part, i) => (
                <span key={i} className="message-role-part">
                  {part}
                </span>
              ))}
            </div>
            <div className="message-actions">
              <button className="msg-action-btn" title="Edit" onClick={handleEdit} disabled={disabled}>
                <Pencil size={14} strokeWidth={2} />
              </button>
              <button className="msg-action-btn" title={copied ? 'Copied' : 'Copy'} onClick={handleCopy}>
                {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
              </button>
            </div>
          </div>
          {isEditing ? (
            <MessageEditor
              initialContent={message.content}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <>
              {imagesBlock}
              <MessageContent content={message.content} role={message.role} isStreaming={isStreaming} />
            </>
          )}
        </div>
      </div>
    </div>
  );
});
