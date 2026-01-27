# dittochat

A self-hosted chat application with OpenAI-compatible API support, resumable streaming, and customizable system prompts.

## Features

- **OpenAI-compatible API** - Works with any OpenAI-compatible backend (OpenAI, Anthropic via proxy, local models, etc.)
- **Resumable streaming** - Reconnect to in-progress streams if your connection drops
- **Model-specific prompts** - Configure different system prompts for different models
- **Prompt presets** - Save and switch between multiple prompt configurations
- **Chat history** - Persistent chat storage with SQLite
- **Auto-generated titles** - Chat titles generated automatically from conversation content
- **Message editing** - Edit any message and regenerate responses
- **Single executable** - Build as a Node.js SEA for easy deployment
- **Dark theme** - Clean, modern UI

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd dittochat

# Install dependencies
pnpm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API settings

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Building

```bash
# Build frontend and backend
pnpm build

# Build single executable (macOS/Linux)
pnpm build:backend
```

## Configuration

Create a `backend/.env` file:

```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
PORT=3000
```

## Project Structure

```
dittochat/
├── backend/
│   ├── server.js          # Entry point
│   ├── src/
│   │   ├── app.js         # Express app setup
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # OpenAI client, stream buffer
│   │   └── db/            # SQLite database
│   ├── prompt.json        # Default prompt configuration
│   └── build-sea.sh       # SEA build script
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── stores/        # Zustand state management
│   │   ├── api/           # API client modules
│   │   └── contexts/      # React contexts
│   └── vite.config.ts
└── package.json           # Monorepo root
```

## Tech Stack

**Backend:**
- Express.js
- OpenAI SDK
- sql.js (SQLite)
- bcryptjs (authentication)

**Frontend:**
- React 18
- TypeScript
- Vite
- Zustand (state management)
- virtua (virtualized lists)
- marked + DOMPurify (markdown)

## Credits

- **[horselock](https://horselock.us)** ([GitHub](https://github.com/horselock)) - [virtua-streaming-mutations](https://github.com/horselock/virtua-streaming-mutations) fork for optimized streaming list rendering.

## License

MIT