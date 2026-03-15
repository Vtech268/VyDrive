# VyDrive Cloud

## UI Redesign (v0.3 - Modern SaaS)
- **Sidebar**: Smooth slide-in animation, backdrop overlay on mobile, section labels, consistent icon sizing, active indicator stripe
- **Dashboard Header**: Avatar initial, user info grouping, proportional Upload button, divider
- **Stats Grid**: 2×2 on mobile (not 1 column), subtle hover lift, better typography
- **Quick Actions**: 2×2 mobile, hover lift + icon scale micro-interaction
- **Cards**: Consistent border-radius, subtle border + shadow, hover effect
- **Buttons**: Focus rings (accessibility), active scale, smooth hover transitions
- **Responsive**: Mobile breakpoints at 480px and 767px with slide sidebar; tablet at 768-1023px
- **Hamburger Nav**: CSS-based animated → X transition when menu opens
- **CSS Variables**: Slightly warmer gray palette, better shadow system

**VyDrive Cloud v0.2.0** — Platform file hosting dan database API berbasis Google Drive + Google Sheets, dengan MongoDB sebagai fallback.

## Stack
- **Backend**: Node.js + Express.js
- **Templating**: EJS + ejs-mate
- **Storage (files)**: Google Drive API v3
- **Storage (database/logs)**: Google Sheets API v4 → MongoDB fallback
- **Database (users/metadata)**: MongoDB Atlas (Mongoose)
- **Auth**: Session-based (web) + API Key (VyDB)
- **Deploy**: Vercel (`vercel.json` configured)

## Services
- `services/googleSheets.js` — Google Sheets integration, exports `isSheetsAvailable()` flag, has auto-retry (3x) on init failure
- `services/mongodb.js` — MongoDB connection with primary/fallback URI, schemas: File, User, VyDB, VyDBData, Chat, ApiLog
- `services/googleDrive.js` — Google Drive OAuth2 + file ops

## Auto-repair / Fallback Logic
- **Google Sheets unavailable** → VyDB data stored in `VyDBData` MongoDB collection
- **MongoDB primary fails** → auto-switches to `MONGODB_URI_FALLBACK`
- **Startup**: MongoDB init first (awaited), then Sheets init in background (non-blocking)
- **Vercel**: Detects `process.env.VERCEL` and skips `app.listen()` — exports `app` for serverless handler

## Google Sheets Error Fix
Error `"Google Sheets API has not been used in project..."` means the API needs to be enabled:
1. Go to https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=long-flame-470917-m6
2. Enable Google Sheets API
3. App will auto-reconnect on next retry

Until then, **all VyDB data is safely stored in MongoDB**.

## Routes
- `/` — Landing page
- `/auth` — Login/register
- `/dashboard` — User dashboard (files, VyDB, profile)
- `/admin` — Admin panel
- `/api` — VyDB REST API (X-API-Key auth)
- `/chat` — Live chat
- `/file/:id` — File download page

## Config
All credentials in `config/config.json`:
- `GOOGLE_SHEET_ID`, `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`
- `MONGODB_URI`, `MONGODB_URI_FALLBACK`
- `GOOGLE_DRIVE_FOLDER_ID`, `DRIVE_REFRESH_TOKEN`

## Session & Auth Fixes (March 2026)
- **connect-mongo** added as session store — session tersimpan di MongoDB, tidak hilang saat Vercel cold start
- `app.set('trust proxy', 1)` ditambahkan agar `secure` cookie bekerja di Vercel
- `saveUninitialized: false` → hemat storage, hanya buat session setelah login
- `req.session.save()` dipanggil eksplisit sebelum `res.redirect()` di login & register — fix logout-on-page-change
- Login admin redirect ke `/admin`, user biasa ke `/dashboard`
- `/health` endpoint untuk debug koneksi MongoDB, Sheets, dan session

## Environment Variables Required
- `MONGODB_URI` — MongoDB Atlas connection string (wajib untuk session & data)
- `ADMIN_PASSWORD` — Password admin panel
- `SESSION_SECRET` — Secret untuk enkripsi session cookie
- `ADMIN_USERNAME` — (opsional, default: `admin`)
