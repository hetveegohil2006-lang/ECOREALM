# EcoREALM 🌍
> Turn sustainable actions into a living world and watch your impact grow.

EcoREALM is a gamified carbon footprint awareness platform designed as a **Futuristic Environmental Restoration Command Center**. It transforms real-world ecological actions into dynamic digital assets. Players join an elite planetary restoration mission, logging daily eco-challenges, checking real-time carbon telemetry, and visualizing their environmental impact through an interactive, evolving 3D floating island ecosystem.

---

## 🚀 Key Features

* **Futuristic Command Center HUD**: Experience-driven user interface featuring neon accents, cyber glassmorphism dashboards, grid scanlines, and real-time planetary health indicators.
* **Dynamic 3D Floating Ecosystem**: Built with Three.js. Watch your sector grow with trees, flowers, solar arrays, and wind turbines as your restoration index increases. Includes day/night lighting controls and energy particle systems.
* **Onboarding Success Cinematic**: A post-registration cutscene that transitions a decayed industrial planet into a thriving, restored green biosphere with smooth GSAP animations.
* **Carbon Diagnostic scanning**: Conduct interactive consumption audits across Transport, Dietary load, Household Energy, and Waste loops to receive metric footprint telemetry.
* **Cosmic Arcade**: Play integrated eco-games (e.g. *Recycling Rush*, *Eco Quiz*, *Energy Grid Puzzle*, *Ocean Cleanup*, *Tree Simulator*) to earn bonus energy coins.
* **RPG Progression & Command Shop**: Unlock high-tier badges, custom titles, level-up milestones, and purchase upgrades from the Command Deck.
* **Collaborative Mainframe**: Monitor live telemetry feeds from other commanders and view real-time global ranks.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, EJS, Vanilla CSS (Glassmorphism & HUD components), Three.js, GSAP (GreenSock Animation Platform), FontAwesome
* **Backend**: Node.js, Express.js, Socket.io (real-time telemetry synchronizations), JSON Web Tokens (JWT), Cookie-Parser
* **Database**: MongoDB Atlas / Mongoose (with automated local developer fallback)
* **Security & Optimization**: Helmet, CORS, Express Rate Limit, Express Validator

---

## ⚡ In-Memory Mock Database Fallback (Developer Mode)

To facilitate a seamless out-of-the-box local development experience with zero configuration:
* EcoREALM features a **synchronous connection probe** at server boot.
* If a local or remote MongoDB instance is offline or unconfigured, the system automatically redirects all queries through a custom **in-memory Mongoose emulator** (`mongooseMock.js`).
* This enables registration, login, profile editing, mission logging, and diagnostic calculations to function instantly without requiring any local MongoDB installation.

---

## 📁 Repository Structure

```
ECOREALM/
├── config/                  # Database and mock configurations
├── controllers/             # API and EJS route handlers
├── middleware/              # Authentication, rate limiters, error handlers
├── models/                  # Mongoose data schemas (User, Challenge, etc.)
├── public/                  # Static assets
│   ├── css/                 # Glassmorphic HUD styles
│   └── js/                  # Interactive Three.js (realm-3d.js) and frontend controllers
├── routes/                  # Express REST and view endpoints
├── services/                # Third-party integrations (Nodemailer, Cloudinary, OpenAI)
├── utils/                   # XP engines and token utilities
├── views/                   # Dynamic EJS viewport templates
├── app.js                   # Application bootstrap entry point
└── Dockerfile               # Production containerization
```

---

## ⚙️ Quick Start

### 1. Configure Environment
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/ecorealm
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch Command Center
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to begin the planetary restoration mission.
