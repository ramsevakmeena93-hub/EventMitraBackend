# 🚀 How to Deploy EventMitra on Render - Simple Guide

## Prerequisites (Do These First!)

### 1️⃣ MongoDB Atlas Setup
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for FREE account
3. Create a FREE cluster (M0)
4. Click **"Network Access"** → **"Add IP Address"**
5. Click **"Allow Access from Anywhere"**
6. Enter: `0.0.0.0/0` → Click **"Confirm"**
7. Click **"Database Access"** → **"Add New Database User"**
8. Create username and password (save these!)
9. Click **"Database"** → **"Connect"** → **"Connect your application"**
10. Copy the connection string (looks like: `mongodb+srv://username:password@cluster...`)
11. Replace `<password>` with your actual password
12. Add `/eventmitra` at the end before `?retryWrites`

**Final format:**
```
mongodb+srv://username:password@cluster0.abc123.mongodb.net/eventmitra?retryWrites=true&w=majority
```

### 2️⃣ Gmail App Password Setup
1. Go to https://myaccount.google.com/security
2. Enable **"2-Step Verification"** (if not already enabled)
3. Go to https://myaccount.google.com/apppasswords
4. Select **"Mail"** and **"Other (Custom name)"**
5. Type: **"EventMitra"**
6. Click **"Generate"**
7. Copy the 16-character password (example: `abcd efgh ijkl mnop`)
8. Remove spaces: `abcdefghijklmnop`

---

## 🎯 Deploy on Render (2 Services Required)

### STEP 1: Deploy Backend API

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com/
   - Sign up with GitHub (if new user)

2. **Create New Web Service**
   - Click **"New +"** button (top right)
   - Select **"Web Service"**

3. **Connect GitHub Repository**
   - Click **"Connect account"** (if first time)
   - Find and select: **`ramsevakmeena93-hub/EventMitra1`**
   - Click **"Connect"**

4. **Configure Backend Service**
   ```
   Name: eventmitra-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: (LEAVE THIS EMPTY - DO NOT TYPE ANYTHING!)
   Runtime: Node
   Build Command: npm install
   Start Command: node server/index.js
   Instance Type: Free
   ```

5. **Add Environment Variables**
   - Click **"Advanced"** button
   - Click **"Add Environment Variable"** for each:

   ```
   Key: MONGODB_URI
   Value: mongodb+srv://username:password@cluster0.abc123.mongodb.net/eventmitra?retryWrites=true&w=majority
   (Use your actual MongoDB connection string from Step 1)

   Key: JWT_SECRET
   Value: eventmitra_secret_key_2026_secure_random_string

   Key: CLIENT_URL
   Value: https://eventmitra-frontend.onrender.com
   (We'll update this after frontend deploys)

   Key: EMAIL_HOST
   Value: smtp.gmail.com

   Key: EMAIL_PORT
   Value: 587

   Key: EMAIL_USER
   Value: 25tc1aj7@mitsgwl.ac.in
   (Your actual Gmail address)

   Key: EMAIL_PASS
   Value: abcdefghijklmnop
   (Your Gmail app password from Step 2)

   Key: NODE_ENV
   Value: production

   Key: PORT
   Value: 5000
   ```

6. **Deploy Backend**
   - Click **"Create Web Service"**
   - Wait 5-10 minutes for deployment
   - Watch the logs for "Server running on port 5000"
   - **COPY YOUR BACKEND URL** (example: `https://eventmitra-backend.onrender.com`)

---

### STEP 2: Deploy Frontend Website

1. **Create Another Web Service**
   - Click **"New +"** → **"Web Service"**
   - Connect **SAME repository**: `ramsevakmeena93-hub/EventMitra1`
   - Click **"Connect"**

2. **Configure Frontend Service**
   ```
   Name: eventmitra-frontend
   Region: Oregon (US West) - SAME AS BACKEND
   Branch: main
   Root Directory: client
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm run preview
   Instance Type: Free
   ```

3. **Add Environment Variable**
   - Click **"Advanced"**
   - Add ONE variable:

   ```
   Key: VITE_API_URL
   Value: https://eventmitra-backend.onrender.com
   (Use YOUR actual backend URL from STEP 1)
   ```

4. **Deploy Frontend**
   - Click **"Create Web Service"**
   - Wait 5-10 minutes
   - **COPY YOUR FRONTEND URL** (example: `https://eventmitra-frontend.onrender.com`)

---

### STEP 3: Update Backend CORS Settings

1. **Go to Backend Service**
   - Dashboard → Select **"eventmitra-backend"**

