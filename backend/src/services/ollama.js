const { Ollama } = require('ollama');
const { OLLAMA_HOST, OLLAMA_API_KEY } = require('../config');

function buildHeaders() {
  const headers = {};
  if (OLLAMA_API_KEY) headers.Authorization = `Bearer ${OLLAMA_API_KEY}`;
  return headers;
}

let sharedClient = null;

// Shared singleton for non-streaming, side-effect-free calls (list/show/titles).
function getOllamaClient() {
  if (!sharedClient) {
    sharedClient = new Ollama({ host: OLLAMA_HOST, headers: buildHeaders() });
  }
  return sharedClient;
}

// Fresh instance per streaming request. Ollama's client.abort() cancels *every*
// in-flight request on that client, so streaming must not share the singleton or
// aborting one chat would kill everyone else's stream.
function createOllamaClient() {
  return new Ollama({ host: OLLAMA_HOST, headers: buildHeaders() });
}

// --- Model metadata cache -------------------------------------------------
// /api/show is a per-model network round-trip; cache it so listing models and
// resolving thinking capability on the streaming hot path stay cheap.
const CAP_TTL_MS = 5 * 60 * 1000;
const infoCache = new Map(); // model -> { capabilities, contextLength, ts }

const CLOUD_TAG = /(?::|-)cloud$/;

async function getModelInfo(model) {
  const now = Date.now();
  const cached = infoCache.get(model);
  if (cached && now - cached.ts < CAP_TTL_MS) return cached;

  let entry = { capabilities: [], contextLength: null, ts: now };
  try {
    const info = await getOllamaClient().show({ model });
    const capabilities = Array.isArray(info.capabilities) ? info.capabilities : [];
    let contextLength = null;
    const modelInfo = info.model_info || {};
    for (const [key, value] of Object.entries(modelInfo)) {
      if (key.endsWith('.context_length')) { contextLength = value; break; }
    }
    entry = { capabilities, contextLength, ts: now };
  } catch (e) {
    // Non-fatal: degrade to "no known capabilities" rather than breaking the
    // model list or forcing a thinking mode the model may not support.
    console.log(`[Ollama] show(${model}) failed:`, e.message);
  }
  infoCache.set(model, entry);
  return entry;
}

async function getModelCapabilities(model) {
  const { capabilities } = await getModelInfo(model);
  return capabilities;
}

// Resolve the native `think` param from a user's reasoning_effort setting.
// Returns undefined when the model can't think (so we never send `think` to a
// model that would 400 on it) or false/'low'/'medium'/'high'/true otherwise.
async function resolveThink(effort, model) {
  const capabilities = await getModelCapabilities(model);
  if (!capabilities.includes('thinking')) return undefined;
  if (effort === 'off' || effort === 'none' || effort === false) return false;
  if (effort === 'low' || effort === 'medium' || effort === 'high') return effort;
  // Unset / 'on' -> keep thinking on for capable models (preserves prior behavior).
  return true;
}

// Lightweight listing only. We deliberately do NOT call /api/show per model
// here: the cloud catalog can hold hundreds of entries and that would be an
// N+1 network fan-out on every model load. Capabilities/context length are
// fetched lazily per selected model via getModelInfo/getModelCapabilities.
async function listModels() {
  const res = await getOllamaClient().list();
  const models = res.models || [];
  return models.map((m) => {
    const name = m.name || m.model;
    return {
      id: name,
      name,
      size: m.size ?? null,
      family: m.details?.family ?? null,
      parameter_size: m.details?.parameter_size ?? null,
      quantization: m.details?.quantization_level ?? null,
      is_cloud: typeof name === 'string' && CLOUD_TAG.test(name)
    };
  });
}

module.exports = {
  getOllamaClient,
  createOllamaClient,
  getModelInfo,
  getModelCapabilities,
  resolveThink,
  listModels
};
