import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';

interface ChatListProps {
  onChatSelect?: () => void;
}

export function ChatList({ onChatSelect }: ChatListProps) {
  const navigate = useNavigate();
  const { chats, currentChatId, updateChatTitle, deleteChat } = useChatStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedChats = useMemo(() => {
    return Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [chats]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleChatClick = (chatId: string) => {
    if (editingId) return;
    navigate(`/c/${chatId}`);
    onChatSelect?.();
  };

  const handleEditClick = (e: React.MouseEvent, chatId: string, title: string) => {
    e.stopPropagation();
    setEditingId(chatId);
    setEditValue(title);
  };

  const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      deleteChat(chatId);
    }
  };

  const handleSave = () => {
    if (editingId && editValue.trim()) {
      updateChatTitle(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div className="chat-list">
      {sortedChats.map((chat) => (
        <div
          key={chat.id}
          className={`chat-list-item ${chat.id === currentChatId ? 'active' : ''}`}
          onClick={() => handleChatClick(chat.id)}
        >
          <i className="fas fa-message"></i>
          {editingId === chat.id ? (
            <input
              ref={inputRef}
              type="text"
              className="chat-title-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className="chat-title">{chat.title}</span>
              <div className="chat-actions">
                <button
                  className="chat-action-btn"
                  onClick={(e) => handleEditClick(e, chat.id, chat.title)}
                  title="Rename"
                >
                  <i className="fas fa-pen"></i>
                </button>
                <button
                  className="chat-action-btn delete"
                  onClick={(e) => handleDeleteClick(e, chat.id)}
                  title="Delete"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
