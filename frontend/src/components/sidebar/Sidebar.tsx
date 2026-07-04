import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, Search, FileUp } from 'lucide-react';
import { ChatList } from './ChatList';
import { SidebarFooter } from './SidebarFooter';
import { useImport } from '../../contexts/ImportContext';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { openImport } = useImport();
  const [search, setSearch] = useState('');

  const handleNewChat = () => {
    navigate('/');
    onClose();
  };

  const sidebarClass = `sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`;

  return (
    <aside className={sidebarClass}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Sparkles size={16} strokeWidth={2.2} />
        </div>
        <span className="sidebar-brand-name">dittochat</span>
      </div>

      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={handleNewChat}>
          <Plus size={16} strokeWidth={2.4} />
          <span>New chat</span>
        </button>
        <button className="import-btn" onClick={openImport} title="Import chat">
          <FileUp size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="sidebar-search">
        <Search size={15} strokeWidth={2} />
        <input
          type="text"
          className="sidebar-search-input"
          placeholder="Search chats"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ChatList onChatSelect={onClose} search={search} />
      <SidebarFooter />
    </aside>
  );
}
