# Vidhyut Saathi Franchise Management System

Production-grade, responsive Web & PWA Franchise Management Software built for **Vidhyut Saathi Energy Savers Pvt. Ltd.**

---

## 🚀 Technology Stack

- **Frontend**: React.js 18, Vite 6, Lucide Icons, Recharts, Tesseract OCR
- **Backend**: Node.js, Express.js (REST API v1), Helmet, Rate Limiter, Morgan
- **Database**: MongoDB Atlas Cluster + Mongoose ODM (Atomic Transactions & ACID Guarantees)
- **Security**: JWT Authentication, RBAC (Super Admin, State, District, Sub-Franchise), BCrypt password hashing, Dev/Live OTP Engine, Immutable Audit Trails
- **Geolocation**: HTML5 High-Accuracy Geolocation, OpenStreetMap Nominatim, BigDataCloud Reverse Geocoding with in-memory caching
- **PWA**: Web App Manifest (`manifest.json`), Offline Shell Service Worker (`sw.js`)

---

## 🏢 System Architecture & Completed Phases

1. **Phase 1: Foundation & RBAC Authentication**
   - Super Admin login & Partner OTP-based passwordless authentication.
   - Strict Role-Based Access Control (`SUPER_ADMIN`, `STATE_FRANCHISE`, `DISTRICT_FRANCHISE`, `SUB_FRANCHISE`).

2. **Phase 2: Franchise Partner & Territory Management**
   - Hierarchical franchise network onboarding (State $\rightarrow$ District $\rightarrow$ Sub-Franchise).
   - Real-time Aadhaar, PAN, Voter ID, and Driving License format verification & document OCR inspection.
   - Territorial authorization scoping by State & District.

3. **Phase 3: Card Inventory & Serial Management**
   - Unique alphanumeric card serial numbering (`VS000001` - `VS999999`).
   - Batch card generation, headquarters allocation, and immutable ownership tracking.

4. **Phase 4: Card Distribution & P2P Transactions**
   - Partner-to-Partner stock transfers with selling rates and OTP confirmation.
   - Payment proof upload, manual payment verification, and dispute resolution workflows.

5. **Phase 5: Customer Onboarding & Card Installation**
   - Customer profile registration (Residential, Commercial, Industrial).
   - Electrical load calculations (kW), recommended vs installed card intelligence.
   - MCB, electricity bill, installed card photos, and OTP customer confirmation.

6. **Phase 6: Live GPS Geolocation & Territory Audit**
   - Live browser GPS capture with accuracy meter telemetry ($\le 50\text{m}$ GOOD, $50-100\text{m}$ ACCEPTABLE, $>100\text{m}$ POOR).
   - Server-side reverse geocoding to detect actual district/state.
   - Automatic territory mismatch detection and Super Admin override audit trail.

7. **Phase 7: Reporting, Analytics & Export System**
   - Executive Business Intelligence dashboard with server-side MongoDB `$facet` aggregations.
   - Global date range filtering with period-over-period percentage growth.
   - Clear financial separation between P2P Stock Sales and Customer Installation Revenue.
   - Interactive charts (Recharts) and RFC 4180 CSV export for all tabular ledgers.
   - Global Single Card Serial & Customer Deep Audit Tracer.

8. **Phase 8: Notifications, Audit Logs, Security & PWA**
   - Real-time in-app notification bell with unread badge counter.
   - Read-only immutable audit log recording all system changes.
   - PWA installability on desktop and Android mobile browsers.
   - Live system health telemetry endpoint (`/api/v1/health`).

---

## 🛠️ Environment Configuration

### Backend Environment Variables (`backend/.env`)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/vidhyut_saathi?retryWrites=true&w=majority
JWT_SECRET=your_ultra_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000,https://app.vidhyutsaathi.com

# Optional External Production Integrations
FAST2SMS_API_KEY=your_fast2sms_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

---

## 🚀 Getting Started Locally

### 1. Backend Server Setup
```bash
cd backend
npm install
npm run seed:admin   # Seeds initial Super Admin account: admin@vidhyutsaathi.com / Admin@123456
npm run dev          # Starts Express server on http://localhost:5000
```

### 2. Frontend Admin Dashboard Setup
```bash
cd admin-dashboard
npm install
npm run dev          # Starts Vite React dev server on http://localhost:3000
```

### 3. Production Build
```bash
cd admin-dashboard
npm run build        # Generates optimized static PWA bundle in dist/
```

---

## 🧪 Automated Testing

```bash
cd backend
node src/scripts/testPhase8.js   # Full E2E & Production Readiness Suite
node src/scripts/testPhase7.js   # Analytics & Reporting Suite
node src/scripts/testPhase6.js   # GPS & Location Verification Suite
node src/scripts/testPhase3.js   # Card Inventory & Allocation Suite
```
