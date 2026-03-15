# VyDrive Cloud 0.2

Platform file hosting dan database API berbasis Node.js (Express) + EJS yang kompatibel untuk deployment di Vercel serverless environment.

## Fitur Utama

### 🚀 VyDrive - File Hosting
- Upload file gratis ke Google Drive
- Generate link langsung (direct download)
- Support semua jenis file
- Pilihan expired otomatis (1 hari, 7 hari, 30 hari, permanen)
- Preview file (image, video, audio, PDF)
- Sistem user guest dan login (Free & Paid plan)

### 🗄️ VyDB - Database API
- REST API berbasis Google Spreadsheet
- Endpoint: POST /api/insert, GET /api/get, PATCH /api/update, DELETE /api/delete
- Data disimpan dalam format JSON
- Auto-create spreadsheet dan sheets

### 💬 Live Chat
- Chat user-admin menggunakan HTTP polling
- Pesan disimpan di Google Spreadsheet
- Real-time updates dengan setInterval fetch

### 👨‍💼 Admin Dashboard
- Kelola file, user, database API
- Monitor API logs dan chat
- Clean expired files otomatis

## Struktur Project

```
vydrive-cloud/
├── app.js                  # Entry point aplikasi
├── config/
│   └── config.json         # Konfigurasi aplikasi
├── controllers/
│   ├── indexController.js
│   ├── fileController.js
│   ├── authController.js
│   ├── dashboardController.js
│   ├── apiController.js
│   ├── adminController.js
│   └── chatController.js
├── middleware/
│   ├── auth.js
│   └── upload.js
├── routes/
│   ├── index.js
│   ├── file.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── api.js
│   ├── admin.js
│   └── chat.js
├── services/
│   ├── mongodb.js
│   ├── googleDrive.js
│   └── googleSheets.js
├── views/
│   ├── layouts/
│   │   ├── main.ejs
│   │   └── dashboard.ejs
│   ├── partials/
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   ├── sidebar.ejs
│   │   └── dashboard-header.ejs
│   ├── pages/
│   │   ├── home.ejs
│   │   ├── upload.ejs
│   │   ├── login.ejs
│   │   ├── register.ejs
│   │   ├── preview.ejs
│   │   ├── chat.ejs
│   │   ├── pricing.ejs
│   │   ├── api-docs.ejs
│   │   ├── about.ejs
│   │   └── error.ejs
│   ├── dashboard/
│   │   ├── index.ejs
│   │   ├── files.ejs
│   │   ├── vydb.ejs
│   │   └── profile.ejs
│   └── admin/
│       ├── dashboard.ejs
│       ├── files.ejs
│       ├── users.ejs
│       ├── vydb.ejs
│       ├── chats.ejs
│       └── logs.ejs
├── public/
│   ├── css/
│   │   ├── style.css
│   │   ├── auth.css
│   │   ├── upload.css
│   │   ├── dashboard.css
│   │   ├── pages.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── main.js
│   │   ├── upload.js
│   │   ├── chat.js
│   │   └── dashboard.js
│   └── uploads/
├── package.json
└── vercel.json
```

## Konfigurasi

Edit file `config/config.json`:

```json
{
  "web": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID",
    "client_secret": "YOUR_GOOGLE_CLIENT_SECRET",
    "redirect_uris": ["..."],
    "javascript_origins": ["..."]
  },
  "GOOGLE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "GOOGLE_CLIENT_EMAIL": "service-account@project.iam.gserviceaccount.com",
  "GOOGLE_PROJECT_ID": "your-project-id",
  "GOOGLE_SHEET_ID": "your-spreadsheet-id",
  "GOOGLE_DRIVE_FOLDER_ID": "your-drive-folder-id",
  "admin_password": "your_admin_password",
  "MONGODB_URI": "mongodb+srv://...",
  "MONGODB_URI_FALLBACK": "mongodb+srv://...",
  "plans": {
    "free": {
      "name": "Free",
      "max_file_size": 104857600,
      "max_storage": 1073741824,
      "max_files_per_day": 10,
      "allowed_types": ["*"]
    },
    "paid": {
      "name": "Paid",
      "max_file_size": 1073741824,
      "max_storage": 10737418240,
      "max_files_per_day": 100,
      "allowed_types": ["*"]
    }
  },
  "app": {
    "name": "VyDrive Cloud",
    "version": "0.2.0",
    "domain": "vydrive.zone.id",
    "session_secret": "your_session_secret"
  }
}
```

## Cara Menjalankan

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Atau
node app.js
```

### Deployment ke Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## API Endpoints

### VyDB API

Semua endpoint memerlukan header `X-API-Key`.

#### Insert Data
```
POST /api/insert
Content-Type: application/json
X-API-Key: your_api_key

{
  "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Get Data
```
GET /api/get?name=John
X-API-Key: your_api_key
```

#### Update Data
```
PATCH /api/update
Content-Type: application/json
X-API-Key: your_api_key

{
  "id": "record_id",
  "data": {
    "name": "Updated Name"
  }
}
```

#### Delete Data
```
DELETE /api/delete
Content-Type: application/json
X-API-Key: your_api_key

{
  "id": "record_id"
}
```

## Login Admin

- URL: `/auth/login`
- Password: Sesuai config `admin_password`
- Centang "Login sebagai Admin"

## Teknologi yang Digunakan

- **Backend**: Node.js, Express.js
- **Template Engine**: EJS
- **Database**: MongoDB Atlas (dengan fallback)
- **File Storage**: Google Drive API
- **Database API**: Google Sheets API
- **Styling**: CSS Custom (Mobile-first, Responsive)

## License

MIT License

## Catatan

- Aplikasi ini menggunakan HTTP polling untuk fitur chat (bukan WebSocket) agar kompatibel dengan Vercel serverless
- Semua konfigurasi disimpan di `config/config.json` tanpa menggunakan file `.env`
- CSS, JS, dan assets dilayani dari folder `public` menggunakan Express static middleware
