# Skillverse - Setup Guide

## Prerequisites

- **Node.js** 16+ and npm
- **MongoDB** (local or cloud instance like MongoDB Atlas)
- **Google OAuth 2.0 credentials** (optional, for Google sign-in)

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend/` directory:

```env
# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/skillverse
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/skillverse?retryWrites=true&w=majority

# Google OAuth (optional, get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email Configuration (for notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Frontend URLs (for CORS and redirects)
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5173

# Environment
NODE_ENV=development
LOG_LEVEL=INFO

# Server Port
PORT=4000
```

### 3. Start Backend Server
```bash
npm run dev    # Development with hot-reload
npm start      # Production mode
```

The backend will be available at `http://localhost:4000`

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the `frontend/` directory:

```env
# API Base URL
VITE_API_URL=http://localhost:4000/api

# Google OAuth Client ID (same as backend)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Start Frontend Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## Database Setup

### Option 1: Local MongoDB
```bash
# Start MongoDB server
mongod

# Or use Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Option 2: MongoDB Atlas (Cloud)
1. Create account at https://mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Add to `.env` as `MONGODB_URI`

### Initial Database Seeding
```bash
cd backend
npm run seed:library    # Populate with sample courses and skill paths
```

---

## Security Checklist

### Production Deployment Security

✅ **CRITICAL FIXES IMPLEMENTED:**
- [x] JWT tokens stored in httpOnly cookies (not localStorage)
- [x] CSRF protection enabled  
- [x] Password complexity validation (12+ chars, uppercase, lowercase, number, special char)
- [x] Email verification required for all accounts (including Google OAuth)
- [x] Rate limiting on auth endpoints
- [x] Rate limiting on password reset (3 attempts/hour)
- [x] Security headers via Helmet.js
- [x] CORS whitelist configured

**Before Going to Production:**
1. Generate strong `JWT_SECRET` (256+ bits of randomness)
2. Use HTTPS everywhere
3. Configure production MongoDB with authentication
4. Set NODE_ENV=production
5. Update FRONTEND_URL and ADMIN_URL to actual domains
6. Generate OAuth credentials for your domain
7. Configure email service for password resets
8. Set up SSL certificates
9. Enable database backups
10. Review all environment variables

---

## Features Implemented

### Phase 1: Security Fixes ✅
- httpOnly cookie-based JWT authentication
- CSRF protection (double-submit cookie pattern)
- Password complexity requirements
- Email verification for all users
- Enhanced rate limiting
- Security headers (Helmet.js)

### Phase 2: Missing Features ✅
- **Certificate PDF Export**: Download certificates as PDF with unique IDs
- **Leaderboard System**: Rank users by XP, streaks, or certificates
- **Gamification**: XP rewards (25 XP per quiz, 100 XP per course), badges, daily streaks
- **User Stats API**: View personal rank, badges, XP, percentile

### Phase 3: Code Quality ✅
- Comprehensive input validation utilities
- Logging system with file output
- Global error handling middleware
- Async error wrapper for routes
- .gitignore for sensitive files
- Documentation and setup guides

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/verify?token=...` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Confirm password reset
- `POST /api/auth/logout` - Logout (clears cookie)

### User Features
- `GET /api/user/me` - Get current user profile
- `PUT /api/user/me` - Update profile
- `GET /api/user/me/dashboard` - Dashboard stats
- `GET /api/user/me/certificates` - List user certificates
- `GET /api/user/me/certificates/:id/download` - Download certificate PDF
- `GET /api/user/me/stats` - User rank and gamification stats
- `GET /api/user/leaderboard?sortBy=xp` - Public leaderboard

### Courses
- `GET /api/courses` - Browse published courses
- `GET /api/courses/:id` - Get course details
- `POST /api/user/enroll` - Enroll in course
- `POST /api/user/course/:id/lessons/:lessonId/quiz` - Submit quiz
- `POST /api/user/course/:id/lessons/:lessonId/complete` - Mark lesson complete

### Admin
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/logout` - Admin logout
- `GET /api/admin/auth/me` - Get admin profile
- `POST /api/admin/courses` - Create course
- `PUT /api/admin/courses/:id` - Edit course
- `GET /api/admin/users` - List users
- `GET /api/admin/projects` - Review project submissions
- `PUT /api/admin/projects/:id` - Approve/reject project

---

## Troubleshooting

### Frontend Can't Connect to Backend
- Check `VITE_API_URL` is correct
- Ensure backend is running on port 4000
- Check CORS settings in backend index.js

### Database Connection Error
- Verify MongoDB is running
- Check `MONGODB_URI` in .env
- For MongoDB Atlas: Whitelist your IP and ensure network access

### Google OAuth Not Working
- Verify `GOOGLE_CLIENT_ID` is correct
- Ensure redirect URIs are configured in Google Cloud Console
- Check that Google API is enabled

### Password Reset Email Not Sending
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` in .env
- For Gmail: Use app-specific password, not your main password
- Check email service credentials

### Certificate PDF Not Downloading
- Ensure PDFKit is installed: `npm list pdfkit`
- Check that certificate exists in database
- Verify you're logged in with correct user

---

## Development Commands

```bash
# Backend
npm run dev        # Start with hot-reload
npm start          # Production start
npm run seed:library  # Seed sample data

# Frontend
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build

# Database
npm run seed:library  # Seed initial data
```

---

## Next Steps

1. **Complete i18n Implementation** (English/Nepali support)
2. **Add Unit & Integration Tests**
3. **Implement Portfolio PDF Export**
4. **Add Advanced Search & Filtering**
5. **Mobile App Version**
6. **Real-time Notifications (WebSocket)**
7. **Video Processing & Streaming**

---

## Support & Contribution

For issues or feature requests, please open a GitHub issue. Contributions are welcome!

---

**Last Updated:** March 26, 2026
**Status:** Ready for Development/Production
