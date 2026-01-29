import { api } from './client';
import type { Prompt, ModelPromptMap } from '../types';

export async function fetchPrompts(): Promise<Prompt[]> {
  return api<Prompt[]>('/api/prompts');
}

export async function createPrompt(
  name: string,
  description: string,
  systemPrompt: string,
  suffix: string
): Promise<Prompt> {
  return api<Prompt>('/api/prompts', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      system_prompt: systemPrompt,
      suffix,
    }),
  });
}

export async function updatePrompt(
  id: number,
  name: string,
  description: string,
  systemPrompt: string,
  suffix: string
): Promise<void> {
  await api(`/api/prompts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name,
      description,
      system_prompt: systemPrompt,
      suffix,
    }),
  });
}

export async function deletePrompt(id: number): Promise<void> {
  await api(`/api/prompts/${id}`, { method: 'DELETE' });
}

export async function fetchModelPrompts(): Promise<ModelPromptMap> {
  return api<ModelPromptMap>('/api/model-prompts');
}

export async function setModelPrompt(
  model: string,
  promptId: number | null
): Promise<void> {
  await api(`/api/model-prompts/${encodeURIComponent(model)}`, {
    method: 'PUT',
    body: JSON.stringify({ prompt_id: promptId }),
  });
}
