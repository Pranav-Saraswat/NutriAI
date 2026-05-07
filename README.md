# NutriAI

NutriAI is a full-stack nutrition and fitness assistant for people who want a practical diet coach tied to their own profile, body metrics, and training goal. It combines a React dashboard, an Express API, MongoDB Atlas-ready persistence, and Groq-powered AI chat to generate meal guidance, macro targets, weight tracking insights, and fitness-focused recommendations.

The app is built as a MERN-style project with a Netlify deployment path for the frontend and API functions.

## Highlights

- Personalized onboarding for age, height, weight, activity level, dietary preferences, allergies, and goals
- AI nutrition chat with formatted answers, tables, quick prompts, copy actions, and retry support
- Short greeting handling so simple messages like `hi` receive a lightweight welcome instead of a full diet plan
- Daily target calculation for calories, protein, water, and steps
- Weight logging with recent trend display
- JWT authentication with register, login, logout, and current-user endpoints
- Admin dashboard statistics endpoint
- MongoDB Atlas compatible database configuration
- Netlify Functions support for `/api/*` routes
- Optional Socket.IO streaming for local/full backend deployments

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Parcel, React Router, Axios |
| Backend | Node.js, Express, Mongoose, JWT, Helmet, CORS |
| Database | MongoDB or MongoDB Atlas |
| AI | Groq SDK |
| Realtime | Socket.IO |
| Deployment | Netlify frontend + Netlify Functions API |
| Local stack | Docker Compose or separate frontend/backend processes |

## Project Structure

```text
NutriAI/
  backend/
    src/
      config/        Environment and database setup
      middleware/    Auth middleware
      models/        Mongoose models
      routes/        API routes
      services/      Groq/LLM service
      sockets/       Socket.IO chat streaming
      utils/         Daily target helpers
  frontend/
    src/
      api/           Axios client
      components/    Layout and route guards
      context/       Auth state
      pages/         App screens
      styles/        Main CSS
  netlify/
    functions/       Netlify API function wrapper
  docker-compose.yml
  netlify.toml
  start.sh
```

## Environment Variables

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Required values:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string. Use `mongodb+srv://...` for Atlas. |
| `MONGO_DB_NAME` | Database name, for example `nutriai_db`. |
| `JWT_SECRET` | Secret used to sign authentication tokens. Use a strong random value. |
| `GROQ_API_KEY` | Groq API key for AI chat. |
| `GROQ_MODEL` | Groq model name. Defaults to `llama-3.1-8b-instant`. |
| `CHAT_MAX_TOKENS` | Maximum AI response size. Defaults to `1200`. |
| `CHAT_HISTORY_LIMIT` | Number of recent messages sent as context. Defaults to `30`. |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins. |
| `TRUST_PROXY` | Set to `true` on Netlify or behind a proxy. |

MongoDB Atlas example:

```env
MONGO_URI=mongodb+srv://<username>:<url-encoded-password>@<cluster-host>/nutriai_db?retryWrites=true&w=majority
MONGO_DB_NAME=nutriai_db
```

If your Atlas password contains special characters such as `@`, `#`, `/`, or `:`, URL-encode it before placing it in `MONGO_URI`.

## Local Development

Install and run the backend:

```bash
cd backend
npm install
npm run dev
```

In another terminal, run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Local URLs:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| API | `http://localhost:5000` |
| Health check | `http://localhost:5000/api/health` |

## Docker Development

You can run the full stack with Docker Compose:

```bash
docker compose up --build
```

This starts MongoDB, the API server, and the frontend container.

## Netlify Deployment

This repository includes `netlify.toml` configured for:

- Building the frontend from `frontend/`
- Installing backend dependencies for the serverless API
- Publishing `frontend/dist`
- Routing `/api/*` to `netlify/functions/api.mjs`

Recommended Netlify settings:

| Setting | Value |
| --- | --- |
| Base directory | Empty or `.` |
| Build command | From `netlify.toml` |
| Publish directory | From `netlify.toml` |
| Functions directory | From `netlify.toml` |

Required Netlify environment variables:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://...
MONGO_DB_NAME=nutriai_db
JWT_SECRET=<strong-random-secret>
GROQ_API_KEY=<your-groq-key>
GROQ_MODEL=llama-3.1-8b-instant
CHAT_MAX_TOKENS=1200
CHAT_HISTORY_LIMIT=30
TRUST_PROXY=true
```

For MongoDB Atlas, open **Network Access** and allow Netlify to connect. For a first deployment test, `0.0.0.0/0` is the simplest option. Use tighter access rules later if your hosting setup allows stable outbound IPs.

## API Overview

### Auth

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a user account |
| `POST` | `/api/auth/login` | Sign in and receive a JWT |
| `POST` | `/api/auth/logout` | Logout response endpoint |
| `GET` | `/api/auth/me` | Get current authenticated user |

### User And Profile

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/user` | Get profile and daily targets |
| `POST` | `/api/profile-setup` | Complete onboarding profile |
| `PUT` | `/api/profile` | Update profile |
| `GET` | `/api/weight-log` | List recent weight logs |
| `POST` | `/api/weight-log` | Add a weight log |

### Chat

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/chat` | Send a message to the nutrition assistant |
| `GET` | `/api/chat-history` | Fetch recent chat history |
| `DELETE` | `/api/chat-history` | Clear chat history |

### Admin And Health

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Admin statistics |
| `GET` | `/api/health` | App and database health check |

## AI Behavior

The assistant is intentionally scoped to nutrition, fitness, healthy lifestyle, weight loss, weight gain, muscle building, and diet planning. Off-topic prompts receive a short domain restriction message.

Responses are guided to use structured formatting, including headings, bullet points, and markdown tables. The frontend renders those tables as readable scrollable tables in the chat UI.

## Troubleshooting

### `Cannot reach the API server`

The frontend cannot reach `/api`. On Netlify, confirm that:

- `netlify.toml` is committed
- The site base directory is empty or `.`
- `/api/*` redirects to `/.netlify/functions/api/:splat`
- The latest deploy completed successfully

### `Registration failed (502)`

Open Netlify function logs. Common causes:

- Missing dependency in the function bundle
- Missing `MONGO_URI`
- Atlas Network Access does not allow Netlify
- Wrong database user password

### `Database connection failed`

Check:

- `MONGO_URI` is set in Netlify, not only in local `.env`
- Atlas username/password are correct
- Password is URL-encoded
- Atlas Network Access allows inbound connections
- `MONGO_DB_NAME` matches the intended database

### Markdown tables show as raw pipe text

Redeploy the latest frontend. The chat renderer supports markdown tables, but older deployed bundles will still show raw `|` characters.

## Useful Commands

Frontend:

```bash
cd frontend
npm run typecheck
npm run build
```

Backend:

```bash
cd backend
npm run dev
npm start
```

Docker cleanup:

```bash
./start.sh --clean-docker
./start.sh --clean-docker-volumes
```

## Status

NutriAI is actively built around the MERN stack in `frontend/` and `backend/`. Legacy Flask/Python runtime paths are no longer part of the active application.
