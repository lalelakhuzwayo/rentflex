# RentFlex 🏢✨

> **Smart Property & Flexible Lease Management Platform**

RentFlex is a modern, full-featured web application designed for tenants, landlords, and service contractors. It supports rental property browsing, flexible payment scheduling, digital lease agreements, maintenance tracking, landlord job postings, contractor bidding, and RentScore credit rating checks.

---

## 🚀 Features

- **🏡 Property Marketplace & Rent Bidding**: Browse rental listings with rich amenity filtering, detailed media, and support for rent bidding.
- **📄 Digital Lease Management**: View active and historical lease agreements, document uploads, and key term tracking.
- **💳 Flexible Payments**: Schedule upcoming rent payments, manage security deposits, and view full payment histories.
- **🛠 Maintenance & Job Board**: Tenants log maintenance issues; landlords turn complex repair tasks into open job postings for local contractors to bid on.
- **📈 RentScore**: Micro-scoring algorithm calculating rental payment reliability and credit performance.
- **💬 Real-Time Messaging**: Built-in chat channel between tenants, landlords, and contractors.
- **🔐 Dual Database Engine**: Easily toggle between **Local PostgreSQL (Development)** and **Supabase Cloud (Production)**.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Radix UI / shadcn/ui components, Lucide Icons, Framer Motion.
- **Backend & Database**: 
  - **Local PostgreSQL**: Docker container (`rentflex-postgres` on port `5432`) + Express REST API server (`port 5000`).
  - **Production Cloud**: [Supabase](https://supabase.com) (PostgreSQL Database, Supabase Auth, Supabase Storage).
  - **Standalone Mode**: Built-in mock store for offline testing.

---

## 🏁 Database Modes & Quick Start

### Mode 1: Local PostgreSQL Database (Recommended for Local Development)

1. **Spin up Local PostgreSQL Container**:
   ```bash
   npm run db:start
   ```

2. **Start Backend Server + Vite Frontend Together**:
   ```bash
   npm run dev:full
   ```

3. **Environment Configuration (`.env`)**:
   ```env
   VITE_USE_LOCAL_POSTGRES=true
   VITE_LOCAL_API_URL=http://localhost:5000/api
   ```
   The backend server automatically runs `supabase_schema.sql` on startup to initialize all tables and seed sample records into PostgreSQL!

---

### Mode 2: Production Cloud Supabase

When deploying or connecting to your cloud Supabase database, set your credentials in `.env`:

```env
# Comment out VITE_USE_LOCAL_POSTGRES=true
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-supabase-anon-key
```

Execute `supabase_schema.sql` in your Supabase SQL Editor to initialize cloud PostgreSQL tables (`profiles`, `properties`, `leases`, `payments`, `maintenance_requests`, `jobs`, `contractor_bids`, `bids`, `rent_scores`, `messages`).

---

## 📦 Scripts

- `npm run dev`: Start frontend dev server
- `npm run server`: Start local Express PostgreSQL API server
- `npm run dev:full`: Run local Express server + Vite frontend concurrently
- `npm run db:start`: Start local Docker PostgreSQL container
- `npm run db:stop`: Stop local Docker PostgreSQL container
- `npm run build`: Compile production bundle
- `npm run preview`: Preview production build locally

---

## 📁 Project Structure

```
rentflex/
├── public/                # Static assets & icons
├── server/
│   ├── db.js              # PostgreSQL pool connection & schema DDL/seeding
│   ├── index.js           # Express REST API server (port 5000)
│   └── seed.js            # Standalone seed script
├── src/
│   ├── api/               # appClient API abstraction layer (Local PG + Supabase + Mock)
│   ├── components/        # UI components (Radix, Dashboard, Payments, etc.)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # AuthContext, Supabase Client, Utilities
│   ├── pages/             # Main application pages
│   ├── App.jsx            # Application Router & Providers
│   └── main.jsx           # Application entry point
├── .env                   # Active environment variables
├── .env.example           # Environment variables template
├── supabase_schema.sql    # Complete PostgreSQL DDL schema
├── tailwind.config.js     # Tailwind CSS styling configuration
└── vite.config.js         # Vite configuration
```
