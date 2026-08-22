# WaveChat Backend

Node.js + Express + TypeScript + Prisma (MongoDB) backend API service for WaveChat.

## 🚀 Note for Local Development

> **Local Development Base URL:** `http://localhost:3000/v1`
> All API routes are mounted under the `/v1` prefix to match client expectations (`https://api.wavechat.app/v1`).

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Database:** MongoDB
- **Authentication:** JWT (Short-lived 15m Access Token & 7d Refresh Token) + Bcrypt Password Hashing
- **Validation:** Zod

---

## ⚙️ Environment Variables Setup

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Configure your environment variables in `.env`:

```env
DATABASE_URL="mongodb://localhost:27017/wavechat"
JWT_ACCESS_SECRET="your_secure_access_secret_key"
JWT_REFRESH_SECRET="your_secure_refresh_secret_key"
PORT=3000
```

---

## 📦 Setup & Database Schema Sync Steps

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Push Database Schema (MongoDB required):**
   ```bash
   npm run prisma:push
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

---

## 📡 API Endpoints Overview (`/v1`)

### 🔐 Authentication (`/v1/auth`)
- `POST /v1/auth/register` — Register new user (returns user object, 15m access token, 7d refresh token)
- `POST /v1/auth/login` — Login user with email & password
- `POST /v1/auth/refresh` — Refresh access token using valid refresh token
- `POST /v1/auth/logout` — Logout user (protected)

### 👤 User (`/v1/user`)
- `GET /v1/user/search?query=` — Search users by name or email (protected)

### 🤝 Contacts (`/v1/contacts`)
- `GET /v1/contacts` — List all contacts for logged-in user (protected)
- `POST /v1/contacts/request` — Send contact request (`{ contactUserId }`) (protected)
- `POST /v1/contacts/:id/accept` — Accept pending contact request (protected)

### 💬 Chats & Messages (`/v1/chats`)
- `GET /v1/chats` — List user chat threads with unread count & last message (protected)
- `POST /v1/chats` — Find or create direct/group chat thread (protected)
- `GET /v1/chats/:threadId` — Get thread details (protected)
- `PATCH /v1/chats/:threadId/read` — Mark thread messages as read & reset unread count (protected)
- `GET /v1/chats/:threadId/messages` — Get thread messages with cursor pagination (`?cursor=&limit=20`) (protected)
- `POST /v1/chats/:threadId/messages` — Send message in thread (`{ text, messageType, mediaUrl }`) (protected)

---

## 🏗️ Building for Production

```bash
npm run build
npm start
```
