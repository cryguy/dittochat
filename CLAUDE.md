# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Project:** dittochat - A chat application with OpenAI-compatible API support.

## Common commands
- Install dependencies: `pnpm install` (from root)
- Run dev server: `pnpm dev` or `pnpm start`
- Build frontend only: `pnpm build:frontend`
- Build everything: `pnpm build`
- Build SEA binary: `pnpm build:backend` (from root) or `./build-sea.sh` (from backend/)

## High-level architecture

This is a pnpm monorepo with two packages:

### `/backend`
- **Entry point:** `server.js` - starts Express server, serves static files from `frontend/dist/`, and handles all API routes.
- **`src/app.js`** - Express app setup, route mounting, and static file serving (with SEA support).
- **`src/routes/`** - API endpoints:
  - `auth.js` - Authentication (bcryptjs)
  - `chats.js` - Chat CRUD operations
  - `chat.js` - SSE streaming for chat completions
  - `models.js` - Model listing from upstream API
  - `prompts.js` - System prompt presets
  - `modelPrompts.js` - Model-to-prompt mappings
  - `settings.js` - User settings
  - `openai.js` - OpenAI-compatible `/v1` API passthrough
- **`src/services/`**:
  - `openai.js` - OpenAI SDK client wrapper
  - `streamBuffer.js` - In-memory buffer for resumable SSE streams
- **`src/db/index.js`** - sql.js (SQLite) database
- **`build-sea.sh`** - Builds Node.js Single Executable Application bundling frontend + backend

### `/frontend`
- React 18 + TypeScript + Vite, outputs to `frontend/dist/`
- **State management:** Zustand (`src/stores/chatStore.ts`)
- **Key libraries:** virtua (virtualized lists), marked + DOMPurify (markdown rendering)
- **`src/api/`** - API client modules for each backend route
- **`src/components/`** - React components organized by feature (chat, sidebar, settings, auth, layout)
- **`src/contexts/`** - Auth and Settings React contexts
- Proxies `/api` and `/v1` requests to backend during development

### Key patterns
- **Resumable streaming:** `streamBuffer.js` keeps active streams in memory, allowing clients to reconnect and resume mid-stream.
- **Model-specific prompts:** Each model can have a different system prompt preset via the model-prompts mapping.
- **Default prompt configuration:** `backend/prompt.json`
- **Database:** sql.js (SQLite in-memory/file)
