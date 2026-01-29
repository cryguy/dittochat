import { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import * as promptsApi from '../../api/prompts';

export function PromptSettings() {
  const {
    prompts,
    selectedPromptId,
    defaultPrompt,
    loadPrompts,
    saveSettings,
  } = useChatStore();

  const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
  const [promptName, setPromptName] = useState('Default');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [suffix, setSuffix] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [isGlobal, setIsGlobal] = useState(false);

  // Separate user and global prompts
  const userPrompts = prompts.filter((p) => !p.is_global);
  const globalPrompts = prompts.filter((p) => p.is_global);

  // Load current active prompt into editor
  useEffect(() => {
    if (selectedPromptId != null) {
      const prompt = prompts.find((p) => p.id === selectedPromptId);
      if (prompt) {
        setEditingPromptId(prompt.id);
        setPromptName(prompt.name);
        setDescription(prompt.description || '');
        setSystemPrompt(prompt.system_prompt || '');
        setSuffix(prompt.suffix || '');
        setIsDefault(false);
        setIsGlobal(!!prompt.is_global);
        return;
      }
    }

    // Fall back to default
    setEditingPromptId(null);
    setPromptName('Default');
    setDescription('');
    setSystemPrompt(defaultPrompt.system_prompt);
    setSuffix(defaultPrompt.suffix);
    setIsDefault(true);
    setIsGlobal(false);
  }, [selectedPromptId, prompts, defaultPrompt]);

  const handlePromptSelect = (value: string) => {
    if (value === 'default') {
      setEditingPromptId(null);
      setPromptName('Default');
      setDescription('');
      setSystemPrompt(defaultPrompt.system_prompt);
      setSuffix(defaultPrompt.suffix);
      setIsDefault(true);
      setIsGlobal(false);
    } else {
      const id = parseInt(value, 10);
      const prompt = prompts.find((p) => p.id === id);
      if (prompt) {
        setEditingPromptId(prompt.id);
        setPromptName(prompt.name);
        setDescription(prompt.description || '');
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

    const newPrompt = await promptsApi.createPrompt(name, '', '', '');
    await loadPrompts();
    setEditingPromptId(newPrompt.id);
    setPromptName(newPrompt.name);
    setDescription('');
    setSystemPrompt('');
    setSuffix('');
    setIsDefault(false);
    setIsGlobal(false);
  };

  const handleDeletePrompt = async () => {
    if (editingPromptId === null) {
      window.alert('Cannot delete the default prompt');
      return;
    }

    if (isGlobal) {
      window.alert('Cannot delete global prompts');
      return;
    }

    if (!window.confirm('Delete this prompt?')) return;

    await promptsApi.deletePrompt(editingPromptId);
    await loadPrompts();

    // Reset to default
    setEditingPromptId(null);
    setPromptName('Default');
    setDescription('');
    setSystemPrompt(defaultPrompt.system_prompt);
    setSuffix(defaultPrompt.suffix);
    setIsDefault(true);
    setIsGlobal(false);
  };

  const handleSave = async () => {
    if (editingPromptId === null) {
      // Save default prompt
      await saveSettings({
        system_prompt: systemPrompt,
        suffix: suffix,
      });
    } else if (!isGlobal) {
      // Save custom prompt (can't edit global prompts)
      await promptsApi.updatePrompt(
        editingPromptId,
        promptName,
        description,
        systemPrompt,
        suffix
      );
      await loadPrompts();
    }
  };

  return (
    <div className="prompt-settings">
      <div className="settings-group">
        <label>Prompt Preset</label>
        <div className="prompt-selector">
          <select
            value={editingPromptId?.toString() || 'default'}
            onChange={(e) => handlePromptSelect(e.target.value)}
          >
            <option value="default">Default</option>
            {globalPrompts.length > 0 && (
              <optgroup label="Global Prompts">
                {globalPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </option>
                ))}
              </optgroup>
            )}
            {userPrompts.length > 0 && (
              <optgroup label="Your Prompts">
                {userPrompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.name}
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
        <label>Description{isGlobal ? ' (Read-only)' : ''}</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isDefault || isGlobal}
          placeholder="Short description of this prompt preset"
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

      {!isGlobal && (
        <button className="btn-primary" onClick={handleSave}>
          Save
        </button>
      )}
    </div>
  );
}
