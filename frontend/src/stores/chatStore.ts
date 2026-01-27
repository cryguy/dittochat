import { create } from 'zustand';
import type { Chat, Message, Model, Prompt, ModelPromptMap, Settings } from '../types';
import * as chatsApi from '../api/chats';
import * as modelsApi from '../api/models';
import * as settingsApi from '../api/settings';
import * as promptsApi from '../api/prompts';
import { streamChat, checkAndResumeStream, abortStream as abortStreamApi } from '../api/streaming';
import { generateId } from '../utils/generateId';

interface ChatState {
  // Data
  chats: Record<string, Chat>;
  currentChatId: string | null;
  models: Model[];
  selectedModel: string;
  prompts: Prompt[];
  modelPromptMap: ModelPromptMap;
  defaultPrompt: { system_prompt: string; suffix: string };
  settings: Settings | null;

  // UI state
  isStreaming: boolean;
  streamingContent: string;
  streamError: string | null;
  streamId: string | null;

  // Actions
  loadChats: () => Promise<void>;
  loadChatMessages: (chatId: string) => Promise<void>;
  createNewChat: () => Promise<string>;
  deleteChat: (chatId: string) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  setCurrentChat: (chatId: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  editMessage: (index: number, newContent: string) => Promise<void>;
  retryMessage: (index: number) => Promise<void>;
  retryStream: () => Promise<void>;
  resumeStream: () => Promise<void>;
  loadModels: () => Promise<void>;
  setSelectedModel: (model: string) => void;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
  loadPrompts: () => Promise<void>;
  loadModelPromptMap: () => Promise<void>;
  getActivePromptForModel: (model: string) => { system_prompt: string; suffix: string; name: string };
  abortStream: () => void;
}

let abortController: AbortController | null = null;
let userAborted = false;

export const useChatStore = create<ChatState>((set, get) => ({
  chats: {},
  currentChatId: null,
  models: [],
  selectedModel: '',
  prompts: [],
  modelPromptMap: {},
  defaultPrompt: { system_prompt: '', suffix: '' },
  settings: null,
  isStreaming: false,
  streamingContent: '',
  streamError: null,
  streamId: null,

  loadChats: async () => {
    const chatsList = await chatsApi.fetchChats();
    const chats: Record<string, Chat> = {};
    for (const chat of chatsList) {
      chats[chat.id] = {
        id: chat.id,
        title: chat.title,
        messages: [],
        createdAt: chat.created_at * 1000,
        updatedAt: chat.updated_at * 1000,
      };
    }
    set({ chats });
  },

  loadChatMessages: async (chatId: string) => {
    const data = await chatsApi.fetchChat(chatId);

    set((s) => ({
      chats: {
        ...s.chats,
        [chatId]: {
          ...s.chats[chatId],
          messages: data.messages || [],
        },
      },
    }));

    // Check if there's an active stream for this chat
    abortController = new AbortController();

    await checkAndResumeStream({
      chatId,
      signal: abortController.signal,
      onChunk: (content) => {
        set({
          isStreaming: true,
          streamingContent: content,
          streamError: null,
        });
      },
      onError: (error) => {
        set({ streamError: error, isStreaming: false });
      },
      onDone: async () => {
        set({ isStreaming: false, streamError: null, streamingContent: '' });
        // Re-fetch messages from server to get correct model/preset
        // (server saved the message with the actual values used)
        const data = await chatsApi.fetchChat(chatId);
        set((s) => ({
          chats: {
            ...s.chats,
            [chatId]: {
              ...s.chats[chatId],
              messages: data.messages || [],
            },
          },
        }));
      },
    }).catch(() => false);
    // Note: onChunk already sets isStreaming: true when content arrives
  },

  createNewChat: async () => {
    const id = generateId();
    const chat: Chat = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await chatsApi.createChat(id, 'New Chat');
    set((state) => ({
      chats: { ...state.chats, [id]: chat },
      currentChatId: id,
    }));
    return id;
  },

  deleteChat: async (chatId: string) => {
    await chatsApi.deleteChat(chatId);
    set((state) => {
      const { [chatId]: _, ...rest } = state.chats;
      return {
        chats: rest,
        currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
      };
    });
  },

  updateChatTitle: async (chatId: string, title: string) => {
    await chatsApi.updateChat(chatId, title);
    set((state) => ({
      chats: {
        ...state.chats,
        [chatId]: {
          ...state.chats[chatId],
          title,
        },
      },
    }));
  },

  setCurrentChat: (chatId: string | null) => {
    set({ currentChatId: chatId });
  },

  sendMessage: async (content: string) => {
    const state = get();
    let chatId = state.currentChatId;

    // Create new chat if needed
    if (!chatId) {
      chatId = await get().createNewChat();
    }

    const chat = get().chats[chatId];
    if (!chat) return;

    const activePrompt = get().getActivePromptForModel(state.selectedModel);

    // Add user message
    const messages: Message[] = [...chat.messages, { role: 'user', content }];
    set((s) => ({
      chats: {
        ...s.chats,
        [chatId!]: { ...chat, messages, updatedAt: Date.now() },
      },
      isStreaming: true,
      streamingContent: '',
      streamError: null,
      streamId: null,
    }));

    // Save user message immediately so it persists across refresh
    await chatsApi.updateChat(chatId!, null, messages);

    abortController = new AbortController();
    userAborted = false;

    try {
      await streamChat({
        chatId: chatId!,
        messages,
        model: state.selectedModel,
        systemPrompt: activePrompt.system_prompt,
        suffix: activePrompt.suffix,
        preset: activePrompt.name,
        signal: abortController.signal,
        onStreamId: (id) => {
          set({ streamId: id });
        },
        onChunk: (fullContent) => {
          set({ streamingContent: fullContent });
        },
        onError: (error) => {
          set({ streamError: error, isStreaming: false });
        },
        onDone: () => {
          const finalContent = get().streamingContent;
          if (finalContent && finalContent.trim()) {
            const updatedMessages: Message[] = [
              ...messages,
              {
                role: 'assistant',
                content: finalContent,
                model: state.selectedModel,
                preset: activePrompt.name,
              },
            ];

            const updatedChat = get().chats[chatId!];
            if (updatedChat) {
              // Update local state only - server saves to DB
              set((s) => ({
                chats: {
                  ...s.chats,
                  [chatId!]: {
                    ...updatedChat,
                    messages: updatedMessages,
                    updatedAt: Date.now(),
                  },
                },
              }));

              // Generate title after first exchange
              if (updatedMessages.length === 2) {
                chatsApi.generateTitle(chatId!, updatedMessages).then((title) => {
                  if (title) {
                    set((s) => ({
                      chats: {
                        ...s.chats,
                        [chatId!]: { ...s.chats[chatId!], title },
                      },
                    }));
                  }
                });
              }
            }
          }
          set({ isStreaming: false, streamError: null, streamingContent: '' });
        },
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User aborted - server saves partial content to DB
        // Update local state to show partial content
        if (userAborted) {
          const partialContent = get().streamingContent;
          if (partialContent && partialContent.trim()) {
            const updatedMessages: Message[] = [
              ...messages,
              {
                role: 'assistant',
                content: partialContent,
                model: state.selectedModel,
                preset: activePrompt.name,
              },
            ];
            const updatedChat = get().chats[chatId!];
            if (updatedChat) {
              set((s) => ({
                chats: {
                  ...s.chats,
                  [chatId!]: {
                    ...updatedChat,
                    messages: updatedMessages,
                    updatedAt: Date.now(),
                  },
                },
              }));
            }
          }
          set({ isStreaming: false, streamError: null, streamingContent: '' });
        }
      } else {
        // Network or other error - allow retry
        set({ streamError: (error as Error).message, isStreaming: false });
      }
    }
  },

  editMessage: async (index: number, newContent: string) => {
    const state = get();
    const chatId = state.currentChatId;
    if (!chatId || state.isStreaming) return;

    const chat = state.chats[chatId];
    if (!chat || index < 0 || index >= chat.messages.length) return;

    const editedRole = chat.messages[index].role;

    // Truncate messages from the edited index
    const truncatedMessages = chat.messages.slice(0, index);

    set((s) => ({
      chats: {
        ...s.chats,
        [chatId]: { ...chat, messages: truncatedMessages },
      },
    }));

    if (editedRole === 'user') {
      // Send new message to get new response
      await get().sendMessage(newContent);
    } else {
      // For assistant edits, just save the edited content
      const activePrompt = get().getActivePromptForModel(state.selectedModel);
      const updatedMessages: Message[] = [
        ...truncatedMessages,
        {
          role: 'assistant',
          content: newContent,
          model: state.selectedModel,
          preset: activePrompt.name,
        },
      ];

      set((s) => ({
        chats: {
          ...s.chats,
          [chatId]: { ...chat, messages: updatedMessages },
        },
      }));

      await chatsApi.updateChat(chatId, null, updatedMessages);
    }
  },

  retryMessage: async (index: number) => {
    const state = get();
    const chatId = state.currentChatId;
    if (!chatId || state.isStreaming) return;

    const chat = state.chats[chatId];
    if (!chat || index < 0 || index >= chat.messages.length) return;

    const userMessage = chat.messages[index];
    if (userMessage.role !== 'user') return;

    // Truncate messages from this user message
    const truncatedMessages = chat.messages.slice(0, index);

    set((s) => ({
      chats: {
        ...s.chats,
        [chatId]: { ...chat, messages: truncatedMessages },
      },
    }));

    // Resend the user message
    await get().sendMessage(userMessage.content);
  },

  loadModels: async () => {
    const models = await modelsApi.fetchModels();
    const sorted = models.sort((a, b) => a.id.localeCompare(b.id));
    set({ models: sorted });
    if (sorted.length > 0 && !get().selectedModel) {
      set({ selectedModel: sorted[0].id });
    }
  },

  setSelectedModel: (model: string) => {
    set({ selectedModel: model });
    // Also save to settings
    get().saveSettings({ model });
  },

  loadSettings: async () => {
    const settings = await settingsApi.fetchSettings();
    set({
      settings,
      defaultPrompt: {
        system_prompt: settings.system_prompt || '',
        suffix: settings.suffix || '',
      },
    });
    if (settings.model) {
      set({ selectedModel: settings.model });
    }
  },

  saveSettings: async (settings: Partial<Settings>) => {
    await settingsApi.saveSettings(settings);
    const current = get().settings;
    if (current) {
      set({ settings: { ...current, ...settings } });
    }
  },

  loadPrompts: async () => {
    const prompts = await promptsApi.fetchPrompts();
    set({ prompts });
  },

  loadModelPromptMap: async () => {
    const map = await promptsApi.fetchModelPrompts();
    set({ modelPromptMap: map });
  },

  getActivePromptForModel: (model: string) => {
    const state = get();
    const promptId = state.modelPromptMap[model];
    if (promptId) {
      const prompt = state.prompts.find((p) => p.id === promptId);
      if (prompt) {
        return {
          system_prompt: prompt.system_prompt || '',
          suffix: prompt.suffix || '',
          name: prompt.name,
        };
      }
    }
    return {
      system_prompt: state.defaultPrompt.system_prompt,
      suffix: state.defaultPrompt.suffix,
      name: 'Default',
    };
  },

  abortStream: () => {
    const chatId = get().currentChatId;
    if (abortController) {
      userAborted = true;
      abortController.abort();
      abortController = null;
    }
    // Tell server to stop the stream
    if (chatId) {
      abortStreamApi(chatId);
    }
    set({ isStreaming: false });
  },

  retryStream: async () => {
    // Retry by resending the last user message
    const state = get();
    const chatId = state.currentChatId;
    if (!chatId) return;

    const chat = state.chats[chatId];
    if (!chat || chat.messages.length === 0) return;

    // Find the last user message
    const lastUserMsgIndex = [...chat.messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMsgIndex === -1) return;

    const actualIndex = chat.messages.length - 1 - lastUserMsgIndex;
    const lastUserMsg = chat.messages[actualIndex];

    // Remove the last user message and any assistant response after it
    const truncatedMessages = chat.messages.slice(0, actualIndex);
    set((s) => ({
      chats: {
        ...s.chats,
        [chatId]: { ...chat, messages: truncatedMessages },
      },
      streamError: null,
      streamingContent: '',
    }));

    // Resend
    await get().sendMessage(lastUserMsg.content);
  },

  resumeStream: async () => {
    // Try to reconnect to any active stream for this chat
    const chatId = get().currentChatId;
    if (!chatId) return;

    set({
      isStreaming: true,
      streamError: null,
    });

    abortController = new AbortController();
    userAborted = false;

    try {
      const hasStream = await checkAndResumeStream({
        chatId,
        signal: abortController.signal,
        onChunk: (content) => {
          set({ streamingContent: content });
        },
        onError: (error) => {
          set({ streamError: error, isStreaming: false });
        },
        onDone: async () => {
          set({ isStreaming: false, streamError: null, streamingContent: '' });
          // Re-fetch messages from server to get correct model/preset
          const data = await chatsApi.fetchChat(chatId);
          set((s) => ({
            chats: {
              ...s.chats,
              [chatId]: {
                ...s.chats[chatId],
                messages: data.messages || [],
              },
            },
          }));
        },
      });

      if (!hasStream) {
        // No active stream, just retry from scratch
        set({ isStreaming: false });
        return get().retryStream();
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        set({ streamError: (error as Error).message, isStreaming: false });
      } else {
        set({ isStreaming: false });
      }
    }
  },
}));
