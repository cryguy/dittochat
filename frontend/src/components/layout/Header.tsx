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
    setSelectedModel,
    prompts,
    selectedPromptId,
    setSelectedPrompt,
  } = useChatStore();

  return (
    <header className="header">
      <button className="menu-toggle" onClick={onMenuToggle}>
        <i className="fas fa-bars"></i>
      </button>
      <ModelDropdown
        models={models}
        selectedModel={selectedModel}
        onSelect={setSelectedModel}
      />
      <PromptDropdown
        prompts={prompts}
        selectedPromptId={selectedPromptId}
        onSelect={setSelectedPrompt}
      />
    </header>
  );
}
