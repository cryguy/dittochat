import { PanelLeft } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { ModelDropdown } from './ModelDropdown';
import { PromptDropdown } from './PromptDropdown';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const {
    models,
    selectedModel,
    modelCapabilities,
    setSelectedModel,
    prompts,
    selectedPromptId,
    setSelectedPrompt,
    chats,
    currentChatId,
  } = useChatStore();

  const currentChat = currentChatId ? chats[currentChatId] : null;
  const title = currentChat?.title ?? 'New chat';

  return (
    <header className="header">
      <button className="menu-toggle" onClick={onMenuToggle} title="Toggle sidebar">
        <PanelLeft size={18} strokeWidth={2} />
      </button>
      <div className="header-title" title={title}>
        <span className="header-title-name">{title}</span>
      </div>
      <div className="header-controls">
        <ModelDropdown
          models={models}
          selectedModel={selectedModel}
          selectedCapabilities={modelCapabilities[selectedModel]?.capabilities}
          onSelect={setSelectedModel}
        />
        <PromptDropdown
          prompts={prompts}
          selectedPromptId={selectedPromptId}
          onSelect={setSelectedPrompt}
        />
      </div>
    </header>
  );
}
