import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import type { Model } from '../../types';

interface ModelDropdownProps {
  models: Model[];
  selectedModel: string;
  selectedCapabilities?: string[];
  onSelect: (modelId: string) => void;
}

// thinking/tools/vision icons for a given capability set (plus a cloud marker).
function CapabilityIcons({ capabilities, isCloud }: { capabilities?: string[]; isCloud?: boolean }) {
  const caps = capabilities || [];
  if (!isCloud && caps.length === 0) return null;
  return (
    <span className="model-item-badges">
      {isCloud && <i className="fas fa-cloud" title="Cloud" />}
      {caps.includes('thinking') && <i className="fas fa-brain" title="Thinking" />}
      {caps.includes('tools') && <i className="fas fa-wrench" title="Tools" />}
      {caps.includes('vision') && <i className="fas fa-eye" title="Vision" />}
    </span>
  );
}

export function ModelDropdown({ models, selectedModel, selectedCapabilities, onSelect }: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
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

  const submitCustom = () => {
    const trimmed = customValue.trim();
    if (trimmed) {
      setCustomValue('');
      handleSelect(trimmed);
    }
  };

  const handleCustomKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCustom();
    }
  };

  return (
    <div className="model-dropdown" ref={dropdownRef}>
      <button
        className="model-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="model-dot" aria-hidden="true" />
        <span className="model-dropdown-value">{selectedModel || 'Select model'}</span>
        <CapabilityIcons capabilities={selectedCapabilities} />
        <ChevronDown
          size={13}
          strokeWidth={2.2}
          className={`model-dropdown-arrow ${isOpen ? 'open' : ''}`}
        />
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
              <span className="model-item-row">
                <span className="model-item-name">{model.id}</span>
                <CapabilityIcons capabilities={model.capabilities} isCloud={model.is_cloud} />
              </span>
            </button>
          ))}
          <div className="model-dropdown-custom">
            <input
              type="text"
              placeholder="Custom model id…"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={handleCustomKeyDown}
            />
            <button
              type="button"
              onClick={submitCustom}
              disabled={!customValue.trim()}
              title="Use this model"
            >
              <ArrowRight size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
