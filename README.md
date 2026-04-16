# NutriAI (MERN)

NutriAI is now migrated to a full MERN architecture:

- React frontend (built from `frontend/`)
- Node.js + Express API server (`backend/`)
- MongoDB database
- Socket.IO real-time token streaming
- Groq LLM integration for nutrition chat

## Features

- JWT-based authentication (register/login/me)
- Profile setup and profile editing flows
- Chat history + real-time streaming assistant responses
- Weight logging and daily target calculation
- Admin dashboard stats endpoint
- Docker Compose stack for MongoDB + API + frontend (Nginx)

## Project Structure

```text
frontend/      React app (TSX) + Nginx config + Dockerfile
backend/       Express API + Mongoose + Socket.IO + Dockerfile
start.sh       setup and local/dev helper script
docker-compose.yml
backend/Dockerfile
frontend/Dockerfile
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

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000`
- API health: `http://localhost:5000/api/health`

## Run Locally (Without Docker)

### API server

```bash
cd backend
npm install
npm run dev
```

### React client

```bash
cd frontend
npm install
npm run dev
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

## Maintenance

Use the Docker cleanup helper to reclaim local Docker storage:

```bash
./start.sh --clean-docker
```

To also prune unused volumes:

```bash
./start.sh --clean-docker-volumes
```
