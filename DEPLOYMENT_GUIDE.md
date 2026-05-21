# SkillVerse Deployment & Quick Start Guide
**Last Updated:** April 25, 2026

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 16+
- MongoDB 5+ (local or Atlas)
- npm 8+

### 1. Backend Setup (5 minutes)
```bash
cd backend
npm install

# .env should already be configured
npm start
# Expected output: "Server running on port 4000"
```

### 2. Frontend Setup (5 minutes)
```bash
cd frontend
npm install

# .env.local should already be configured
npm run dev
# Expected output: "Local: http://localhost:5174"
```

### 3. Database Initialization (Optional)
```bash
cd backend
npm run seed:library
# Populates sample courses and skill paths
```

---

## 🌍 Production Deployment

### Step 1: Prepare Environment

**Backend Production Config** (`backend/.env`):
```env
# Generate a strong secret: openssl rand -hex 32
JWT_SECRET=<strong-random-string>
MONGO_URI=<production-mongodb-uri>
PORT=4000
NODE_ENV=production

# Google OAuth (get from console.cloud.google.com)
GOOGLE_CLIENT_ID=<your-google-client-id>

# Email (for password resets)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# URLs
BASE_URL=https://api.skillverse.com
FRONTEND_URL=https://skillverse.com

# Payment (Khalti)
KHALTI_SECRET_KEY=<live-secret-key>
```

**Frontend Production Config** (`frontend/.env.local`):
```env
VITE_API_URL=https://api.skillverse.com/api
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

### Step 2: Build & Deploy Backend

**Option A: Direct Server (VPS/EC2)**
```bash
cd backend
npm install --production
npm start
# Keep running with PM2 or similar
```

**Option B: Docker**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend ./
EXPOSE 4000
CMD ["npm", "start"]
```

**Option C: Railway/Heroku**
```bash
# Backend automatically detects and runs
git push heroku main
# Or use Railway dashboard
```

### Step 3: Build & Deploy Frontend

**Build:**
```bash
cd frontend
npm install
npm run build
# Creates dist/ folder
```

**Deploy static assets:**
- **Vercel:** `vercel deploy` (automatic)
- **Netlify:** Drag dist/ folder
- **AWS S3 + CloudFront:** Upload dist/ files
- **Any static host:** Copy dist/ contents

### Step 4: Configure Domain & SSL

1. Point domain to server/CDN
2. Get SSL certificate (Let's Encrypt)
3. Enable HTTPS everywhere
4. Update URLs in `.env` files

### Step 5: Database Backup & Monitoring

```bash
# MongoDB Atlas automatic backups (enabled by default)

# Or manual backup:
mongodump -uri "mongodb+srv://user:pass@cluster.mongodb.net/skillverse" \
          -o ./backups/$(date +%Y%m%d)

# Set up log aggregation:
# - Sentry for error tracking
# - LogRocket for session replays
# - DataDog for APM
```

---

## 🔒 Security Hardening Checklist

### Before Going Live
- [ ] **Set strong JWT secret** - `openssl rand -hex 32`
- [ ] **Enable HTTPS** - Everywhere
- [ ] **Configure MongoDB auth** - Set username/password
- [ ] **Whitelist CORS** - Only your domain
- [ ] **Set NODE_ENV=production** - Disables debug info
- [ ] **Configure email service** - For password resets
- [ ] **Test all auth flows** - With real credentials
- [ ] **Enable rate limiting** - Check endpoints
- [ ] **Set up SSL certificate** - Use Let's Encrypt
- [ ] **Configure security headers** - Via Helmet
- [ ] **Test admin login** - Works with production
- [ ] **Verify CSRF tokens** - Working on forms
- [ ] **Test password complexity** - Validation works
- [ ] **Review .env files** - No secrets in git
- [ ] **Set up monitoring** - Error alerts
- [ ] **Configure backups** - Automated daily

### Post-Launch Monitoring
```bash
# Check server health
curl https://skillverse.com/api/health

# Monitor database
# Dashboard: https://cloud.mongodb.com

# Check logs
# Dashboard: Your monitoring service

# Track performance
# Dashboard: Vercel/Railway/etc.
```

---

## 📊 Key Performance Indicators (KPIs) to Track

1. **Server Response Time:** Target <200ms
2. **Page Load Time:** Target <2s
3. **Database Query Time:** Target <100ms
4. **Error Rate:** Target <0.1%
5. **Uptime:** Target >99.9%
6. **User Engagement:** Courses completed, certificates earned

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check MongoDB connection
# 1. Verify MONGO_URI is correct
# 2. Check if MongoDB is running
# 3. Verify network/firewall

# Check port conflicts
netstat -an | grep 4000

# Check logs
npm start 2>&1 | tee app.log
```

### Frontend API errors
```bash
# Check VITE_API_URL is correct
# Check backend is running
# Check CORS whitelist
# Clear browser cache & reload
```

### Language toggle not working
```bash
# Check localStorage is enabled
# Check translation files are loaded
# Verify i18n is initialized
# Check console for errors
```

### Certificate download fails
```bash
# Check PDFKit is installed: npm list pdfkit
# Verify file permissions
# Check temp directory exists
```

### MongoDB Atlas connection issues
```bash
# Whitelist your IP:
# 1. Go to MongoDB Atlas console
# 2. Network Access → IP Whitelist
# 3. Add your server IP

# Or allow all (not recommended):
# 0.0.0.0/0
```

---

## 📞 Support

### Documentation
- [SETUP.md](./SETUP.md) - Detailed setup
- [PROJECT_COMPLETION_STATUS.md](./PROJECT_COMPLETION_STATUS.md) - Feature list
- [AUDIT_REPORT_2026.md](./AUDIT_REPORT_2026.md) - Security audit

### API Reference
```
# Users
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify
GET    /api/user/me
PUT    /api/user/me
POST   /api/user/change-password

# Courses
GET    /api/courses
GET    /api/courses/:id
POST   /api/courses/:id/enroll

# Progress
GET    /api/user/me/progress
GET    /api/user/me/progress/:courseId
POST   /api/user/me/progress/:courseId/quiz

# Certificates
GET    /api/user/me/certificates
GET    /api/user/me/certificates/:id/download

# Leaderboard
GET    /api/user/leaderboard

# Community
GET    /api/community
POST   /api/community
POST   /api/community/:id/comments

# Admin (requires admin auth)
GET    /api/admin/users
GET    /api/admin/courses
GET    /api/admin/community
```

---

## 🎯 Success Metrics

After deployment, monitor these metrics:

1. **User Acquisition:** New registrations per week
2. **Engagement:** Active users, session duration, features used
3. **Learning Outcomes:** Courses completed, certificates earned
4. **System Health:** Uptime, error rate, response times
5. **Community Health:** Posts created, questions answered, engagement

---

## 📝 Version History

| Version | Date | Status |
|---------|------|--------|
| 1.0 | 2026-04-25 | Production Ready |

---

## 🎓 Project Credits

**Submitted by:** Rabim Kc  
**Uni ID:** 2414192  
**Supervisor:** Saroj D Shrestha  
**Reader:** Gunjan Kumar Mishra  

---

**Created:** April 25, 2026  
**Status:** ✅ Complete & Ready for Deployment
