<div align="center">
  <h1>🥗 NutriAI</h1>
  <p><strong>Your Personal AI Nutrition & Fitness Assistant</strong></p>

  <!-- Badges -->
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
</div>

<br />

> **NutriAI** is an intelligent, full-stack, Flask-based application that acts as your personalized nutrition coach. With real-time AI capabilities, robust security layers, and an integrated Metahuman interface, it offers holistic health tracking, chat streaming, and personalized dieting recommendations!

---

## ✨ Key Features

| Feature | Description |
| ------- | ----------- |
| ⚡ **Live AI Chat** | Ask questions and get real-time token streaming from Groq via WebSockets. |
| 🤖 **Metahuman Ready** | UI boilerplate prepared for live 3D Avatar streaming (like HeyGen or D-ID). |
| 🛡️ **Tight Security** | CSRF protection, Flask-Limiter for throttling, and Talisman HTTP headers. |
| ⚖️ **Weight Tracking**| Log your body weight and visualize your journey toward your goal. |
| 📊 **Admin Dashboard**| Role-based access control with an internal overview of data and connections. |

## 🚀 Quick Start (Docker Setup)

The easiest way to get NutriAI running is through Docker Compose.

### 1. Configure the Environment
Clone the repository and copy the environment template:
```bash
cp .env.example .env
```
Ensure you add your `GROQ_API_KEY` to the `.env` file!

### 2. Run the Stack
Start both the Flask application and MongoDB containers using Docker Compose.
```bash
docker compose up --build
```
> **Tip:** NutriAI will now be running on `http://localhost:5000`.

## 🤖 Automated Setup Script

NutriAI includes a powerful cross-platform bash script (`scripts/setup-dev.sh`) to simplify environment configuration, dependency installation, and application execution across **Windows, macOS, and various Linux distributions** (Ubuntu, Debian, Fedora, Arch).

### Basic Usage
```bash
./scripts/setup-dev.sh [options]
```

### Setup Features
- **`--create-env`**: Automatically copies `.env.example` to `.env` if missing.
- **`--all`**: Runs the complete setup by creating `.env`, installing Docker & Cloudflared, and starting the Docker stack and tunnel.

### Installation Features
- **`--install-docker`**: Installs Docker Desktop (macOS/Windows via Winget) or Docker Engine (Linux).
- **`--install-cloudflared`**: Installs Cloudflare's `cloudflared` utility for secure web tunnels.
- **`--install-mongo-local`**: Installs MongoDB Community Server natively for local environments.

### Execution Features
- **`--start-docker`**: Builds and starts the application stack using Docker Compose.
- **`--start-flask`**: Runs the Flask application directly (`python run.py`).
- **`--start-tunnel`**: Exposes the application securely to the internet via Cloudflare Quick Tunnels.
- **`--named-tunnel`**: Uses a secure named Cloudflare Tunnel (requires `CLOUDFLARE_TUNNEL_TOKEN` in `.env`).

> **Note:** Options can be seamlessly combined! For example: `./scripts/setup-dev.sh --start-flask --start-tunnel` will test your app locally while sharing it publicly.

## ⚙️ Environment Variables

NutriAI relies on several configuration keys. Update your `.env` appropriately:

| Variable | Example Value | Description |
| -------- | ------------- | ----------- |
| `SECRET_KEY` | `super-secret` | Flask session cookie secret. |
| `MONGO_URI` | `mongodb://mongo:27017/` | Connection URI for the database. |
| `GROQ_API_KEY` | `gsk_XXX` | Required API key for the AI Chat interface. |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | The model size specified for Groq predictions. |

---

## 🛠 Manual Installation

If you prefer to run it manually without Docker:
1. Copy `.env.example` to `.env` and set the required variables.
2. Install MongoDB on your system.
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Application:
   ```bash
   python run.py
   ```

<br />

<div align="center">
  <sub>Built with ❤️ by the NutriAI Community</sub>
</div>
