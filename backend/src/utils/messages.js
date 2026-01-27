function buildApiMessages(messages, systemPrompt, suffix) {
  const apiMessages = [];
  if (systemPrompt) apiMessages.push({ role: 'system', content: systemPrompt });

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isLastUserMessage = msg.role === 'user' && !messages.slice(i + 1).some(m => m.role === 'user');
    if (isLastUserMessage && suffix) {
      apiMessages.push({ role: msg.role, content: msg.content + suffix });
    } else {
      apiMessages.push({ role: msg.role, content: msg.content });
    }
  }
  return apiMessages;
}

module.exports = {
  buildApiMessages
};
