import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '../sidebar/Sidebar';
import { Header } from './Header';
import { ChatArea } from '../chat/ChatArea';
import { SettingsModal } from '../settings/SettingsModal';
import { ImportModal } from '../import/ImportModal';
import { useChatStore } from '../../stores/chatStore';

export function AppLayout() {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    chats,
    currentChatId,
    setCurrentChat,
    loadChats,
    loadChatMessages,
    loadModels,
    loadSettings,
    loadPrompts,
    loadModelPromptMap,
  } = useChatStore();

  // Initialize app data
  useEffect(() => {
    const init = async () => {
      await loadModels();
      await loadChats();
      await loadSettings();
      await loadPrompts();
      await loadModelPromptMap();
    };
    init();
  }, [loadModels, loadChats, loadSettings, loadPrompts, loadModelPromptMap]);

  // Handle route changes - sync URL to state and navigate to new chats
  useEffect(() => {
    if (chatId) {
      // URL has a chat ID - sync state to URL
      if (chats[chatId]) {
        if (currentChatId !== chatId) {
          setCurrentChat(chatId);
          loadChatMessages(chatId);
        }
      } else if (Object.keys(chats).length > 0) {
        // Chat doesn't exist, redirect to home
        navigate('/', { replace: true });
      }
    } else {
      // URL is home (/)
      if (currentChatId) {
        // Check if this is a newly created chat we should navigate to
        const chat = chats[currentChatId];
        if (chat && chat.messages.length === 0 && Date.now() - chat.createdAt < 2000) {
          // New chat was just created, navigate to it
          navigate(`/c/${currentChatId}`, { replace: true });
        } else {
          // User intentionally went home, clear the state
          setCurrentChat(null);
        }
      }
    }
  }, [chatId, chats, currentChatId, setCurrentChat, loadChatMessages, navigate]);

  const handleMenuToggle = useCallback(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  }, []);

  const handleSidebarClose = useCallback(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  return (
    <div className="app-container">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={handleSidebarClose}
      />
      <main className="main-content">
        <Header onMenuToggle={handleMenuToggle} />
        <ChatArea />
      </main>
      <SettingsModal />
      <ImportModal />
    </div>
  );
}
