# 🍲 ShareMeal — Surplus Food Donation & Distribution Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-Backend%20API-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat&logo=postgresql&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **ShareMeal** is a full-stack, community-driven food donation platform engineered to bridge the gap between surplus food providers (restaurants, caterers, households) and vulnerable communities through verified NGOs and anonymous receiver channels.

---
## 🔗 Live URL

- **Website (Frontend):** https://sharemeal-cse-470-project.vercel.app
- **Backend API (Render):** https://sharemeal-cse470-project.onrender.com

---

## 📑 Table of Contents
- [Project Overview](#-project-overview)
- [Group 4 Team Members](#-group-4-team-members)
- [Sprint-by-Sprint Task Breakdown](#-sprint-by-sprint-task-breakdown)
- [Detailed Contributions — Hridoy Islam](#-detailed-contributions--hridoy-islam)
- [Key Features & Role Portals](#-key-features--role-portals)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Workspace Directory Structure](#-workspace-directory-structure)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Security & Trust Architecture](#-security--trust-architecture)
- [Deployment Configuration](#-deployment-configuration)
- [Course Acknowledgement](#-course-acknowledgement)

---

## 🌍 Project Overview

Food waste and food insecurity coexist in our communities. Millions of meals are discarded daily by restaurants, banquet halls, and individual donors while nearby shelters and families face hunger. 

**ShareMeal** provides a transparent, secure, and intuitive digital bridge:
- Donors post edible surplus food before it spoils.
- Verified NGOs discover nearby food via interactive maps and schedule collections.
- Receivers can request meals with complete anonymity and claim them with scoped pickup PIN codes.
- Administrators audit NGO verification documents, investigate abuse reports, and ensure platform safety.

---

## 👥 Group 4 Team Members & Engineering Distribution

| Name | Engineering Role | Actual Contribution & Leadership |
| :--- | :--- | :--- |
| **Hridoy Islam** | **Project Lead & Lead Full-Stack Architect** Primary Contributor |  Built the complete end-to-end platform across all 4 portals (Donor, Receiver, NGO, Admin), designed the PostgreSQL database schema (19 migrations), Leaflet Map engine, Handover PIN verification system, AES-256 field encryption, GitHub Actions CI/CD, and Trust & Support portal. |
| **Maliha Dil Tasnim Taky (Taky)** | Frontend & Security Contributor  | Assisted with Rate Limiting integration, State Machine testing, moderation report forms, and UI styling polish. |
| **Khandoker Md. Ragib Ahsan (Ragib)** | Backend Contributor  | Assisted with notification triggers, serving log testing, and collection approval flow testing. |
| **Tausif Hasan Kibria (Tousif)** | QA & Security Contributor  | Assisted with mobile responsive checks, CAPTCHA verification testing, and route security audit. |

---

## 🚀 Sprint-by-Sprint Task Breakdown (Course Plan)

### 🔹 Sprint 1 (Week 1): Core Setup and Donor Side
* **👤 Hridoy Islam — Items 1, 5 )**
  * `1:` **User Authentication and Verification** — Signup & login system for donors and receivers, phone/NID verification.
  * `5:` **Password Encryption** — Password hashing using `bcrypt`, ensuring plain-text passwords are never stored.
* **👤 Ragib (Khandoker Md. Ragib Ahsan) — Items 2, 3**
  * `2:` **Post Food** — Form for donors to create a food donation post.
  * `3:` **Food Details & Uploads** — Food type, quantity, expiry time, pickup location, and image upload fields.
* **👤 Taky (Maliha Dil Tasnim Taky) — Item 6**
  * `6:` **Basic Rate Limiting** — Prevent bots and malicious actors from spamming signups or creating fake posts.
* **👤 Tousif (Tausif Hasan Kibria) — Item 4**
  * `4:` **Mobile Friendly** — Base responsive layout so the platform works properly across all mobile viewports.

---

### 🔹 Sprint 2 (Week 2): Discovery and NGO Flow
* **👤 Hridoy Islam — Items 1, 2, 5 (Lead Implementation)**
  * `1:` **NGO Role and Verification** — Dedicated NGO registration flow with document upload & admin audit workflow.
  * `2:` **View Nearby Food, Search & Filter** — Food discovery list, keyword search, and category/perishability filters.
  * `5:` **Interactive Map View** — Dynamic Leaflet map displaying active pickup points with informative popups.
* **👤 Ragib (Khandoker Md. Ragib Ahsan) — Item 3**
  * `3:` **Collection Request & Accept/Reject** — NGO collection request pipeline with donor approval/rejection controls.
* **👤 Taky (Maliha Dil Tasnim Taky) — Item 4**
  * `4:` **Donation Status Machine** — Tracking food lifecycle (`Available` ➔ `Requested` ➔ `Collected` ➔ `Distributed`).
* **👤 Tousif (Tausif Hasan Kibria) — Items 6, 7**
  * `6:` **CAPTCHA on Signup and Requests** — Anti-bot challenge on public auth forms to block automated spam.
  * `7:` **HTTPS & API Token Authentication** — Encrypted data transit and Bearer JWT token API guards.

---

### 🔹 Sprint 3 (Week 3): Receiver Flow and Trust Features
* **👤 Hridoy Islam — Items 1, 3 (Lead Implementation)**
  * `1:` **Request Food, Anonymous Receiver, Pickup Code** — Core receiver request flow, identity masking & scoped pickup PIN codes.
  * `3:` **Proof of Receipt Photo** — Confirmation handover photo upload when food is collected or distributed.
* **👤 Ragib (Khandoker Md. Ragib Ahsan) — Item 2**
  * `2:` **Notification System** — Real-time notification updates across donors, NGOs, and receivers.
* **👤 Taky (Maliha Dil Tasnim Taky) — Item 4**
  * `4:` **Data Encryption for Sensitive Fields** — Database-level AES-256 encryption for receiver real names and NID credentials.
* **👤 Tousif (Tausif Hasan Kibria) — Item 5**
  * `5:` **Request Throttling per User** — User-level rate-limiting counters preventing rapid food request spamming.

---

### 🔹 Sprint 4 (Week 4): Ratings, Reporting, and Polish
* **👤 Hridoy Islam — Items 2, 3 (Part 1) (Lead Implementation)**
  * `2:` **History, Post Sharing & Leaderboard** — Donation history, food post sharing, and top donor ranking leaderboard.
  * `3 (Part 1):` **Food Journey Tracking** — Unified query joining donor post ➔ NGO collection ➔ receiver distribution.
* **👤 Ragib (Khandoker Md. Ragib Ahsan) — Items 1 (Part 1), 3 (Part 2)**
  * `1 (Part 1):` **Rating & Reviews** — 1-to-5 star rating and feedback system across donors, NGOs, and receivers.
  * `3 (Part 2):` **Serving Logs** — NGO serving logs and cumulative people-served impact metrics.
* **👤 Taky (Maliha Dil Tasnim Taky) — Items 1 (Part 2), 6**
  * `1 (Part 2):` **Report User & Flagging** — Moderation reporting system for suspicious posts or abusive accounts.
  * `6:` **UI Polish & Quality Assurance** — Unified styling, feedback toasts, bug fixes, and edge-case testing.
* **👤 Tousif (Tausif Hasan Kibria) — Items 4, 5**
  * `4:` **Final Security Audit** — Sanitization checks, CORS policy verification, and route guard regression testing.
  * `5:` **Bot Detection on Leaderboards** — Anomaly checks preventing automated scripts from gaming ratings or rankings.

---

## 👨‍💻 Complete Full-Stack Engineering Showcase — Hridoy Islam

As the **Lead Architect & Primary Full-Stack Engineer**, Hridoy Islam designed, developed, and delivered the core software systems of ShareMeal. Below is the comprehensive architecture and feature inventory personally engineered:

### 1. 🏗️ Full-Stack System Architecture & Cloud Database
* **Monolithic MVC Engine:** Designed and implemented the unified Express.js REST API and React 18 Single Page Application architecture, featuring unified port deployment (`server/app.js` serving `client/dist`).
* **Relational Database Design:** Architected the complete PostgreSQL schema hosted on AWS Supabase with transaction poolers, indexing, foreign keys, and 19 progressive SQL migrations (`server/migrations/`).
* **Database Connection Resilience:** Built custom connection pooler with automated fallback between standard port `5432` and session port `6543` for networks/ISPs blocking PostgreSQL ports (`server/config/db.js`).

### 2. 🔐 Authentication, Identity Verification & Role Security
* **Multi-Role Authentication:** Built full signup, login, OTP verification, password reset, and role-based redirection for Donors, Receivers, NGOs, and Administrators.
* **National ID & Phone Validation:** Implemented strict regex parsing for Bangladesh phone numbers (`+880` format) and 10/17-digit National ID (NID) cards with real-time duplicate conflict detection.
* **Stateless JWT Security:** Generated secure JSON Web Tokens with 7-day lifespans and created higher-order route protection components in React.
* **Password Hashing:** Implemented salted cryptographic password hashing using `bcryptjs` with factor 10.
* **Relevant Files:** `server/controllers/authController.js`, `server/models/userModel.js`, `client/src/pages/auth/Login.jsx`, `client/src/pages/auth/Signup.jsx`, `client/src/components/common/ProtectedRoute.jsx`.

### 3. 🍲 Donor Management & Donation Pipeline
* **Post Food Donation Pipeline:** Built full donor posting workflow with title, description, category selection (`Cooked`, `Raw`, `Bakery`, `Non-veg`), packet counts, dietary tags, address coordinates, and multi-file image upload with Multer and Supabase Storage.
* **Perishability Countdown:** Programmed real-time expiry countdown timers warning donors and recipients before meals expire.
* **My Donations Dashboard:** Created comprehensive donation manager to inspect active, claimed, and completed posts with status badges.
* **Handover PIN Verification Modal:** Implemented secure verification modal where donors input the receiver's single-use 4-digit PIN code to instantly validate and authorize food handover.
* **Visual Food Journey Tracker:** Architected a step-by-step chronological tracker showing each meal's lifecycle: `Posted` ➔ `Claimed` ➔ `Collected by NGO` ➔ `Distributed with Proof`.
* **Gamified Community Leaderboard:** Developed top donor ranking leaderboard calculating total meals served and awarding gamified tier badges with social post sharing capabilities.
* **Relevant Files:** `client/src/pages/donor/PostFood.jsx`, `client/src/pages/donor/MyDonations.jsx`, `client/src/pages/donor/FoodPickupModal.jsx`, `client/src/pages/donor/FoodJourney.jsx`, `client/src/pages/donor/Leaderboard.jsx`, `server/controllers/foodPostController.js`, `server/controllers/donorController.js`.

### 4. 🤝 Receiver Experience, Dignity-First Request & Handover Flow
* **Nearby Food Discovery & Card Grid:** Engineered the receiver home feed displaying available nearby food with real-time remaining packet counters and distance calculations.
* **Multi-Parameter Search & Filter Engine:** Created dynamic filter bar supporting keyword searches, food categories, preparation state, and distance filters.
* **Dignity-First Anonymous Mode:** Created receiver anonymity system where vulnerable individuals can request meals under the masked identity `"Anonymous Receiver"` to protect personal privacy and dignity.
* **Scoped 4-Digit Handover PIN Generation:** Built algorithmic generator creating unique, single-use, time-scoped 4-digit PINs stored securely per request.
* **Proof of Receipt Photo Verification:** Built handover confirmation module enabling receivers and NGOs to snap and upload receipt proof upon meal delivery.
* **Comprehensive Request History:** Built full historical request log with status tabs (`All`, `Pending`, `Fulfilled`, `Cancelled`, `Rejected`) and proof photo viewer modal.
* **Relevant Files:** `client/src/pages/receiver/Dashboard.jsx`, `client/src/pages/receiver/FindFood.jsx`, `client/src/components/receiver/MyRequestsModal.jsx`, `client/src/pages/receiver/History.jsx`, `server/controllers/foodRequestController.js`.

### 5. 🏢 NGO Onboarding, Fleet Discovery & Food Rescue Operations
* **Official NGO Onboarding Portal:** Built legal registration workflow where charitable organizations submit government registration numbers, executive NIDs, and trade licenses.
* **NGO Operations Dashboard:** Developed NGO dashboard displaying real-time surplus alerts, incoming donations, and direct collection triggers.
* **Interactive Leaflet Map View:** Integrated dynamic Leaflet & OpenStreetMap engine plotting active food pickup locations across Dhaka with custom markers, popup details, and 1-click directions.
* **Serving Logs & Community Impact:** Built logging pipeline for NGOs to record bulk servings, people fed, and distribution timestamps.
* **Relevant Files:** `client/src/pages/ngo/RegisterNGO.jsx`, `client/src/pages/ngo/Dashboard.jsx`, `client/src/pages/ngo/IncomingDonations.jsx`, `client/src/components/map/FoodMap.jsx`, `server/controllers/ngoController.js`, `server/controllers/servingLogController.js`.

### 6. 🛡️ Admin Verification, Moderation & Analytics Engine
* **NGO Document Audit Pipeline:** Created admin review dashboard to inspect uploaded NGO certificates and licenses with 1-click approve/reject actions and automated role activation.
* **User Moderation & Abuse Investigation:** Built admin moderation tools to review flagged food posts, investigate user dispute reports, and moderate suspicious accounts.
* **Platform Health & Metrics:** Implemented aggregate reporting showing total meals saved, active donors, verified NGOs, and platform delivery statistics.
* **Relevant Files:** `client/src/pages/admin/Dashboard.jsx`, `client/src/pages/admin/PendingNGOs.jsx`, `client/src/pages/admin/Reports.jsx`, `server/controllers/adminController.js`.

### 7. 🔒 Advanced Cryptography, Privacy & Data Protection
* **AES-256-CBC Field-Level Database Encryption:** Implemented cryptographic field-level encryption for National ID (NID) numbers and receiver identities in PostgreSQL using Node.js `crypto` with 32-byte SHA-256 derived keys and random initialization vectors (IVs).
* **Batch Encryption Migration Tool:** Authored migration SQL (`019_encrypt_db_aes256.sql`) and standalone migration script (`server/encrypt_existing_nids.js`) to encrypt all legacy unencrypted NIDs in production.
* **Bilingual Public Trust & Support Center:** Designed and built 4 responsive legal and guidance pages with complete English/Bangla dual language toggle and `ScrollToTop` navigation:
  * `client/src/pages/public/HelpCentre.jsx` (Interactive FAQ, dispute resolution, operational guide)
  * `client/src/pages/public/SafetyProtocols.jsx` (Food safety standards, storage, packaging rules)
  * `client/src/pages/public/PrivacyPolicy.jsx` (Data disclosures, AES-256 identity masking details)
  * `client/src/pages/public/TermsOfService.jsx` (Donor liability protection, fair-use rules)
* **Open-Source Credential Sanitization:** Sanitized the codebase by replacing all live database passwords, OAuth secrets, and SMTP app passwords with generic templates, ensuring 100% safety for public repository hosting.
* **Relevant Files:** `server/utils/encryption.js`, `server/models/userModel.js`, `client/src/components/common/ScrollToTop.jsx`.

### 8. ⚙️ Reliability Engineering, Image Fallbacks & CI/CD
* **Resilient 2-Tier Image Fallback Architecture:** Engineered a double-layer fallback mechanism eliminating broken image icons across all cards:
  * Backend Express `/uploads` middleware redirecting missing local files to high-quality CDN food photos via 302 redirects (`server/app.js`).
  * Frontend React `onError` event listeners across all card components (`Dashboard.jsx`, `FindFood.jsx`, `IncomingDonations.jsx`, `MyDonations.jsx`).
* **Automated Cloud Database Keep-Alive (CI/CD):** Created automated GitHub Actions cron workflow (`.github/workflows/supabase-keep-alive.yml`) running every 3 days over SSL via `scripts/keep-alive.js`, permanently preventing Supabase Free Tier from entering the 7-day inactivity pause.
* **Deployment Optimization:** Configured `vercel.json` SPA rewrites and unified Express client serving.

---

## 🎯 Key Features & Role Portals

| Portal | Core Capabilities |
| :--- | :--- |
| 🍲 **Donor Portal** | Create posts with photos, quantities, expiry countdowns; approve NGO collection requests; track food journey; view donor impact rank on leaderboard. |
| 🏢 **NGO Portal** | Apply with legal verification documents; browse available food via interactive map / filters; submit collection requests; log meal distributions and people served. |
| 🤝 **Receiver Flow** | Browse nearby food; submit private requests with masked identities; receive a secure pickup PIN; upload proof-of-handover photos. |
| 🛡️ **Admin Portal** | Verify pending NGO registrations; review reported posts and abusive users; monitor system bot alerts; inspect platform metrics and food delivery logs. |

---

## 🏗️ System Architecture

```mermaid
graph TD
    User["🌐 Web Browser (Client App)"]
    
    subgraph Frontend ["React 18 + Vite SPA"]
        Router["React Router v6"]
        UI["Tailwind / Modern UI System"]
        Leaflet["Leaflet Map Engine"]
        Context["Auth & State Management"]
    end
    
    subgraph Backend ["Node.js + Express (Port 5001)"]
        Middleware["Auth & Security Middleware (JWT, Rate Limiter, CAPTCHA)"]
        Controllers["MVC Controllers (Auth, Food, NGO, Receiver, Admin)"]
        Services["Business Logic & Storage Adapters"]
    end

    subgraph DataStore ["Cloud Services & Database"]
        DB[(PostgreSQL via Supabase Pooler)]
        Bucket["Supabase Storage (Food & Handover Images)"]
        Mail["SMTP Email Service"]
    end

    User --> Router
    Router --> UI & Leaflet & Context
    Context -->|JSON REST API / Bearer JWT| Middleware
    Middleware --> Controllers
    Controllers --> Services
    Services --> DB
    Services --> Bucket
    Services --> Mail
```

---

## 💻 Tech Stack

### Frontend
- **Framework:** React 18 (SPA)
- **Tooling & Bundler:** Vite
- **Routing:** React Router v6
- **Maps:** Leaflet & React-Leaflet (OpenStreetMap)
- **Icons:** Lucide React
- **Animations & Visuals:** Canvas Confetti, CSS Transitions

### Backend
- **Runtime:** Node.js
- **Server Framework:** Express.js (MVC Pattern)
- **Authentication:** JSON Web Tokens (JWT Bearer tokens)
- **Encryption:** `bcryptjs` (passwords), `crypto` (AES-256 for identity masking)
- **Uploads:** Multer with Supabase Storage integration
- **Protection:** Express Rate Limit, Custom CAPTCHA Validation

### Database & Cloud
- **Database:** PostgreSQL (Hosted on AWS Supabase with session/transaction pooler)
- **Storage:** Supabase Storage (public/authenticated buckets for food images & proof receipts)
- **Mail:** Nodemailer with Google SMTP

---

## 📁 Workspace Directory Structure

```text
sharemeal/
├── client/                     # React (Vite) Frontend Application
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── assets/             # Brand logos & graphics
│   │   ├── components/         # Reusable UI widgets, Navbars, Footers, Modals
│   │   │   ├── auth/           # Login, Signup, OTP & CAPTCHA components
│   │   │   ├── common/         # Buttons, Toasts, Protected Route guards
│   │   │   └── map/            # Leaflet interactive map integrations
│   │   ├── context/            # Global Auth and State Providers
│   │   ├── pages/              # Portal pages (Admin, Donor, NGO, Receiver, Public)
│   │   ├── routes/             # AppRoutes configuration
│   │   └── services/           # Axios / Fetch API client functions
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Node.js + Express Backend API
│   ├── src/
│   │   ├── config/             # DB connection, Cloud storage, Nodemailer config
│   │   ├── controllers/        # Express request handlers (Auth, Food, Admin, etc.)
│   │   ├── middleware/         # JWT verification, Role authorization, Rate limiters
│   │   ├── models/             # Database SQL queries and schema models
│   │   ├── routes/             # API routes (/api/auth, /api/food, etc.)
│   │   └── utils/              # Crypto helpers, PIN generator, Validators
│   ├── .env.example            # Environment configuration template
│   ├── package.json
│   └── index.js                # Server entry point (Port 5001)
│
├── .gitignore
├── package.json                # Workspace root script coordinator
├── vercel.json                 # Vercel deployment & SPA routing configuration
└── README.md                   # Project documentation
```

---

## 🛠️ Getting Started & Local Setup

### 1. Prerequisites
- **Node.js** (v18 or higher installed)
- **npm** (v9 or higher)
- **PostgreSQL / Supabase** database connection string

### 2. Clone the Repository
```bash
git clone https://github.com/hridoy-islam-111/Sharemeal.git
cd Sharemeal
```

### 3. Install All Dependencies
Run from the workspace root to install root, client, and server dependencies at once:
```bash
npm run install:all
```
*(Alternatively: `npm install` in root, then in both `client/` and `server/`)*

### 4. Configure Environment Variables
Copy the `.env.example` in `server/` into `.env`:
```bash
cp server/.env.example server/.env
```

Open `server/.env` and update the values:
```env
PORT=5001
NODE_ENV=development

# Supabase PostgreSQL Pooler Connection
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Supabase Storage Configuration (for food post images)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 5. Run Development Servers
Start both the Express backend API and client watcher concurrently from the root directory:
```bash
npm run dev
```

The application will be live at:
- **Application URL:** [http://localhost:5001](http://localhost:5001)
- **API Endpoint:** [http://localhost:5001/api](http://localhost:5001/api)

---

## 🔒 Security & Trust Architecture

- **Stateless Authentication:** Secure JWT tokens passed via Authorization headers with strict role checks (`donor`, `ngo`, `receiver`, `admin`).
- **Cryptographic Password Hashing:** Salted `bcryptjs` hashing prevents credential leak in case of database inspection.
- **Identity Masking & Data Encryption:** Sensitive receiver identifiers and NIDs are encrypted with AES-256 before persistence.
- **Bot Mitigation:** Visual interactive CAPTCHA checks and IP-based rate limiting guard against automated registration floods.
- **Handover Verification:** Single-use pickup PINs generated per request guarantee food reaches the rightful recipient.

---

## 🚀 Deployment Configuration

### Vercel Integration
The repository includes a configured `vercel.json` at the root to ensure builds succeed when deployed to Vercel:
- **Build Command:** `npm run build --workspace=client`
- **Output Directory:** `client/dist`
- **SPA Routing:** Configured rewrite rules ensure client-side routes (e.g. `/donor/dashboard`, `/login`) resolve properly without 404s.

---

## 🎓 Course Acknowledgement

This project was developed for **CSE470: Software Engineering** (Summer 2026).
Special thanks to our course instructor and teaching assistants for their continuous guidance and feedback throughout the sprint development lifecycle.
