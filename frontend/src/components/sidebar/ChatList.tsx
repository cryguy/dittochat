import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';

interface ChatListProps {
  onChatSelect?: () => void;
  search?: string;
}

const DAY_MS = 86_400_000;

/** Short, human relative date for a chat's last-updated timestamp. */
function formatRelativeDate(ts: number): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startOfToday) return 'Today';
  if (ts >= startOfToday - DAY_MS) return 'Yesterday';
  const d = new Date(ts);
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(
    undefined,
    sameYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  );
}

export function ChatList({ onChatSelect, search = '' }: ChatListProps) {
  const navigate = useNavigate();
  const { chats, currentChatId, updateChatTitle, deleteChat } = useChatStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedChats = useMemo(() => {
    const list = Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);
    const q = search.trim().toLowerCase();
    return q ? list.filter((c) => c.title.toLowerCase().includes(q)) : list;
  }, [chats, search]);

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
      {sortedChats.length > 0 && (
        <div className="chat-list-label">
          {search.trim() ? 'Results' : 'Recent'}
        </div>
      )}
      {sortedChats.map((chat) => (
        <div
          key={chat.id}
          className={`chat-list-item ${chat.id === currentChatId ? 'active' : ''}`}
          onClick={() => handleChatClick(chat.id)}
        >
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
              <div className="chat-item-text">
                <span className="chat-title">{chat.title}</span>
                <span className="chat-subtitle">{formatRelativeDate(chat.updatedAt)}</span>
              </div>
              <div className="chat-actions">
                <button
                  className="chat-action-btn"
                  onClick={(e) => handleEditClick(e, chat.id, chat.title)}
                  title="Rename"
                >
                  <Pencil size={13} strokeWidth={2} />
                </button>
                <button
                  className="chat-action-btn delete"
                  onClick={(e) => handleDeleteClick(e, chat.id)}
                  title="Delete"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
