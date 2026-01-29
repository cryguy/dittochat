import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { useAuth } from '../../contexts/AuthContext';
import * as adminApi from '../../api/admin';
import type { AdminUser, AppSettings, InviteCode } from '../../types';

type TabType = 'users' | 'settings' | 'invites';

export function AdminPanel() {
  const { isAdminPanelOpen, closeAdminPanel } = useAdmin();
  const { username } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('users');

  if (!isAdminPanelOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeAdminPanel}>
      <div className="modal-content admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Admin Panel</h2>
          <button className="modal-close" onClick={closeAdminPanel}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="fas fa-users"></i> Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <i className="fas fa-cog"></i> Settings
          </button>
          <button
            className={`admin-tab ${activeTab === 'invites' ? 'active' : ''}`}
            onClick={() => setActiveTab('invites')}
          >
            <i className="fas fa-ticket-alt"></i> Invites
          </button>
        </div>
        <div className="modal-body">
          {activeTab === 'users' && <UsersTab currentUsername={username} />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'invites' && <InvitesTab />}
        </div>
      </div>
    </div>
  );
}

function UsersTab({ currentUsername }: { currentUsername: string | null }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers();
      setUsers(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Delete user "${user.username}"? This will also delete all their chats.`)) {
      return;
    }
    try {
      await adminApi.deleteUser(user.id);
      await loadUsers();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    const newAdminStatus = !user.is_admin;
    const action = newAdminStatus ? 'promote' : 'demote';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${user.username}" ${newAdminStatus ? 'to' : 'from'} admin?`)) {
      return;
    }
    try {
      await adminApi.setUserAdmin(user.id, newAdminStatus);
      await loadUsers();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading users...</div>;
  }

  if (error) {
    return <div className="admin-error">{error}</div>;
  }

  return (
    <div className="admin-users">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Chats</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                {user.username}
                {user.username === currentUsername && <span className="you-badge">(you)</span>}
              </td>
              <td>
                {user.is_admin ? (
                  <span className="role-badge admin">Admin</span>
                ) : (
                  <span className="role-badge user">User</span>
                )}
              </td>
              <td>{user.chat_count}</td>
              <td>{new Date(user.created_at * 1000).toLocaleDateString()}</td>
              <td className="admin-actions">
                <button
                  className="admin-action-btn"
                  onClick={() => handleToggleAdmin(user)}
                  title={user.is_admin ? 'Demote from admin' : 'Promote to admin'}
                  disabled={user.username === currentUsername}
                >
                  <i className={`fas ${user.is_admin ? 'fa-user' : 'fa-user-shield'}`}></i>
                </button>
                <button
                  className="admin-action-btn delete"
                  onClick={() => handleDelete(user)}
                  title="Delete user"
                  disabled={user.username === currentUsername}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getAppSettings()
      .then(setSettings)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: keyof AppSettings) => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateAppSettings({
        [key]: !settings[key],
      });
      setSettings(updated);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading settings...</div>;
  }

  if (error && !settings) {
    return <div className="admin-error">{error}</div>;
  }

  return (
    <div className="admin-settings">
      {error && <div className="admin-error">{error}</div>}
      <div className="settings-toggle-group">
        <div className="settings-toggle-item">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Enable Registration</span>
            <span className="settings-toggle-desc">Allow new users to create accounts</span>
          </div>
          <button
            className={`toggle-switch ${settings?.registration_enabled ? 'active' : ''}`}
            onClick={() => handleToggle('registration_enabled')}
            disabled={saving}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
        <div className="settings-toggle-item">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Invite Only Mode</span>
            <span className="settings-toggle-desc">Require invite codes for new registrations</span>
          </div>
          <button
            className={`toggle-switch ${settings?.invite_only ? 'active' : ''}`}
            onClick={() => handleToggle('invite_only')}
            disabled={saving || !settings?.registration_enabled}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
      </div>
    </div>
  );
}

function InvitesTab() {
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getInviteCodes();
      setInvites(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await adminApi.createInviteCode({
        maxUses: maxUses || undefined,
        expiresInDays: expiresInDays || undefined,
      });
      await loadInvites();
      setMaxUses(1);
      setExpiresInDays(0);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (invite: InviteCode) => {
    if (!window.confirm('Delete this invite code?')) return;
    try {
      await adminApi.deleteInviteCode(invite.id);
      await loadInvites();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCopy = async (invite: InviteCode) => {
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  const isExpired = (invite: InviteCode) => {
    if (!invite.expires_at) return false;
    return invite.expires_at < Math.floor(Date.now() / 1000);
  };

  const isUsedUp = (invite: InviteCode) => {
    if (invite.max_uses === 0) return false;
    return invite.uses >= invite.max_uses;
  };

  if (loading) {
    return <div className="admin-loading">Loading invites...</div>;
  }

  return (
    <div className="admin-invites">
      {error && <div className="admin-error">{error}</div>}
      <div className="invite-create-form">
        <div className="invite-form-row">
          <div className="invite-form-field">
            <label>Max Uses</label>
            <input
              type="number"
              min="0"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 0)}
              placeholder="0 = unlimited"
            />
          </div>
          <div className="invite-form-field">
            <label>Expires In (days)</label>
            <input
              type="number"
              min="0"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 0)}
              placeholder="0 = never"
            />
          </div>
          <button
            className="btn-primary invite-create-btn"
            onClick={handleCreate}
            disabled={creating}
          >
            <i className="fas fa-plus"></i> Create
          </button>
        </div>
      </div>
      <div className="invite-list">
        {invites.length === 0 ? (
          <div className="invite-empty">No invite codes yet</div>
        ) : (
          invites.map((invite) => (
            <div
              key={invite.id}
              className={`invite-item ${isExpired(invite) || isUsedUp(invite) ? 'disabled' : ''}`}
            >
              <div className="invite-code-wrap">
                <code className="invite-code">{invite.code}</code>
                <button
                  className="invite-copy-btn"
                  onClick={() => handleCopy(invite)}
                  title="Copy code"
                >
                  <i className={`fas ${copiedId === invite.id ? 'fa-check' : 'fa-copy'}`}></i>
                </button>
              </div>
              <div className="invite-meta">
                <span>Uses: {invite.uses}/{invite.max_uses === 0 ? '∞' : invite.max_uses}</span>
                <span>
                  {invite.expires_at
                    ? `Expires: ${new Date(invite.expires_at * 1000).toLocaleDateString()}`
                    : 'Never expires'}
                </span>
                <span>By: {invite.created_by_username}</span>
              </div>
              <button
                className="invite-delete-btn"
                onClick={() => handleDelete(invite)}
                title="Delete invite"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
