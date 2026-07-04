import { api } from './client';
import type { Model } from '../types';

export interface ModelCapabilities {
  capabilities: string[];
  context_length: number | null;
}

export async function fetchModels(): Promise<Model[]> {
  return api<Model[]>('/api/models');
}

export async function fetchModelCapabilities(modelId: string): Promise<ModelCapabilities> {
  return api<ModelCapabilities>(`/api/models/capabilities?model=${encodeURIComponent(modelId)}`);
}
