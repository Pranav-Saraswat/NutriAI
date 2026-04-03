# NutriAI

NutriAI is a Flask-based AI nutrition assistant with:

- User registration and login
- Personalized health profile setup
- AI chat for nutrition and fitness guidance
- MongoDB-backed user and chat storage
- Daily calorie, protein, water, and step targets
- Docker support for local full-stack setup
- Optional Cloudflare Tunnel scripts for public sharing

## Tech Stack

- Python
- Flask
- MongoDB
- Groq API
- Docker Compose

## Features

- Secure authentication with hashed passwords
- CSRF protection for forms and AJAX requests
- Session-based login with optional "remember me"
- User profile management
- Chat history storage and clearing
- Health check endpoint for app and database status
- Personalized daily target calculations based on user profile

## Project Structure

```text
NutriAI/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── models.py
│   ├── routes.py
│   └── services.py
├── static/
├── templates/
├── .env.example
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── scripts/
│   ├── cloudflare-tunnel.sh
│   └── setup-dev.sh
├── requirements.txt
├── run.py
└── README.md
```

## Local Setup

### 1. Create a virtual environment

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Create your environment file

Copy [`.env.example`](/c:/Users/Prana/Downloads/NutriAI/.env.example) to `.env` and update the values.

Required values:

- `SECRET_KEY`
- `MONGO_URI`
- `MONGO_DB_NAME`
- `GROQ_API_KEY`

### 4. Start MongoDB

If you already have MongoDB installed locally, make sure it is running on the URI from `.env`.

Default local URI:

```text
mongodb://localhost:27017/
```

### 5. Run the app

```bash
python run.py
```

Open:

```text
http://127.0.0.1:5000
```

## Docker Setup

This project includes a Flask app container and a MongoDB container.

### 1. Prepare environment variables

Create `.env` from [`.env.example`](/c:/Users/Prana/Downloads/NutriAI/.env.example).

For Docker Compose, the Mongo host is overridden automatically to:

```text
mongodb://mongo:27017/
```

### 2. Start the stack

```bash
docker compose up --build
```

### 3. Stop the stack

```bash
docker compose down
```

To remove the MongoDB volume too:

```bash
docker compose down -v
```

## One-Command Linux Setup

For Ubuntu/Debian, the repo now includes a bootstrap script:

```bash
chmod +x scripts/*.sh
./scripts/setup-dev.sh --all
```

What `--all` does:

- creates `.env` from `.env.example` if missing
- installs Docker Engine and Docker Compose plugin
- installs `cloudflared`
- starts the NutriAI Docker stack

Useful variants:

```bash
./scripts/setup-dev.sh --create-env --install-docker --install-cloudflared
./scripts/setup-dev.sh --install-mongo-local
./scripts/setup-dev.sh --start-docker
```

Notes:

- The setup script currently targets Ubuntu/Debian on Linux.
- `--install-mongo-local` installs MongoDB directly on the host instead of using Docker.
- On Debian 12, the script intentionally recommends Docker MongoDB instead of the MongoDB 7.0 apt path.

## Local MongoDB Installation

If you want MongoDB on the host instead of Docker:

```bash
./scripts/setup-dev.sh --install-mongo-local
```

After installation, the script starts and enables `mongod` automatically.

Default local Mongo URI:

```text
mongodb://localhost:27017/
```

If you use Docker Compose instead, the app connects to:

```text
mongodb://mongo:27017/
```

## Cloudflare Tunnel

You can expose the local app publicly using Cloudflare Tunnel.

### Quick tunnel for testing

```bash
./scripts/cloudflare-tunnel.sh
```

This exposes:

```text
http://localhost:5000
```

You can also point it to a custom local URL:

```bash
./scripts/cloudflare-tunnel.sh --url http://localhost:5000
```

### Named tunnel with token

Add this to `.env`:

```text
CLOUDFLARE_TUNNEL_TOKEN=your_token_here
```

Then run:

```bash
./scripts/cloudflare-tunnel.sh --named
```

This is the better path for a stable hostname.

## Environment Variables

Common variables used by the app:

| Variable | Description | Example |
| --- | --- | --- |
| `APP_ENV` | App mode | `development` or `production` |
| `SECRET_KEY` | Flask session secret | `change-me` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/` |
| `MONGO_DB_NAME` | Mongo database name | `nutriai_db` |
| `MONGO_TIMEOUT_MS` | Mongo timeout in ms | `3000` |
| `GROQ_API_KEY` | Groq API key | `your-key` |
| `GROQ_MODEL` | Groq model name | `llama-3.1-8b-instant` |
| `MAX_CONTENT_LENGTH` | Max request payload size | `16777216` |
| `SESSION_COOKIE_SECURE` | Secure cookie flag | `False` locally, `True` behind HTTPS |
| `SESSION_LIFETIME_DAYS` | Remember-me session duration | `30` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://127.0.0.1:5000,http://localhost:5000` |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token for a named Cloudflare Tunnel | `token-from-cloudflare` |
| `APP_URL` | Local URL to expose with quick tunnel | `http://localhost:5000` |

## API Endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` | `GET` | App and database health status |
| `/api/chat` | `POST` | Send a chat message |
| `/api/user` | `GET` | Get current user profile data |
| `/api/chat-history` | `DELETE` | Clear chat history |

## Security Notes

- Passwords are stored using Werkzeug password hashing.
- CSRF protection is enabled for state-changing requests.
- Basic secure headers are added to responses.
- `.env` is ignored by git and Docker build context.

## Important Note About Secrets

If you previously stored a real API key in `.env`, rotate it and replace it with a new one. Do not commit real secrets into source control.

## Troubleshooting

### MongoDB connection refused

If you see errors like `localhost:27017 connection refused`, MongoDB is not running or `MONGO_URI` is incorrect.

### Groq API not working

Check:

- `GROQ_API_KEY` is set
- Internet access is available
- The configured `GROQ_MODEL` is valid

### Docker command not found

Install Docker Desktop or Docker Engine, then retry:

```bash
docker compose up --build
```

### cloudflared command not found

Install it with the setup script:

```bash
./scripts/setup-dev.sh --install-cloudflared
```

Or install it manually using Cloudflare's instructions for your OS.

## Development Notes

- `run.py` starts the Flask development server locally.
- Docker uses `gunicorn` for a more production-like app server.
- The health endpoint is useful for readiness checks and debugging.

## Future Ideas

- Add meal logging and progress tracking
- Add admin analytics/dashboard
- Add profile photo and richer onboarding
- Add tests for auth, chat, and profile flows
