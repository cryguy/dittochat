import { Trash2, ShieldCheck, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAdmin } from '../../contexts/AdminContext';
import { useChatStore } from '../../stores/chatStore';

export function SidebarFooter() {
  const { username, logout, isAdmin } = useAuth();
  const { openSettings } = useSettings();
  const { openAdminPanel } = useAdmin();
  const { currentChatId, deleteChat } = useChatStore();

  const handleDeleteChat = () => {
    if (currentChatId && window.confirm('Delete this chat?')) {
      deleteChat(currentChatId);
    }
  };

  return (
    <div className="sidebar-footer">
      <div className="user-card">
        <div className="user-avatar">{username?.charAt(0).toUpperCase()}</div>
        <div className="user-details">
          <span className="user-name">{username}</span>
          <span className="user-plan">{isAdmin ? 'Admin' : 'Member'}</span>
        </div>
      </div>
      <div className="sidebar-actions">
        <button
          className="sidebar-action-btn"
          onClick={handleDeleteChat}
          disabled={!currentChatId}
          title="Delete chat"
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>
        {isAdmin && (
          <button className="sidebar-action-btn" onClick={openAdminPanel} title="Admin panel">
            <ShieldCheck size={16} strokeWidth={2} />
          </button>
        )}
        <button className="sidebar-action-btn" onClick={openSettings} title="Settings">
          <Settings size={16} strokeWidth={2} />
        </button>
        <button className="sidebar-action-btn" onClick={logout} title="Log out">
          <LogOut size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