2. **Update Environment Variable**
   - Click **"Environment"** tab (left sidebar)
   - Find **`CLIENT_URL`**
   - Click **"Edit"**
   - Change value to: `https://eventmitra-frontend.onrender.com`
   - (Use YOUR actual frontend URL from STEP 2)
   - Click **"Save Changes"**

3. **Wait for Redeploy**
   - Backend will automatically redeploy (2-3 minutes)

---

## ✅ Verify Deployment

### Test Backend:
1. Open: `https://eventmitra-backend.onrender.com`
2. You should see: **"Cannot GET /"** (This is NORMAL!)
3. Try: `https://eventmitra-backend.onrender.com/api/health`
4. Should see: **"OK"** or health status

### Test Frontend:
1. Open: `https://eventmitra-frontend.onrender.com`
2. You should see: **EventMitra homepage**
3. Try clicking **"Login"** button
4. Page should load without errors

---

## 🌱 Seed Database (Create Test Accounts)

### Option 1: Run Locally
```bash
# Update your local .env file with production MongoDB URI
MONGODB_URI=mongodb+srv://username:password@cluster...

# Run seed script
node server/seed.js
```

### Option 2: Use Render Shell
1. Go to **backend service** on Render
2. Click **"Shell"** tab (top right)
3. Wait for shell to connect
4. Type: `node server/seed.js`
5. Press Enter
6. Wait for "Seeding completed" message

---

## 🔐 Test Accounts (After Seeding)

| Role | Email | Password |
|------|-------|----------|
| Student | student@test.com | password123 |
| Faculty | faculty@test.com | password123 |
| HOD | hod@test.com | password123 |
| ABC | abc@test.com | password123 |
| Registrar | registrar@test.com | password123 |
| Super Admin | superadmin@test.com | password123 |

---

## 🐛 Common Issues & Fixes

### Issue 1: Backend shows "MongooseError: buffering timed out"
**Fix:**
- Go to MongoDB Atlas
- Click "Network Access"
- Make sure `0.0.0.0/0` is whitelisted
- Wait 2-3 minutes and try again

### Issue 2: Frontend shows blank page
**Fix:**
- Check browser console (F12)
- Verify `VITE_API_URL` is correct
- Make sure backend is running (green status)

### Issue 3: "Network Error" when logging in
**Fix:**
- Go to backend service
- Check `CLIENT_URL` matches frontend URL exactly
- Must include `https://`
- Click "Save Changes" and wait for redeploy

### Issue 4: Email notifications not working
**Fix:**
- Verify Gmail app password is correct (no spaces)
- Check `EMAIL_USER` is your actual Gmail
- Make sure 2FA is enabled on Gmail account

### Issue 5: Service shows "Build failed"
**Fix:**
- Check logs for specific error
- Common: Wrong Root Directory
  - Backend: MUST be empty
  - Frontend: MUST be `client`
- Verify Build Command and Start Command are correct

---

## 📊 Deployment Status Checklist

- [ ] MongoDB Atlas cluster created
- [ ] IP `0.0.0.0/0` whitelisted in MongoDB
- [ ] Gmail app password generated
- [ ] Backend service deployed (green status)
- [ ] Frontend service deployed (green status)
- [ ] Backend `CLIENT_URL` updated to frontend URL
- [ ] Can access frontend website
- [ ] Database seeded with test accounts
- [ ] Can login with test account
- [ ] Can create and view events

---

## 🎉 Your Live URLs

**Frontend (Share this with users):**
```
https://eventmitra-frontend.onrender.com
```

**Backend API:**
```
https://eventmitra-backend.onrender.com
```

**GitHub Repository:**
```
https://github.com/ramsevakmeena93-hub/EventMitra1
```

---

## ⚠️ Important Notes

1. **Free Tier Sleep:**
   - Services sleep after 15 minutes of inactivity
   - First request takes 30-60 seconds to wake up
   - This is normal for free tier

2. **Auto Deploy:**
   - Every push to GitHub = automatic redeploy
   - Both services update independently

3. **Logs:**
   - Always check logs if something fails
   - Dashboard → Service → Logs tab

4. **Environment Variables:**
   - Never commit `.env` file to GitHub
   - Always use Render's environment variables

---

## 🆘 Need Help?

If deployment fails:
1. Check the **Logs** tab in Render dashboard
2. Look for red error messages
3. Common errors are listed in "Common Issues" section above
4. Make sure all environment variables are set correctly

---

**That's it! Your EventMitra is now live on the internet! 🚀**
