const OpenAI = require('openai');
const { BASE_URL, API_KEY } = require('../config');

let client = null;

function getOpenAIClient() {
  if (!client) {
    client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
  }
  return client;
}

module.exports = {
  getOpenAIClient
};
