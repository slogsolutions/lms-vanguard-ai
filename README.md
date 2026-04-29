# LMS-SLOG (Offline + Online AI Learning Platform)

A full-stack Learning Management System focused on AI-enabled learning workflows, including:
- Activity/content management
- Role-based auth (admin/soldier)
- Progress tracking
- Chat assistant with **offline (Ollama)** and **online tool connectors**
- Model registry (offline/online models shown in UI)

This repository is split into:
- `client/` - React + Vite + TypeScript frontend
- `server/` - Express + TypeScript + Prisma backend (SQLite by default)

---

## 1) Tech Stack

### Frontend (`client/`)
- React 19
- TypeScript
- Vite
- Redux Toolkit
- React Router
- Axios

### Backend (`server/`)
- Node.js + Express
- TypeScript
- Prisma ORM
- SQLite (via Prisma datasource)
- JWT auth via HTTP-only cookie

---

## 2) Project Structure

```text
LMS-SLOG/
  client/
    src/
      api/
      components/
      pages/
      store/
  server/
    prisma/
      schema.prisma
    src/
      controllers/
      routes/
      middleware/
      lib/
```

---

## 3) Prerequisites

Install these before setup:
- Node.js 18+ (recommended: latest LTS)
- npm 9+
- (Optional but recommended) Ollama for offline model inference
  - [https://ollama.com](https://ollama.com)

---

## 4) Environment Setup

Create a `.env` file in `server/`.

### `server/.env` example

```env
# Core server
PORT=5000
JWT_SECRET=change_this_to_a_long_random_secret
DATABASE_URL="file:./dev.db"

# Offline LLM (Ollama)
OLLAMA_URL=http://localhost:11434
# Optional fixed model override (if set, it is preferred)
MODEL=llama3.2:1b
# Optional timeout for Ollama chat in ms
OLLAMA_TIMEOUT_MS=120000

# Task-specific tool connectors (optional, for online/offline integrations)
ONLINE_PROMPT_TOOL_URL=
OFFLINE_VIDEO_TOOL_URL=
ONLINE_VIDEO_TOOL_URL=
OFFLINE_VOICE_TOOL_URL=
ONLINE_VOICE_TOOL_URL=
OFFLINE_SUMMARY_TOOL_URL=
ONLINE_SUMMARY_TOOL_URL=
OFFLINE_QUIZ_TOOL_URL=
ONLINE_QUIZ_TOOL_URL=
LIBRETRANSLATE_URL=
ONLINE_TRANSLATION_TOOL_URL=
OFFLINE_CONVERSION_TOOL_URL=
ONLINE_CONVERSION_TOOL_URL=
OFFLINE_COMMUNICATION_TOOL_URL=
ONLINE_COMMUNICATION_TOOL_URL=
ONLINE_GENERAL_TOOL_URL=

# Optional translation target (LibreTranslate mode)
TRANSLATE_TARGET=hi
```

Notes:
- If a task expects an online tool URL and that endpoint is not configured correctly, you may see tool errors.
- Prompting/general tasks support offline Ollama usage and can fall back locally when configured.

---

## 5) Install Dependencies

From project root:

```bash
cd server && npm install
cd ../client && npm install
```

On PowerShell, run commands with `;` between them if chaining.

---

## 6) Database Setup (Prisma + SQLite)

From `server/`:

```bash
npx prisma generate
npx prisma db push
```

Optional:

```bash
npx prisma studio
```

This opens Prisma Studio for visual DB inspection.

---

## 7) Ollama Setup (Offline Models)

1. Start Ollama service.
2. Pull at least one model:

```bash
ollama pull llama3.2:1b
```

3. Verify models:

```bash
ollama list
```

4. Ensure `OLLAMA_URL` in `server/.env` points to the correct host/port.

---

## 8) Run the App

### Start backend
From `server/`:

```bash
npm run dev
```

Backend default URL: `http://localhost:5000`

### Start frontend
From `client/`:

```bash
npm run dev
```

Frontend default URL: typically `http://localhost:5173`

The frontend API base URL is set in `client/src/api/axios.ts`:
- `http://localhost:5000/api`

---

## 9) Build for Production

### Backend
From `server/`:

```bash
npm run build
```

### Frontend
From `client/`:

```bash
npm run build
```

---

## 10) API Overview

Base URL: `http://localhost:5000/api`

### Auth (`/api/auth`)
- `POST /login`
- `POST /logout`
- `POST /signup` (protected + admin)
- `GET /users` (protected + admin)
- `GET /profile` (protected)

### Content
- `GET /content` (protected)
- `GET /content/:id` (protected)
- `POST /content` (protected)
- `PUT /content/:id` (protected)
- `DELETE /content/:id` (protected)
- `POST /content/:id/progress` (protected)

### Chat
- `POST /chat` (protected)
- `GET /chats` (protected)
- `GET /chats/:id/messages` (protected)
- `DELETE /chats/:id` (protected)

### AI Models
- `GET /models` (protected)
- `POST /models` (protected + admin)

---

## 11) Data Model (High-Level)

Main Prisma models:
- `User`
- `Content` (learning activity/task)
- `UserProgress`
- `Chat`
- `Message`
- `AIModel`

See full schema in `server/prisma/schema.prisma`.

---

## 12) Common Troubleshooting

### A) "AI Tool Error ... 405 method not allowed"
Cause:
- Configured tool URL exists but does not accept the request method or payload.

Fix:
- Validate the configured `*_TOOL_URL` endpoint.
- Confirm it accepts `POST` with JSON body.
- For offline use, make sure Ollama is running and model is available.

### B) Offline model not responding
Checklist:
- `OLLAMA_URL` is correct.
- Ollama service is running.
- Model exists (`ollama list`).
- Increase `OLLAMA_TIMEOUT_MS` if model is slow on first token.

### C) 401 unauthorized
Cause:
- Missing/expired auth cookie token.

Fix:
- Login again via UI.
- Verify frontend and backend URLs/ports match expected local setup.

### D) CORS issues
Backend allows:
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:5175`

If frontend runs on another port, update CORS config in `server/src/index.ts`.

---

## 13) Security Notes

- This project uses JWT in HTTP-only cookies.
- Do not commit real secrets in `.env`.
- For online tools, avoid sending sensitive/classified content.

---

## 14) Recommended Next Improvements

- Add a root-level script runner (e.g., concurrently start client + server)
- Add request/response schema validation (e.g., Zod)
- Add automated tests (API + UI)
- Add dockerized local dev setup
- Add role/permission hardening for content management endpoints

---

## 15) License

No license declared yet. Add a `LICENSE` file if this project is intended for distribution.

