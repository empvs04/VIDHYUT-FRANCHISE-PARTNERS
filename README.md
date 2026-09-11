# Vidhyut Saathi Franchise Management System

Production-ready enterprise software platform for **Vidhyut Saathi Energy Savers Pvt. Ltd.**

This repository hosts the **Phase 1 Foundation** covering multi-tier architecture, Super Admin web portal, Android partner application, backend REST API, and MongoDB Atlas database integration.

---

## 📁 Monorepo Architecture

```text
VIDHYUT-FRANCHISE-SOFTWARE/
├── backend/            # Node.js + Express + Mongoose REST API
├── admin-dashboard/    # React.js + Vite Desktop Web Admin Portal
├── mobile-app/         # React Native + Expo Android Partner App
├── docs/               # System architecture, API & DB design specifications
├── .gitignore          # Repository git ignore rules
└── README.md           # Master documentation
```

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Android App** | React Native, Expo, Expo-SecureStore |
| **Desktop Admin** | React.js (Vite), Lucide Icons, Pure CSS Design System |
| **Backend API** | Node.js, Express.js (ES Modules) |
| **Database** | MongoDB Atlas (`vidhyut_saathi`), Mongoose ORM |
| **Authentication** | Mobile Number + OTP (Partners), Bcrypt Password + JWT (Super Admin) |
| **Authorization** | Role-Based Access Control (RBAC) + Territory Middleware |

---

## 🚀 Quick Setup & Startup Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- MongoDB Atlas Cluster Connection String (`MONGODB_URI`)

---

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your MongoDB Atlas connection string:
```ini
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/vidhyut_saathi?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key
ADMIN_EMAIL=admin@vidhyutsaathi.com
ADMIN_PASSWORD=Admin@Vidhyut2026!
```

**Seed Initial Super Admin**:
```bash
npm run seed:admin
```

**Start Backend Development Server**:
```bash
npm run dev
# Running on http://localhost:5000
# Health check: http://localhost:5000/api/v1/health
```

---

### 3. Desktop Admin Dashboard Setup
```bash
cd admin-dashboard
npm install
npm run dev
# Accessible on http://localhost:3000
```
- Login with the seeded Super Admin credentials (`admin@vidhyutsaathi.com` / `Admin@Vidhyut2026!`).

---

### 4. Android Partner Mobile App Setup
```bash
cd mobile-app
npm install
npm run start
# Press 'a' to open in Android Emulator or scan QR in Expo Go
```

---

## 🔐 Security Highlights
- **Strict Role-Based Access Control (RBAC)**: Protects administrative routes from non-admin users.
- **Backend-Enforced Territory Rules**: Restricts partner operations strictly to authorized state and district boundaries.
- **OTP Protection**: Salted hashing, 5-minute MongoDB TTL auto-cleanup, 5-attempt brute force threshold, and 60-second cooldown timer.
- **Zero Direct DB Access from Clients**: Mobile and Web applications communicate solely through authenticated `/api/v1` REST endpoints.
- **Light Corporate Design System**: Crisp white surfaces (`#FFFFFF`), electric blue highlights (`#0284C7`), dark navy typography (`#0F172A`), and clean cards.

---

## 📚 Detailed Documentation
- [System Architecture](file:///docs/ARCHITECTURE.md)
- [REST API Specification](file:///docs/API_SPECIFICATION.md)
- [Territory System & GPS Rules](file:///docs/TERRITORY_RULES.md)
- [MongoDB Database Schema](file:///docs/DATABASE_SCHEMA.md)
