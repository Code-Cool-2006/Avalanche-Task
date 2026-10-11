# 🎬 CineShow (Bio CineShow 1926) — Movie Ticket Booking Platform

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-black?style=flat&logo=vercel)](https://avalanche-task.vercel.app)
[![Render Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat&logo=render)](https://avalanche-task.onrender.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![Node Express](https://img.shields.io/badge/Express-5-000000?style=flat&logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql)](https://www.postgresql.org)

An end-to-end, high-performance cinema booking platform featuring real-time seat locking, auditorium visualization, gourmet concessions ordering, PDF tickets with scannable QR codes, and cross-origin secure authentication.

---

## 🌐 Live Deployments

- **Frontend (Web App)**: [https://avalanche-task.vercel.app](https://avalanche-task.vercel.app)
- **Backend API**: [https://avalanche-task.onrender.com](https://avalanche-task.onrender.com)
- **Backend Health Check**: [https://avalanche-task.onrender.com/api/health](https://avalanche-task.onrender.com/api/health)

> **Render Free Tier Note**: Free instances on Render spin down after 15 minutes of inactivity. When asleep, requests trigger a cold start (~30–45s). The application includes an in-app **Live Backend Status & Wake Widget** that lets you wake the server with a single click and watch live ping latency.

---

## ✨ Features

### 🎟️ Customer & Booking Experience
- **Interactive Auditorium & Seat Matrix**: Real-time multi-tier seating (**Regular**, **Premium**, **Recliner**) with live seat locking, occupancy conflict prevention, and 10-minute hold expiry.
- **Movies & Showtimes**: Multi-city theater discovery, language, audio format (Dolby Atmos, IMAX 2D/3D, 4DX), and date filtering.
- **Concessions & Combos**: Add gourmet movie snacks, popcorn, combos, and beverages directly to your cart during checkout.
- **Promo Codes & Discount Engine**: Apply promotional vouchers (percentage or flat discounts) with real-time recalculation.
- **PDF Tickets with QR Codes**: Automatically generate downloadable, branded PDF tickets with embedded scannable QR codes.
- **Booking History & Status**: View current, pending, and past bookings with direct cancellation support.

### 🔐 Authentication & Security
- **OTP Verification**: Email-based 6-digit OTP verification via Nodemailer with cooldown and retry limits.
- **Hybrid Cross-Origin Auth**: Dual-mode session handling using HTTP-only `SameSite=None` secure cookies and `Authorization: Bearer <token>` fallback to maintain seamless authentication across domains (`vercel.app` ↔ `onrender.com`).
- **Security Middlewares**: Helmet security headers, rate limiting on sensitive routes (`/api/auth`), and input validation via **Zod**.

### ⚡ Cold-Start & Live Status Widget
- **Embedded Health Monitor**: Displays real-time status (`🟢 Awake`, `🟡 Waking`, `🔴 Asleep`) with round-trip latency (ms).
- **One-Click Server Wake**: Fires HTTP ping packets to warm up the backend container without leaving the page.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 8
- **Styling**: Vanilla CSS with Nordic heritage design tokens and responsive layout
- **3D Graphics**: Three.js
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Database**: PostgreSQL (with `pg` connection pool)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) + `bcryptjs`
- **Email Delivery**: Nodemailer (SMTP)
- **Document Generation**: PDFKit + QRCode
- **Security**: Helmet, CORS, Express-Rate-Limit, Cookie-Parser, Zod

---

## 📁 Repository Structure

```text
Movie_Booking/
├── backend/
│   ├── config/
│   │   └── db.js                 # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── adminController.js    # Admin analytics & inventory
│   │   ├── authController.js     # Register, OTP verify, Login, Logout
│   │   ├── bookingController.js  # Seat reservation & checkout
│   │   ├── movieController.js    # Movie catalog management
│   │   ├── paymentController.js  # Payment processing
│   │   ├── screenController.js   # Auditorium screen layouts
│   │   ├── seatController.js     # Seat layout & status
│   │   ├── showController.js     # Showtime management
│   │   └── theatreController.js  # Theaters by city
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT & role authorization
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── movieRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── screenRoutes.js
│   │   ├── seatRoutes.js
│   │   ├── showRoutes.js
│   │   └── theatreRoutes.js
│   ├── services/
│   │   └── ticketService.js      # PDF & QR ticket generation
│   ├── api.http                  # REST Client testing file
│   └── index.js                  # Express application entrypoint
├── src/
│   ├── assets/                   # Cinema brand assets & illustrations
│   ├── auth/
│   │   ├── AuthContext.jsx       # Auth provider & token management
│   │   ├── AuthPage.jsx          # Login / Register / OTP flow
│   │   └── auth.css              # Nordic cinema styling
│   ├── components/
│   │   ├── common/
│   │   │   ├── BackendStatusWidget.jsx # Server health & wake button
│   │   │   └── backendStatus.css
│   │   └── customer/             # Navbar, Modals, Seat selection
│   ├── config/
│   │   └── apiConfig.js          # Central API base URL
│   ├── data/
│   │   └── mockCinemaData.js     # Fallback offline cinema datasets
│   ├── pages/
│   │   └── customer/
│   │       └── CustomerDashboard.jsx
│   ├── services/
│   │   ├── api.js                # Universal HTTP client
│   │   └── customerBookingService.js # Booking engine & storage sync
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
└── vite.config.js
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm
- PostgreSQL database instance (local or hosted e.g. Neon/Supabase)

### 1. Clone the Repository
```bash
git clone https://github.com/Code-Cool-2006/Avalanche-Task.git
cd Avalanche-Task
```

### 2. Install Dependencies
```bash
# Install root (frontend & backend dependencies)
npm install

# (Optional) Install backend standalone dependencies
cd backend && npm install && cd ..
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Fill in your configuration:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cinemanest?sslmode=disable

# Authentication
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars

# CORS / Origin
CLIENT_ORIGIN=http://localhost:5173

# Optional: SMTP Email for OTP (leave empty for local dev console OTP logging)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=app-password
MAIL_FROM="CineShow <you@gmail.com>"
```

### 4. Run the Development Servers
In two separate terminals:

**Terminal 1 — Backend Express Server:**
```bash
npm run server
# Runs on http://localhost:4000
```

**Terminal 2 — Frontend Vite Application:**
```bash
npm run dev
# Runs on http://localhost:5173
```

---

## 📡 Key API Endpoints

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/health` | Health check & ping probe | ❌ |
| `POST` | `/api/auth/register` | Register user & dispatch OTP email | ❌ |
| `POST` | `/api/auth/verify-otp` | Verify OTP code & authenticate | ❌ |
| `POST` | `/api/auth/login` | Login with email & password | ❌ |
| `GET` | `/api/auth/me` | Fetch active user profile | ✅ |
| `POST` | `/api/auth/logout` | Terminate session & clear cookies | ❌ |
| `GET` | `/movies` or `/api/movies` | Fetch all movies | ❌ |
| `GET` | `/movies/:id` | Fetch specific movie details | ❌ |
| `GET` | `/theatres` or `/api/theatres` | Fetch theaters by city | ❌ |
| `GET` | `/screens/:id/seats` | Fetch screen physical seat matrix | ❌ |
| `GET` | `/api/shows` | Fetch showtimes with query filters | ❌ |
| `POST` | `/api/bookings` | Reserve seats & initiate booking | ✅ |
| `GET` | `/api/bookings/my` | Retrieve logged-in user bookings | ✅ |
| `PATCH` | `/api/bookings/:id/cancel`| Cancel an active booking | ✅ |
| `POST` | `/api/payments` | Process payment & dispatch ticket PDF | ✅ |

---

## 📦 Build & Deployment

### Build for Production
```bash
npm run build
```
This generates optimized production assets in the `dist/` directory.

### Deploying Frontend to Vercel
1. Link repository to Vercel.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set Environment Variable:
   - `VITE_API_URL`: `https://avalanche-task.onrender.com`

### Deploying Backend to Render
1. Create a **Web Service** on Render pointing to the repository root or `backend/`.
2. Build Command: `npm install`
3. Start Command: `npm start` (or `node backend/index.js`)
4. Set Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: Random 32+ character string.
   - `CLIENT_ORIGIN`: `https://avalanche-task.vercel.app`
   - `NODE_ENV`: `production`

---

## 📄 License
This project is licensed under the ISC License.
