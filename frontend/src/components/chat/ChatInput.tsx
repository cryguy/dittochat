import { useState, useRef, useCallback, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from 'react';

interface ChatInputProps {
  onSend: (content: string, images?: string[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  visionSupported?: boolean;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ChatInput({ onSend, onStop, isStreaming, visionSupported = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    const dataUrls = await Promise.all(imageFiles.map(readAsDataUrl));
    setImages((prev) => [...prev, ...dataUrls]);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = ''; // allow re-selecting the same file
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!visionSupported) return;
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith('image/'))) {
      addFiles(files);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if ((trimmed || images.length) && !isStreaming) {
      onSend(trimmed, images.length ? images : undefined);
      setValue('');
      setImages([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [value, images, isStreaming, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        handleSend();
      }
    }
  };

  const handleButtonClick = () => {
    if (isStreaming) {
      onStop();
    } else {
      handleSend();
    }
  };

  const canSend = isStreaming || !!value.trim() || images.length > 0;

  return (
    <div className="input-area">
      {images.length > 0 && (
        <div className="input-images">
          {images.map((src, idx) => (
            <div className="input-image-thumb" key={idx}>
              <img src={src} alt={`attachment ${idx + 1}`} />
              <button
                type="button"
                className="input-image-remove"
                onClick={() => removeImage(idx)}
                title="Remove image"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ))}
        </div>
      )}
      {visionSupported && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="attach-btn"
            title="Attach image"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
          >
            <i className="fas fa-image"></i>
          </button>
        </>
      )}
      <textarea
        ref={textareaRef}
        className={`user-input ${visionSupported ? 'has-attach' : ''}`}
        placeholder="Type your message..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={isStreaming}
      />
      <button
        className={`send-btn ${isStreaming ? 'stop' : ''}`}
        onClick={handleButtonClick}
        disabled={!canSend}
      >
        <i className={`fas ${isStreaming ? 'fa-stop' : 'fa-paper-plane'}`}></i>
      </button>
    </div>
  );
}
