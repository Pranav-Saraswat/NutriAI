# NutriAI (MERN)

NutriAI is now migrated to a full MERN architecture with an Express-only runtime:

- React frontend (built from `frontend/`)
- Node.js + Express server (`backend/`) serving both API and frontend
- MongoDB database
- Socket.IO real-time token streaming
- Groq LLM integration for nutrition chat

## Features

- JWT-based authentication (register/login/me)
- Profile setup and profile editing flows
- Chat history + real-time streaming assistant responses
- Weight logging and daily target calculation
- Admin dashboard stats endpoint
- Docker Compose stack for MongoDB + Express app

## Project Structure

```text
frontend/      React app (TSX)
backend/       Express API + Mongoose + Socket.IO + static frontend serving
start.sh       setup and local/dev helper script
docker-compose.yml
Dockerfile     multi-stage image (frontend build + backend runtime)
```

## Environment Setup

1. Copy the env template:

```bash
cp .env.example .env
```

2. Required values to review in `.env`:

- `JWT_SECRET`
- `GROQ_API_KEY`
- `MONGO_URI` and `MONGO_DB_NAME`

## Run With Docker (Recommended)

```bash
docker compose up --build
```

Apps:

- App (frontend + API): `http://localhost:5000`
- API health: `http://localhost:5000/api/health`

## Run Locally (Without Docker)

### Build frontend once

```bash
cd frontend
npm install
npm run build
```

### Express server (serves API + built frontend)

```bash
cd backend
npm install
npm start
```

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### User

- `GET /api/user`
- `POST /api/profile-setup`
- `PUT /api/profile`
- `GET /api/weight-log`
- `POST /api/weight-log`

### Chat

- `POST /api/chat`
- `GET /api/chat-history`
- `DELETE /api/chat-history`

### Admin

- `GET /api/admin/dashboard` (admin only)

### Health

- `GET /api/health`

## Notes

- Legacy Flask/Python files have been removed.
- The active runtime path is the MERN stack under `frontend/` and `backend/`.
