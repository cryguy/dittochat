import { useState, useRef, useEffect } from 'react';

interface ModelDropdownProps {
  models: { id: string }[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
}

export function ModelDropdown({ models, selectedModel, onSelect }: ModelDropdownProps) {
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

  const handleSelect = (modelId: string) => {
    onSelect(modelId);
    setIsOpen(false);
  };

  return (
    <div className="model-dropdown" ref={dropdownRef}>
      <button
        className="model-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="model-dropdown-value">{selectedModel || 'Select model'}</span>
        <i className={`fas fa-chevron-down model-dropdown-arrow ${isOpen ? 'open' : ''}`}></i>
      </button>
      {isOpen && (
        <div className="model-dropdown-menu">
          {models.map((model) => (
            <button
              key={model.id}
              className={`model-dropdown-item ${model.id === selectedModel ? 'selected' : ''}`}
              onClick={() => handleSelect(model.id)}
              type="button"
            >
              {model.id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
