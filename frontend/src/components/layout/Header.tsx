import { useChatStore } from '../../stores/chatStore';

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
      <select
        className="model-select"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.id}
          </option>
        ))}
      </select>
    </header>
  );
}
