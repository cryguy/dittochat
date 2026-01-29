export interface User {
  id: number;
  username: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  preset?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatListItem {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface Model {
  id: string;
  object: string;
  owned_by: string;
}

export interface Prompt {
  id: number;
  name: string;
  description: string;
  system_prompt: string;
  suffix: string;
  is_global?: number;
}

export interface Settings {
  system_prompt: string;
  suffix: string;
  model: string;
  naming_model: string | null;
  active_prompt_id: number | null;
  active_prompt_is_global: number;
}

export interface StreamChunk {
  content?: string;
  error?: string;
}

export interface ThinkingBlock {
  content: string;
  isStreaming: boolean;
}

export interface ExtractedContent {
  visible: string;
  blocks: string[];
}

export interface AdminUser {
  id: number;
  username: string;
  is_admin: number;
  created_at: number;
  chat_count: number;
}

export interface AppSettings {
  registration_enabled: boolean;
  invite_only: boolean;
}

export interface InviteCode {
  id: number;
  code: string;
  created_by_username: string;
  max_uses: number;
  uses: number;
  expires_at: number | null;
  created_at: number;
}

export interface RegistrationStatus {
  registrationEnabled: boolean;
  inviteOnly: boolean;
}
