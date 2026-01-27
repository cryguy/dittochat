const EventEmitter = require('events');

// Map of chatId -> { content: string, done: boolean, timestamp: number, emitter: EventEmitter }
const activeStreams = new Map();

// Cleanup stale streams every minute
setInterval(() => {
  const now = Date.now();
  for (const [chatId, stream] of activeStreams) {
    // Remove streams older than 5 minutes
    if (now - stream.timestamp > 5 * 60 * 1000) {
      activeStreams.delete(chatId);
    }
  }
}, 60000);

function initStream(chatId) {
  console.log(`[StreamBuffer] initStream: ${chatId}`);
  const emitter = new EventEmitter();
  activeStreams.set(chatId, {
    content: '',
    done: false,
    timestamp: Date.now(),
    emitter,
  });
  return emitter;
}

function appendChunk(chatId, content) {
  const stream = activeStreams.get(chatId);
  if (stream) {
    stream.content += content;
    stream.timestamp = Date.now();
    stream.emitter.emit('chunk', content);
  } else {
    console.log(`[StreamBuffer] appendChunk: no stream found for ${chatId}`);
  }
}

function markDone(chatId) {
  console.log(`[StreamBuffer] markDone: ${chatId}`);
  const stream = activeStreams.get(chatId);
  if (stream) {
    stream.done = true;
    stream.emitter.emit('done');
    console.log(`[StreamBuffer] markDone: content length = ${stream.content.length}`);
    // Keep buffer for 30 seconds for late reconnects
    setTimeout(() => {
      console.log(`[StreamBuffer] deleting stream: ${chatId}`);
      activeStreams.delete(chatId);
    }, 30000);
  }
}

function getStream(chatId) {
  const stream = activeStreams.get(chatId);
  console.log(`[StreamBuffer] getStream: ${chatId} -> ${stream ? `found (done=${stream.done}, content=${stream.content.length} chars)` : 'NOT FOUND'}`);
  console.log(`[StreamBuffer] activeStreams keys: ${[...activeStreams.keys()].join(', ') || '(empty)'}`);
  return stream;
}

function abortStream(chatId) {
  const stream = activeStreams.get(chatId);
  if (stream && !stream.done) {
    console.log(`[StreamBuffer] abortStream: ${chatId}`);
    stream.aborted = true;
    stream.emitter.emit('abort');
    return true;
  }
  return false;
}

function deleteStream(chatId) {
  activeStreams.delete(chatId);
}

module.exports = {
  initStream,
  appendChunk,
  markDone,
  getStream,
  abortStream,
};
