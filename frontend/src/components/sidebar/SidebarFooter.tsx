import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useChatStore } from '../../stores/chatStore';

export function SidebarFooter() {
  const { username, logout } = useAuth();
  const { openSettings } = useSettings();
  const { currentChatId, deleteChat } = useChatStore();

  const handleDeleteChat = () => {
    if (currentChatId && window.confirm('Delete this chat?')) {
      deleteChat(currentChatId);
    }
  };

  return (
    <div className="sidebar-footer">
      <div className="user-info">
        <i className="fas fa-user"></i>
        <span>{username}</span>
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
