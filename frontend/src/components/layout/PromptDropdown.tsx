import { useState, useRef, useEffect } from 'react';
import type { Prompt } from '../../types';

interface PromptDropdownProps {
  prompts: Prompt[];
  selectedPromptId: number | null;
  onSelect: (promptId: number | null) => void;
}

export function PromptDropdown({ prompts, selectedPromptId, onSelect }: PromptDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (promptId: number | null) => {
    onSelect(promptId);
    setIsOpen(false);
  };

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);
  const displayName = selectedPrompt?.name || 'Default';

  const userPrompts = prompts.filter((p) => !p.is_global);
  const globalPrompts = prompts.filter((p) => p.is_global);

  return (
    <div className="prompt-dropdown" ref={dropdownRef}>
      <button
        className="prompt-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        title={selectedPrompt?.description || 'Default prompt'}
      >
        <i className="fas fa-scroll prompt-dropdown-icon"></i>
        <span className="prompt-dropdown-value">{displayName}</span>
        <i className={`fas fa-chevron-down prompt-dropdown-arrow ${isOpen ? 'open' : ''}`}></i>
      </button>
      {isOpen && (
        <div className="prompt-dropdown-menu">
          <button
            className={`prompt-dropdown-item ${selectedPromptId === null ? 'selected' : ''}`}
            onClick={() => handleSelect(null)}
            type="button"
          >
            <span className="prompt-dropdown-item-name">Default</span>
          </button>
          {globalPrompts.length > 0 && (
            <>
              <div className="prompt-dropdown-divider">Global</div>
              {globalPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  className={`prompt-dropdown-item ${prompt.id === selectedPromptId ? 'selected' : ''}`}
                  onClick={() => handleSelect(prompt.id)}
                  type="button"
                  title={prompt.description || ''}
                >
                  <span className="prompt-dropdown-item-name">{prompt.name}</span>
                  {prompt.description && (
                    <span className="prompt-dropdown-item-desc">{prompt.description}</span>
                  )}
                </button>
              ))}
            </>
          )}
          {userPrompts.length > 0 && (
            <>
              <div className="prompt-dropdown-divider">Your Prompts</div>
              {userPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  className={`prompt-dropdown-item ${prompt.id === selectedPromptId ? 'selected' : ''}`}
                  onClick={() => handleSelect(prompt.id)}
                  type="button"
                  title={prompt.description || ''}
                >
                  <span className="prompt-dropdown-item-name">{prompt.name}</span>
                  {prompt.description && (
                    <span className="prompt-dropdown-item-desc">{prompt.description}</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
