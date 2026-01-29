import { useChatStore } from '../../stores/chatStore';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export function ChatArea() {
  const {
    chats,
    currentChatId,
    isStreaming,
    streamingContent,
    streamError,
    selectedModel,
    sendMessage,
    editMessage,
    retryMessage,
    retryStream,
    resumeStream,
    abortStream,
    getActivePrompt,
  } = useChatStore();

  const chat = currentChatId ? chats[currentChatId] : null;
  const messages = chat?.messages || [];
  const activePrompt = getActivePrompt();

  return (
    <div className="chat-area">
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        streamError={streamError}
        selectedModel={selectedModel}
        presetName={activePrompt.name}
        onEdit={editMessage}
        onRetry={retryMessage}
        onRetryStream={retryStream}
        onResumeStream={resumeStream}
      />
      <ChatInput onSend={sendMessage} onStop={abortStream} isStreaming={isStreaming} />
    </div>
  );
}
