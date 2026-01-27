import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImport } from '../../contexts/ImportContext';
import { useChatStore } from '../../stores/chatStore';
import { parseImportMarkdown, type ParsedImport } from '../../utils/parseImportMarkdown';
import { importChat } from '../../api/import';
import { generateId } from '../../utils/generateId';

type InputMode = 'file' | 'paste';

export function ImportModal() {
  const { isImportOpen, closeImport } = useImport();
  const { models, prompts, loadChats, setCurrentChat } = useChatStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [pasteContent, setPasteContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('default');
  const [parsedData, setParsedData] = useState<ParsedImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isImportOpen) {
      setPasteContent('');
      setParsedData(null);
      setParseError(null);
      setImportError(null);
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isImportOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseContent(content);
    };
    reader.onerror = () => {
      setParseError('Failed to read file');
      setParsedData(null);
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setPasteContent(content);
    if (content.trim()) {
      parseContent(content);
    } else {
      setParsedData(null);
      setParseError(null);
    }
  };

  const parseContent = (content: string) => {
    const result = parseImportMarkdown(content);
    if (result.success) {
      setParsedData(result.data);
      setParseError(null);
    } else {
      setParsedData(null);
      setParseError(result.error);
    }
    setImportError(null);
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const id = generateId();
      const preset = selectedPreset === 'default' ? undefined : selectedPreset;
      const model = selectedModel || undefined;

      await importChat({
        id,
        title: parsedData.title,
        messages: parsedData.messages,
        model,
        preset,
      });

      // Refresh chat list and navigate to the imported chat
      await loadChats();
      setCurrentChat(id);
      navigate(`/c/${id}`);
      closeImport();
    } catch (error) {
      setImportError((error as Error).message || 'Failed to import chat');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isImportOpen) return null;

  const userMessages = parsedData?.messages.filter(m => m.role === 'user').length || 0;
  const assistantMessages = parsedData?.messages.filter(m => m.role === 'assistant').length || 0;

  return (
    <div className="modal-overlay" onClick={closeImport}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Chat</h2>
          <button className="modal-close" onClick={closeImport}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {/* Mode Toggle */}
          <div className="import-mode-toggle">
            <button
              className={`import-mode-btn ${inputMode === 'file' ? 'active' : ''}`}
              onClick={() => setInputMode('file')}
            >
              <i className="fas fa-file-upload"></i>
              Upload File
            </button>
            <button
              className={`import-mode-btn ${inputMode === 'paste' ? 'active' : ''}`}
              onClick={() => setInputMode('paste')}
            >
              <i className="fas fa-paste"></i>
              Paste Content
            </button>
          </div>

          {/* Input Area */}
          {inputMode === 'file' ? (
            <div className="import-file-input">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt"
                onChange={handleFileChange}
                id="import-file"
              />
              <label htmlFor="import-file" className="import-file-label">
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Choose a markdown file or drag it here</span>
              </label>
            </div>
          ) : (
            <div className="import-paste-input">
              <textarea
                value={pasteContent}
                onChange={handlePasteChange}
                placeholder="Paste your markdown content here..."
                rows={8}
              />
            </div>
          )}

          {/* Error Display */}
          {parseError && (
            <div className="import-error">
              <i className="fas fa-exclamation-circle"></i>
              {parseError}
            </div>
          )}

          {/* Preview */}
          {parsedData && (
            <div className="import-preview">
              <h3>Preview</h3>
              <div className="import-preview-details">
                <div className="import-preview-item">
                  <span className="import-preview-label">Title:</span>
                  <span className="import-preview-value">{parsedData.title}</span>
                </div>
                <div className="import-preview-item">
                  <span className="import-preview-label">Messages:</span>
                  <span className="import-preview-value">
                    {parsedData.messages.length} total ({userMessages} user, {assistantMessages} assistant)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Model & Preset Selection */}
          {parsedData && (
            <div className="import-options">
              <div className="settings-group">
                <label>Model (optional)</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <option value="">None</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="settings-group">
                <label>Preset/Template (optional)</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                >
                  <option value="default">Default (none)</option>
                  {prompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.name}>
                      {prompt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Import Error */}
          {importError && (
            <div className="import-error">
              <i className="fas fa-exclamation-circle"></i>
              {importError}
            </div>
          )}

          {/* Import Button */}
          {parsedData && (
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Importing...
                </>
              ) : (
                <>
                  <i className="fas fa-file-import"></i>
                  Import Chat
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
