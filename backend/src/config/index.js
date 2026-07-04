const path = require('path');

// Ollama connection. Defaults to Ollama Cloud (https://ollama.com).
// The host is a bare origin (no /v1 suffix) since we use Ollama's native API.
// OPENAI_API_KEY is honored as a fallback so existing deployments keep working.
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'https://ollama.com';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || process.env.OPENAI_API_KEY || '';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'kimi-k2.5:cloud';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'chat.db');
const PORT = process.env.PORT || 3000;

let promptList = [];
try {
  const promptFile = require('../../prompt.json');
  promptList = (promptFile.prompts || []).map(p => ({
    name: p.name,
    description: p.description || '',
    system_prompt: p.system || p.system_prompt || '',
    suffix: p.suffix || ''
  }));
  console.log(`[Config] Loaded ${promptList.length} prompts from prompt.json`);
} catch (e) {
  console.log(e)
    console.warn('[Config] No prompt.json found or invalid format, using empty prompt list');
}

module.exports = {
  OLLAMA_HOST,
  OLLAMA_API_KEY,
  DEFAULT_MODEL,
  DB_PATH,
  PORT,
  promptList
};
