const path = require('path');

const BASE_URL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:8317/v1/';
const API_KEY = process.env.OPENAI_API_KEY || 'sk-placeholder';
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
  BASE_URL,
  API_KEY,
  DB_PATH,
  PORT,
  promptList
};