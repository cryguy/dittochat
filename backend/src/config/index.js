const path = require('path');

const BASE_URL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:8317/v1/';
const API_KEY = process.env.OPENAI_API_KEY || 'sk-placeholder';
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'chat.db');
const PORT = process.env.PORT || 3000;

let prompts = { system_prompt: '', suffix_thinking: '' };
try { prompts = require('../../prompt.json'); } catch (e) {}

module.exports = {
  BASE_URL,
  API_KEY,
  DB_PATH,
  PORT,
  prompts
};