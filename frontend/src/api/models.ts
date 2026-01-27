import { api } from './client';
import type { Model } from '../types';

export async function fetchModels(): Promise<Model[]> {
  return api<Model[]>('/api/models');
}
