import { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useChatStore } from '../../stores/chatStore';
import { PromptSettings } from './PromptSettings';

export function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useSettings();
  const { models, settings, saveSettings } = useChatStore();

  const [namingModel, setNamingModel] = useState('disabled');

  useEffect(() => {
    if (settings) {
      setNamingModel(settings.naming_model || 'disabled');
    }
  }, [settings]);

  const handleNamingModelChange = async (value: string) => {
    setNamingModel(value);
    await saveSettings({ naming_model: value === 'disabled' ? null : value } as never);
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeSettings}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={closeSettings}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
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
