import { useNavigate } from 'react-router-dom';
import { ChatList } from './ChatList';
import { SidebarFooter } from './SidebarFooter';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const handleNewChat = () => {
    navigate('/');
    onClose();
  };

  const sidebarClass = `sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`;

  return (
    <aside className={sidebarClass}>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={handleNewChat}>
          <i className="fas fa-plus"></i>
          <span>New Chat</span>
        </button>
      </div>
      <ChatList onChatSelect={onClose} />
      <SidebarFooter />
    </aside>
  );
}
