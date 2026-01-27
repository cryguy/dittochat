// Load .env file if available (not in SEA builds)
try { require('dotenv').config(); } catch {}

// Parse CLI arguments (for SEA builds)
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--base-url' || args[i] === '-b') && args[i + 1]) {
    process.env.OPENAI_BASE_URL = args[++i];
  } else if ((args[i] === '--api-key' || args[i] === '-k') && args[i + 1]) {
    process.env.OPENAI_API_KEY = args[++i];
  } else if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
    process.env.PORT = args[++i];
  } else if ((args[i] === '--db' || args[i] === '-d') && args[i + 1]) {
    process.env.DB_PATH = args[++i];
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Usage: chat [options]

Options:
  -b, --base-url <url>   OpenAI-compatible API base URL
  -k, --api-key <key>    API key
  -p, --port <port>      Server port (default: 3000)
  -d, --db <path>        Database file path (default: ./chat.db)
  -h, --help             Show this help message
`);
    process.exit(0);
  }
}

const { PORT, DB_PATH } = require('./src/config');
const { initDatabase, startAutoSave, startSessionCleanup, closeDatabase } = require('./src/db');
const { app, setupStaticFiles } = require('./src/app');

async function start() {
  await initDatabase();
  startAutoSave();
  startSessionCleanup();
  setupStaticFiles();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Database: ${DB_PATH}`);
  });
}

start().catch(console.error);

process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
