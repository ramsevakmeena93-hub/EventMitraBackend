# 🚀 Deploy EventMitra in 10 Minutes

## Quick Deployment to Render (Easiest Method)

### Prerequisites (5 minutes)

1. **MongoDB Atlas** (Free)
   - Sign up: https://www.mongodb.com/cloud/atlas/register
   - Create cluster → Get connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/eventmitra`

2. **Gmail App Password** (2 minutes)
   - Google Account → Security → 2-Step Verification (enable)
   - App Passwords → Generate for "Mail"
   - Save the 16-character password

3. **Render Account** (Free)
   - Sign up: https://dashboard.render.com/register
   - Connect GitHub account

---

## Deployment Steps (5 minutes)

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy on Render

1. **Go to:** https://dashboard.render.com/

2. **Click:** "New +" → "Web Service"

3. **Connect Repository:**
   - Select: `ramsevakmeena93-hub/EventMitra`
   - Click "Connect"

4. **Configure:**
   ```
   Name: eventmitra
   Region: Singapore
   Branch: main
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Free
   ```

5. **Environment Variables:**
   Click "Advanced" → Add these variables:

   ```
   NODE_ENV = production
   PORT = 10000
   MONGODB_URI = [Your MongoDB connection string]
   JWT_SECRET = [Generate random 32+ character string]
   JWT_EXPIRE = 7d
   EMAIL_HOST = smtp.gmail.com
   EMAIL_PORT = 587
   EMAIL_USER = [Your Gmail address]
   EMAIL_PASS = [Your 16-char App Password]
   CLIENT_URL = https://eventmitra.onrender.com
   ```

6. **Click:** "Create Web Service"

7. **Wait:** 5-10 minutes for deployment

### Step 3: Seed Database

Once deployed:
1. Go to Render dashboard → Your service
2. Click "Shell" tab
3. Run: `npm run seed`
4. Wait for completion

---

## ✅ Test Your Deployment

Visit: `https://eventmitra.onrender.com`

**Login with:**
```
SuperAdmin:
Email: superadmin@mitsgwalior.in
Password: password123
```

---

## 🎯 What Happens During Deployment

1. ✅ Render clones your GitHub repository
2. ✅ Installs all dependencies (`npm install`)
3. ✅ Builds React frontend (`npm run build`)
4. ✅ Starts Node.js server (`npm start`)
5. ✅ Server serves both API and frontend
6. ✅ Assigns public URL with HTTPS

---

## 📊 Deployment Architecture

```
GitHub Repository
       ↓
   Render Platform
       ↓
   ┌─────────────────┐
   │  Node.js Server │ ← Backend (Express + Socket.IO)
   │  (Port 10000)   │
   │                 │
   │  Serves:        │
   │  • /api/*       │ ← API endpoints
   │  • /*           │ ← React frontend (static files)
   └─────────────────┘
       ↓
   MongoDB Atlas ← Database
```

---

## 🔧 Post-Deployment

### Update Google OAuth (Optional)

If using Google Sign-In:
1. Google Cloud Console → Credentials
2. Add redirect URI: `https://eventmitra.onrender.com/api/auth/google/callback`

### Monitor Application

**View Logs:**
- Render Dashboard → Logs tab

**Check Health:**
- Visit: `https://eventmitra.onrender.com/api/health`
- Should return: `{"status":"ok","message":"Server is running"}`

---

## ⚠️ Important Notes

### Free Tier Limitations

- **Spin Down:** App sleeps after 15 minutes of inactivity
- **Cold Start:** First request takes 30-60 seconds to wake up
- **Solution:** Upgrade to paid plan ($7/month) or accept delay

### Environment Variables

**Never commit these to GitHub:**
- ❌ .env file (already in .gitignore)
- ❌ MongoDB passwords
- ❌ Email passwords
- ❌ JWT secrets

**Always use:**
- ✅ Render environment variables
- ✅ .env.example as template

---

## 🐛 Troubleshooting

### Build Fails

**Check:**
1. All dependencies in package.json
2. Build command is correct
3. Node version compatibility

**Fix:**
```bash
# Test locally first
npm install
npm run build
npm start
```

### Database Connection Error

**Check:**
1. MongoDB Atlas → Network Access → Add IP: `0.0.0.0/0`
2. Connection string format is correct
3. Username/password have no special characters (or URL encode them)

### Email Not Working

**Check:**
1. Using App Password (not regular Gmail password)
2. 2FA enabled on Gmail
3. EMAIL_USER and EMAIL_PASS are correct

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Website loads at production URL
- [ ] Can login with test accounts
- [ ] Dashboard displays correctly
- [ ] Can create new event
- [ ] Email notifications work
- [ ] Real-time updates work
- [ ] All pages accessible
- [ ] Mobile responsive

---

## 📈 Next Steps

1. **Custom Domain** (Optional)
   - Render Settings → Custom Domain
   - Add your domain (e.g., eventmitra.mitsgwalior.in)

2. **Monitoring**
   - Setup UptimeRobot to ping every 14 minutes
   - Prevents cold starts

3. **Backups**
   - MongoDB Atlas → Automated backups (enabled by default)

4. **Production Data**
   - Create real user accounts
   - Import actual venues
   - Configure college email

---

## 💡 Alternative Platforms

### Heroku
```bash
heroku create eventmitra-mits
heroku config:set NODE_ENV=production
git push heroku main
```

### Railway
- Similar to Render
- Connect GitHub → Deploy
- Add environment variables

### Vercel (Frontend Only)
- Deploy frontend separately
- Backend on Render/Railway

---

**Deployment Time:** ~10 minutes  
**Cost:** Free (with limitations)  
**Difficulty:** Easy  

**Ready to deploy? Follow Step 1 above!** 🚀
