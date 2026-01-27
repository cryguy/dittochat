function stripThinkingBlocks(content) {
  return content.replace(/<((?:antml:)?thinking)>[\s\S]*?<\/\1>/g, '').trim();
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
      apiMessages.push({ role: msg.role, content: content + suffix });
    } else {
      apiMessages.push({ role: msg.role, content });
    }
  }
  return apiMessages;
}

module.exports = {
  buildApiMessages
};
