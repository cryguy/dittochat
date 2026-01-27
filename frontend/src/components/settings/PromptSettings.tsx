import { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import * as promptsApi from '../../api/prompts';

export function PromptSettings() {
  const {
    models,
    prompts,
    modelPromptMap,
    defaultPrompt,
    loadPrompts,
    loadModelPromptMap,
    saveSettings,
  } = useChatStore();

  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [promptName, setPromptName] = useState('Default');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [suffix, setSuffix] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [isGlobal, setIsGlobal] = useState(false);

  // Separate user and global prompts
  const userPrompts = prompts.filter((p) => !p.is_global);
  const globalPrompts = prompts.filter((p) => p.is_global);

  // Initialize with first model
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  // Load prompt for selected model
  useEffect(() => {
    if (!selectedModel) return;

    const promptId = modelPromptMap[selectedModel];
    if (promptId) {
      const prompt = prompts.find((p) => p.id === promptId);
      if (prompt) {
        setSelectedPromptId(prompt.id);
        setPromptName(prompt.name);
        setSystemPrompt(prompt.system_prompt || '');
        setSuffix(prompt.suffix || '');
        setIsDefault(false);
        setIsGlobal(!!prompt.is_global);
        return;
      }
    }

    // Fall back to default
    setSelectedPromptId(null);
    setPromptName('Default');
    setSystemPrompt(defaultPrompt.system_prompt);
    setSuffix(defaultPrompt.suffix);
    setIsDefault(true);
    setIsGlobal(false);
  }, [selectedModel, modelPromptMap, prompts, defaultPrompt]);

  const handlePromptSelect = (value: string) => {
    if (value === 'default') {
      setSelectedPromptId(null);
      setPromptName('Default');
      setSystemPrompt(defaultPrompt.system_prompt);
      setSuffix(defaultPrompt.suffix);
      setIsDefault(true);
      setIsGlobal(false);
    } else {
      const id = parseInt(value, 10);
      const prompt = prompts.find((p) => p.id === id);
      if (prompt) {
        setSelectedPromptId(prompt.id);
        setPromptName(prompt.name);
        setSystemPrompt(prompt.system_prompt || '');
        setSuffix(prompt.suffix || '');
        setIsDefault(false);
        setIsGlobal(!!prompt.is_global);
      }
    }
  };

  const handleNewPrompt = async () => {
    const name = window.prompt('Enter prompt name:');
    if (!name) return;

    const newPrompt = await promptsApi.createPrompt(name, '', '');
    await loadPrompts();
    setSelectedPromptId(newPrompt.id);
    setPromptName(newPrompt.name);
    setSystemPrompt('');
    setSuffix('');
    setIsDefault(false);
  };

  const handleDeletePrompt = async () => {
    if (selectedPromptId === null) {
      window.alert('Cannot delete the default prompt');
      return;
    }

    if (isGlobal) {
      window.alert('Cannot delete global prompts');
      return;
    }

    if (!window.confirm('Delete this prompt?')) return;

    await promptsApi.deletePrompt(selectedPromptId);
    await loadPrompts();
    await loadModelPromptMap();

    // Reset to default
    setSelectedPromptId(null);
    setPromptName('Default');
    setSystemPrompt(defaultPrompt.system_prompt);
    setSuffix(defaultPrompt.suffix);
    setIsDefault(true);
    setIsGlobal(false);
  };

  const handleSave = async () => {
    if (selectedPromptId === null) {
      // Save default prompt
      await saveSettings({
        system_prompt: systemPrompt,
        suffix: suffix,
      });
    } else if (!isGlobal) {
      // Save custom prompt (can't edit global prompts)
      await promptsApi.updatePrompt(
        selectedPromptId,
        promptName,
        systemPrompt,
        suffix
      );
      await loadPrompts();
    }

    // Save model-prompt mapping
    await promptsApi.setModelPrompt(selectedModel, selectedPromptId);
    await loadModelPromptMap();
  };

  const activePromptId = modelPromptMap[selectedModel] || null;

  return (
    <div className="prompt-settings">
      <div className="settings-group">
        <label>Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {models.map((model) => {
            const promptId = modelPromptMap[model.id];
            let presetName = 'Default';
            if (promptId) {
              const preset = prompts.find((p) => p.id === promptId);
              if (preset) presetName = preset.name;
            }
            return (
              <option key={model.id} value={model.id}>
                {model.id} → {presetName}
              </option>
            );
          })}
        </select>
      </div>

      <div className="settings-group">
        <label>Prompt Preset</label>
        <div className="prompt-selector">
          <select
            value={selectedPromptId?.toString() || 'default'}
            onChange={(e) => handlePromptSelect(e.target.value)}
          >
            <option value="default">
              Default{activePromptId === null ? ' (Active)' : ''}
            </option>
            {globalPrompts.length > 0 && (
              <optgroup label="Global Prompts">
                {globalPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
                    {activePromptId === prompt.id ? ' (Active)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {userPrompts.length > 0 && (
              <optgroup label="Your Prompts">
                {userPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
                    {activePromptId === prompt.id ? ' (Active)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button className="btn-small" onClick={handleNewPrompt}>
            <i className="fas fa-plus"></i>
          </button>
          <button
            className="btn-small"
            onClick={handleDeletePrompt}
            disabled={isDefault || isGlobal}
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <div className="settings-group">
        <label>Preset Name{isGlobal ? ' (Read-only)' : ''}</label>
        <input
          type="text"
          value={promptName}
          onChange={(e) => setPromptName(e.target.value)}
          disabled={isDefault || isGlobal}
        />
      </div>

      <div className="settings-group">
        <label>System Prompt{isGlobal ? ' (Read-only)' : ''}</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          readOnly={isGlobal}
        />
      </div>

      <div className="settings-group">
        <label>Suffix (appended to last user message){isGlobal ? ' (Read-only)' : ''}</label>
        <textarea
          value={suffix}
          onChange={(e) => setSuffix(e.target.value)}
          rows={3}
          readOnly={isGlobal}
        />
      </div>

      <button className="btn-primary" onClick={handleSave}>
        {isGlobal ? `Apply to ${selectedModel}` : `Save & Apply to ${selectedModel}`}
      </button>
    </div>
  );
}
