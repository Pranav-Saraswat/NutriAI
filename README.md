# 🥗 NutriAI

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

> **NutriAI** is your personal, AI-powered nutrition and diet coach. Built for athletes and fitness enthusiasts, it leverages advanced AI vision and text models to analyze meals, track daily macro/hydration targets, and provide personalized training nutrition recommendations.

---

## ✨ Features

- 👤 **Onboarding & Goals Setup**: Structured profile setup covering age, gender, height, weight, activity levels, allergies, and target weight.
- 📸 **AI Vision Food Analyzer**: Drag-and-drop meal images to get automatic ingredient breakdown, calorie/macro counts, and confidence scores (powered by Groq Llama 3.2 Vision).
- 📝 **AI Text Meal Estimator**: Quick text descriptions (e.g., "3 scrambled eggs and an avocado") mapped to calorie/macro counts.
- 🛠️ **Macro Review & Corrections**: Edit meal name, ingredients, or macro estimates before committing them to your database log.
- 📊 **Athlete Dashboard**: Real-time Circular SVG progress gauges tracking Calories, Protein, Hydration, and Steps.
- 📈 **Weekly SVG Analytics**: Interactive custom SVG charts displaying caloric targets vs. logged intake, weekly weight fluctuations, and step/water logs.
- 💬 **Live Chat Coach**: Real-time streaming WebSocket connection with your AI nutrition coach for diet logs, cutting/bulking advice, and grocery lists.
- 🧪 **Comprehensive Tests**: Strict unit testing for target calculations and user instance methods with Jest.
- 🚀 **DevOps & CI/CD**: Production-grade Docker Compose setup with persistent DB/uploads volumes and automated GitHub Actions verification pipelines.

---

## 📂 Architecture & File Structure

```text
NutriAI/
├── .github/workflows/  # CI/CD Workflows
│   └── ci.yml          # Install, Typecheck, Test, and Containerize
├── backend/            # TypeScript Node.js/Express Server
│   ├── src/config/     # Database and Env configurations (db.ts, env.ts)
│   ├── src/middleware/ # Auth & Multer upload logic (auth.ts, upload.ts)
│   ├── src/models/     # Mongoose models (User, Meal, DailyLog, WeightLog, ChatMessage)
│   ├── src/routes/     # REST Controllers (authRoutes, userRoutes, mealRoutes, chatRoutes)
│   ├── src/services/   # AI services (aiMealService.ts, llmService.ts)
│   ├── src/sockets/    # Real-time WebSocket streaming handlers (chatSocket.ts)
│   ├── src/tests/      # Jest test suites
│   ├── dist/           # Compiled JS output for production
│   └── tsconfig.json   # Backend TS rules config
├── frontend/           # TypeScript React Client (Parcel Bundler)
│   ├── src/api/        # Axios API configurations (client.ts)
│   ├── src/components/ # Shared Navigation & Protected Route layouts
│   ├── src/pages/      # Main views (Dashboard, Analytics, Recommendations, Chat, Profile)
│   └── src/types/      # Strictly defined shared API interfaces (api.ts)
├── netlify/            # Netlify functions setup
└── docker-compose.yml  # Local stack orchestration (Mongo + Backend + Frontend Nginx)
```

---

## 📡 API Endpoints

### 🔐 Authentication & Profile
- `POST /api/auth/register` - Create an account.
- `POST /api/auth/login` - Obtain JWT session token.
- `POST /api/auth/logout` - Clear user session.
- `GET /api/auth/me` - Retrieve current athlete profile.
- `POST /api/profile-setup` - Initialize onboarding goal profile.
- `PUT /api/profile` - Update athlete console attributes.
- `GET /api/weight-log` & `POST /api/weight-log` - Log and view weight logs.

### 🥗 Meal Logging & AI
- `POST /api/meals/analyze` - Analyze uploaded meal photo (Multipart form) or description text (JSON). Returns recognized macro breakdown.
- `POST /api/meals` - Commit reviewed or manual meal log to history.
- `GET /api/meals` - Retrieve logged meals for a specific date (`?date=YYYY-MM-DD`).
- `PUT /api/meals/:id` - Edit a logged meal (marks database record as `isCorrected: true`).
- `DELETE /api/meals/:id` - Remove a meal log.
- `GET /api/meals/daily-summary` - Get goals vs. logged totals (calories, protein, carbs, fat, water, steps).
- `GET /api/meals/weekly-summary` - Aggregate calorie/protein logs, hydration levels, steps, and weight logs for the past 7 days.
- `GET /api/meals/recommendations` - Query LLM for meal choices fitting remaining today's target macros.

---

## 🚀 Installation & Setup

### 1. Environment Configuration
Clone the environment template and configure your credentials:
```bash
cp .env.example .env
```
Fill in the following variables:
- `MONGO_URI` (MongoDB connection URI)
- `JWT_SECRET` (JWT encryption key)
- `GROQ_API_KEY` (Groq SDK console API key)

### 2. Running Locally

**Backend (Express API):**
```bash
cd backend
npm install
npm run dev     # Starts compiler watch using tsx
```

**Frontend (React Client):**
```bash
cd frontend
npm install
npm run dev     # Launches local Parcel dev server on port 5173
```

### 3. Running with Docker Compose
To compile, prune, and spin up the complete containerized stack (Backend + Frontend served via Nginx + local MongoDB 7.0 database) with persistent volumes:
```bash
docker compose up --build
```
- App Client: [http://localhost:5173](http://localhost:5173)
- API Gateway: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🧪 Testing

To run the backend test suites verifying rounding logic, target formulas, and Mongoose User model instances:
```bash
cd backend
npm test
```
*Note: Jest runs in strict ESModule mode with `--experimental-vm-modules` flags enabled for typecheck compatibility.*
