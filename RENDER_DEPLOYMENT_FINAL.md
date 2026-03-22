# Deploy EventMitra1 on Render - Final Guide

## ✅ Code Successfully Pushed to GitHub
Repository: https://github.com/ramsevakmeena93-hub/EventMitra1

---

## Deploy on Render (2 Services)

### Service 1: Backend API

1. **Go to Render:** https://dashboard.render.com/
2. **Click "New +" → "Web Service"**
3. **Connect GitHub:** Select `ramsevakmeena93-hub/EventMitra1`
4. **Click "Connect"**

**Configuration:**
```
Name: eventmitra-backend
Region: Oregon (or closest)
Branch: main
Root Directory: (LEAVE EMPTY!)
Runtime: Node
Build Command: npm install
Start Command: node server/index.js
Instance Type: Free
```

**Environment Variables (Click "Advanced"):**
```
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/eventmitra
JWT_SECRET = eventmitra_secret_key_2026_secure
CLIENT_URL = https://eventmitra-frontend.onrender.com
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = your_email@gmail.com
EMAIL_PASS = your_gmail_app_password
NODE_ENV = production
PORT = 5000
```

5. **Click "Create Web Service"**
6. **Wait 5-10 minutes**
7. **Copy Backend URL** (e.g., `https://eventmitra-backend.onrender.com`)

---

### Service 2: Frontend Website

1. **Click "New +" → "Web Service"**
2. **Connect SAME repo:** `ramsevakmeena93-hub/EventMitra1`
3. **Click "Connect"**

**Configuration:**
```
Name: eventmitra-frontend
Region: Oregon (same as backend)
Branch: main
Root Directory: client
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm run preview
Instance Type: Free
```

**Environment Variables:**
```
VITE_API_URL = https://eventmitra-backend.onrender.com
```
(Use your actual backend URL from Service 1)

4. **Click "Create Web Service"**
5. **Wait 5-10 minutes**

---

### Service 3: Update Backend CORS

After frontend deploys:

1. Go to backend service
2. Click "Environment"
3. Update `CLIENT_URL` to your frontend URL
4. Example: `https://eventmitra-frontend.onrender.com`
5. Click "Save Changes"

---

## MongoDB Setup

### 1. Create MongoDB Atlas Account
- Go to: https://www.mongodb.com/cloud/atlas
- Sign up (free)
- Create a free cluster

### 2. Whitelist All IPs
- Click "Network Access"
- Click "Add IP Address"
- Click "Allow Access from Anywhere"
- Enter: `0.0.0.0/0`
- Click "Confirm"

### 3. Get Connection String
- Click "Database" → "Connect"
- Choose "Connect your application"
- Copy connection string
- Replace `<password>` with your actual password
- Add database name: `/eventmitra`

Example:
```
mongodb+srv://admin:MyPassword123@cluster0.abc123.mongodb.net/eventmitra?retryWrites=true&w=majority
```

---

## Gmail App Password

### 1. Enable 2-Step Verification
- Go to: https://myaccount.google.com/security
- Enable 2-Step Verification

### 2. Generate App Password
- Go to: https://myaccount.google.com/apppasswords
- Select "Mail" and "Other"
- Type "EventMitra"
- Click "Generate"
- Copy the 16-character password
- Use this as `EMAIL_PASS`

---

## Checklist Before Deploying

### Backend Service:
- [ ] Root Directory: (empty)
- [ ] Build: `npm install`
- [ ] Start: `node server/index.js`
- [ ] MONGODB_URI added
- [ ] JWT_SECRET added
- [ ] CLIENT_URL added (will update after frontend deploys)
- [ ] EMAIL variables added
- [ ] NODE_ENV = production
- [ ] PORT = 5000

### Frontend Service:
- [ ] Root Directory: `client`
- [ ] Build: `npm install && npm run build`
- [ ] Start: `npm run preview`
- [ ] VITE_API_URL points to backend URL

### MongoDB Atlas:
- [ ] Cluster created
- [ ] IP 0.0.0.0/0 whitelisted
- [ ] Database user created
- [ ] Connection string copied

### Gmail:
- [ ] 2FA enabled
- [ ] App password generated
- [ ] App password added to EMAIL_PASS

---

## After Deployment

### Your URLs:
- **Backend:** `https://eventmitra-backend.onrender.com`
- **Frontend:** `https://eventmitra-frontend.onrender.com`

### Test Backend:
Visit: `https://eventmitra-backend.onrender.com`
Should see: "Cannot GET /" (this is normal)

### Test Frontend:
Visit: `https://eventmitra-frontend.onrender.com`
Should see: EventMitra homepage

---

## Seed Database

After deployment, seed your database with test data:

### Option 1: Run Locally
```bash
# Update .env with production MongoDB URI
node server/seed.js
```

### Option 2: Use Render Shell
1. Go to backend service
2. Click "Shell" tab
3. Run: `node server/seed.js`

This creates test accounts for all roles.

---

## Test Accounts (After Seeding)

**Student:**
- Email: student@test.com
- Password: password123

**Faculty:**
- Email: faculty@test.com
- Password: password123

**HOD:**
- Email: hod@test.com
- Password: password123

**ABC:**
- Email: abc@test.com
- Password: password123

**Registrar:**
- Email: registrar@test.com
- Password: password123

**Super Admin:**
- Email: superadmin@test.com
- Password: password123

---

## Troubleshooting

### Backend Errors:

**"MongooseError: buffering timed out"**
- Fix: Check MONGODB_URI
- Fix: Whitelist 0.0.0.0/0 in MongoDB Atlas

**"Cannot find module 'express'"**
- Fix: Check Build Command is `npm install`
- Fix: Check package.json exists in root

**"Port already in use"**
- Fix: Make sure Start Command uses `process.env.PORT`

### Frontend Errors:

**"Cannot find client/dist/index.html"**
- Fix: Check Root Directory is set to `client`
- Fix: Check Build Command includes `npm run build`

**"Network Error" when testing**
- Fix: Check VITE_API_URL points to backend
- Fix: Check backend CLIENT_URL matches frontend URL

**Blank page**
- Fix: Check browser console for errors
- Fix: Verify build completed successfully

### CORS Errors:

**"Access-Control-Allow-Origin"**
- Fix: Update backend CLIENT_URL to match frontend URL exactly
- Fix: Must include `https://`

---

## Important Notes

1. **Free Tier Limitations:**
   - Services sleep after 15 min of inactivity
   - First request after sleep takes 30-60 seconds
   - 750 hours/month free (enough for 1 app)

2. **Auto Deploy:**
   - Push to GitHub = automatic redeploy
   - Both services update independently

3. **Logs:**
   - Check logs if deployment fails
   - Dashboard → Service → Logs tab

4. **Custom Domain:**
   - Can add custom domain in Settings
   - Free SSL certificate included

---

## Success Checklist

- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] MongoDB connected
- [ ] Can access frontend URL
- [ ] Can login with test account
- [ ] Can create events
- [ ] Email notifications work
- [ ] All dashboards accessible

---

## Your Final URLs

Share these with your college:

- **Website:** https://eventmitra-frontend.onrender.com
- **API:** https://eventmitra-backend.onrender.com
- **GitHub:** https://github.com/ramsevakmeena93-hub/EventMitra1

---

**Everything is ready! Follow the steps above to deploy.** 🚀
