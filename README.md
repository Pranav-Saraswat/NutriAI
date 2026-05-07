# 🥗 NutriAI

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://www.netlify.com/)

> **NutriAI** is your personal, AI-powered diet coach. Designed for athletes and fitness enthusiasts, it bridges the gap between raw data and actionable nutrition guidance.

---

## 📸 Preview

<p align="center">
  <img src="./assets/landing.png" alt="NutriAI Landing Page" width="90%" />
  <br>
  <i>The NutriAI Landing Page - Discipline in every rep, and every meal.</i>
</p>

<p align="center">
  <img src="./assets/dashboard.png" alt="NutriAI Dashboard" width="90%" />
  <br>
  <i>The Athlete Console - Real-time tracking and AI coaching.</i>
</p>

---

## ✨ Key Features

- 👤 **Personalized Onboarding**: Tailored profiles based on age, height, weight, activity level, and dietary goals.
- 🤖 **AI Nutrition Coach**: Groq-powered chat for instant meal plans, macro calculations, and recovery tips.
- 📊 **Dynamic Dashboard**: Track your daily targets (Calories, Protein, Water, Steps) at a glance.
- 📈 **Weight Trends**: Log your weight and visualize progress with intuitive trend displays.
- 🔐 **Secure Auth**: JWT-based authentication for a private and personalized experience.
- 🌐 **Deploy Ready**: Fully optimized for Netlify (Frontend + Functions) and Docker environments.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler**: Parcel
- **Styling**: Modern CSS with glassmorphic aesthetics
- **State/Routing**: React Context API & React Router

### Backend
- **Runtime**: Node.js & Express
- **Database**: MongoDB (Atlas Compatible)
- **AI Integration**: Groq SDK (Llama 3.1)
- **Security**: JWT, Helmet, CORS

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account (or local MongoDB)
- Groq API Key

### 2. Environment Setup
Clone the example env file and fill in your credentials:
```bash
cp .env.example .env
```

| Key | Description |
| --- | --- |
| `MONGO_URI` | Your MongoDB connection string |
| `JWT_SECRET` | A strong random secret for auth |
| `GROQ_API_KEY` | Your Groq API key |

### 3. Run Locally

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. Docker (Alternative)
Run the entire stack with a single command:
```bash
docker compose up --build
```

### 5. Quick Clean Script
Use the provided `start.sh` for maintenance:
```bash
./start.sh --clean-docker
```

---

## 📂 Project Structure

```text
NutriAI/
├── backend/            # Express API & AI Services
│   ├── src/config/     # DB & App Config
│   ├── src/routes/     # API Endpoints
│   └── src/services/   # Groq AI Logic
├── frontend/           # React Dashboard
│   ├── src/components/ # Reusable UI
│   ├── src/pages/      # Main Views
│   └── src/styles/     # Design System
├── assets/             # Screenshots & Media
└── netlify/            # Serverless Deployment
```

---

## 📡 API Overview

| Category | Endpoint | Method | Description |
| --- | --- | --- | --- |
| **Auth** | `/api/auth/register` | `POST` | Create account |
| **Auth** | `/api/auth/login` | `POST` | Get JWT token |
| **User** | `/api/user` | `GET` | Get profile data |
| **Chat** | `/api/chat` | `POST` | Talk to AI Coach |
| **Stats** | `/api/weight-log` | `POST` | Add weight entry |

---

## 🛠️ Troubleshooting

- **API Connection Issues**: Ensure your `CORS_ORIGINS` in `.env` matches your frontend URL.
- **AI Not Responding**: Check your `GROQ_API_KEY` and ensure you haven't hit rate limits.
- **Database Errors**: For MongoDB Atlas, ensure you've whitelisted your IP in the Atlas Dashboard.

---

## 📄 License

This project is licensed under the MIT License.

---
<p align="center">Built with ❤️ by Pranav Saraswat.</p>
