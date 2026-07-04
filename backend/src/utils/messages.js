function stripThinkingBlocks(content) {
  return content.replace(/<((?:antml:)?thinking)>[\s\S]*?<\/\1>/g, '').trim();
}

// Ollama's native API wants raw base64 (or Uint8Array), not a data URI. The
// client stores/sends full data URIs for easy <img> rendering, so strip the
// `data:<mime>;base64,` prefix here.
function toBase64(image) {
  if (typeof image !== 'string') return null;
  const comma = image.indexOf(',');
  return image.startsWith('data:') && comma !== -1 ? image.slice(comma + 1) : image;
}

function buildApiMessages(messages, systemPrompt, suffix) {
  const apiMessages = [];
  if (systemPrompt) apiMessages.push({ role: 'system', content: systemPrompt });

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    let content = msg.content;

    // Strip thinking blocks from assistant messages
    if (msg.role === 'assistant') {
      content = stripThinkingBlocks(content);
    }

    const isLastUserMessage = msg.role === 'user' && !messages.slice(i + 1).some(m => m.role === 'user');
    if (isLastUserMessage && suffix) {
      content = content + suffix;
    }

    const apiMsg = { role: msg.role, content };

    const images = Array.isArray(msg.images)
      ? msg.images.map(toBase64).filter(Boolean)
      : [];
    if (images.length) apiMsg.images = images;

    apiMessages.push(apiMsg);
  }
  return apiMessages;
}

module.exports = {
  buildApiMessages
};
