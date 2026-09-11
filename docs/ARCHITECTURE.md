# Vidhyut Saathi Franchise Management System — System Architecture

**Organization**: Vidhyut Saathi Energy Savers Pvt. Ltd.  
**Version**: Phase 1 Foundation  

---

## 1. Monorepo Structure

```text
VIDHYUT-FRANCHISE-SOFTWARE/
├── backend/            # Node.js + Express + Mongoose REST API (Direct Atlas connection)
├── admin-dashboard/    # React.js + Vite Desktop Web Application (Light Corporate UI)
├── mobile-app/         # React Native + Expo Android Application
├── docs/               # System architecture, API, and database specifications
├── .gitignore          # Monorepo git ignore rules
└── README.md           # Master documentation & startup guide
```

---

## 2. Multi-tier Communication

```text
+------------------------------+     +-------------------------------+
|     Android Mobile App       |     |    Desktop Admin Dashboard    |
|    (React Native + Expo)     |     |       (React.js + Vite)       |
+------------------------------+     +-------------------------------+
                │                                    │
                │ HTTPS REST API                     │ HTTPS REST API
                ▼                                    ▼
       +----------------------------------------------------+
       |       Node.js + Express Backend REST API           |
       |  - JWT & RBAC Middleware                           |
       |  - Backend Territory Verification                  |
       |  - OTP Verification with TTL & Rate Limiting       |
       +----------------------------------------------------+
                                │
                                │ Mongoose Driver
                                ▼
       +----------------------------------------------------+
       |              MongoDB Atlas Cluster0                |
       |            Database: vidhyut_saathi                |
       +----------------------------------------------------+
```

---

## 3. Light Corporate Theme Tokens

| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| **Primary Accent** | `#0284C7` (Sky 600) | Primary CTA buttons, brand badges, active links |
| **Primary Hover / Dark** | `#0369A1` (Sky 700) | Button hover states, bold text accents |
| **Primary Light Surface** | `#E0F2FE` (Sky 100) | Pill badges, avatar backgrounds, highlights |
| **Background Main** | `#F8FAFC` (Slate 50) | App workspace background, card surfaces |
| **Surface Card** | `#FFFFFF` | Form cards, data tables, modals |
| **Headings & Bold Text** | `#0F172A` (Slate 900) | Page titles, partner names, metric numbers |
| **Secondary Text** | `#475569` (Slate 600) | Field labels, table descriptions |
| **Subtle Border** | `#E2E8F0` (Slate 200) | Card dividers, input outlines, table rows |

---

## 4. Phase-by-Phase Roadmap

1. **Phase 1 (Active)**: Architecture, Monorepo foundation, MongoDB connection, User & FranchisePartner models, Super Admin login, OTP authentication for partners, Franchise CRUD, Admin Dashboard, Android App.
2. **Phase 2 (Next)**: Card Inventory & Batch Lifecycle, Hardware specifications, Unique serial numbers, Distribution ledger.
3. **Phase 3**: Sub-Franchise Partner Network, District delegation, Sub-franchise mobile portal.
4. **Phase 4**: Customer Management, Card Installation Engine, Cloudinary MCB/ELCB photo capture, Live GPS territory verification against bounding polygons.
5. **Phase 5**: Firebase Cloud Messaging (FCM) push notifications, Commission accounting, Audit reports.
