import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useChatStore } from '../../stores/chatStore';
import { PromptSettings } from './PromptSettings';
import {
  useAppearance,
  VOICE_OPTIONS,
  DENSITY_OPTIONS,
  ACCENT_OPTIONS,
} from '../../contexts/AppearanceContext';

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  swatches?: boolean;
}

function Segmented<T extends string>({ label, value, options, onChange, swatches }: SegmentedProps<T>) {
  return (
    <div className="settings-group">
      <label>{label}</label>
      <div className="segmented">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`segmented-btn ${value === opt ? 'active' : ''}`}
            onClick={() => onChange(opt)}
          >
            {swatches && <span className={`accent-swatch accent-swatch-${opt.toLowerCase()}`} />}
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useSettings();
  const { models, settings, saveSettings } = useChatStore();
  const { voice, density, accent, setVoice, setDensity, setAccent } = useAppearance();

  const [namingModel, setNamingModel] = useState('disabled');
  const [reasoningEffort, setReasoningEffort] = useState('default');

  useEffect(() => {
    if (settings) {
      setNamingModel(settings.naming_model || 'disabled');
      setReasoningEffort(settings.reasoning_effort || 'default');
    }
  }, [settings]);

  const handleNamingModelChange = async (value: string) => {
    setNamingModel(value);
    await saveSettings({ naming_model: value === 'disabled' ? null : value } as never);
  };

  const handleReasoningEffortChange = async (value: string) => {
    setReasoningEffort(value);
    await saveSettings({ reasoning_effort: value === 'default' ? null : value });
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeSettings}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={closeSettings} title="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="modal-body">
          <div className="settings-section">
            <h3>Appearance</h3>
            <Segmented label="Narrative voice" value={voice} options={VOICE_OPTIONS} onChange={setVoice} />
            <Segmented label="Reading density" value={density} options={DENSITY_OPTIONS} onChange={setDensity} />
            <Segmented label="Accent" value={accent} options={ACCENT_OPTIONS} onChange={setAccent} swatches />
          </div>

          <div className="settings-section">
            <h3>General</h3>
            <div className="settings-group">
              <label>Auto-naming Model</label>
              <select
                value={namingModel}
                onChange={(e) => handleNamingModelChange(e.target.value)}
              >
                <option value="disabled">Disabled (use timestamp)</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-group">
              <label>Reasoning Effort</label>
              <select
                value={reasoningEffort}
                onChange={(e) => handleReasoningEffortChange(e.target.value)}
              >
                <option value="default">Default (on for thinking models)</option>
                <option value="off">Off (no thinking)</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <p className="settings-hint">Only applies to models that support thinking.</p>
            </div>
          </div>

          <div className="settings-section">
            <h3>Prompt Management</h3>
            <PromptSettings />
          </div>
        </div>
      </div>
    </div>
  );
}
