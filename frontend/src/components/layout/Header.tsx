import { useChatStore } from '../../stores/chatStore';
import { ModelDropdown } from './ModelDropdown';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { models, selectedModel, setSelectedModel } = useChatStore();

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
    </header>
  );
}
