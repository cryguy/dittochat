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
        <div className="user-avatar">
          {username?.charAt(0).toUpperCase()}
        </div>
        <div className="user-details">
          <span className="user-name">{username}</span>
          {isAdmin && <span className="admin-tag">Admin</span>}
        </div>
      </div>
      <div className="sidebar-actions">
        <button
          className="sidebar-action-btn"
          onClick={handleDeleteChat}
          disabled={!currentChatId}
          title="Delete Chat"
        >
          <i className="fas fa-trash"></i>
        </button>
        {isAdmin && (
          <button
            className="sidebar-action-btn"
            onClick={openAdminPanel}
            title="Admin Panel"
          >
            <i className="fas fa-user-shield"></i>
          </button>
        )}
        <button
          className="sidebar-action-btn"
          onClick={openSettings}
          title="Settings"
        >
          <i className="fas fa-cog"></i>
        </button>
        <button
          className="sidebar-action-btn"
          onClick={logout}
          title="Logout"
        >
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
  );
}
