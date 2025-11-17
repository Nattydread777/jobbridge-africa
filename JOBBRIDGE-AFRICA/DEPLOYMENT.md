# Backend Deployment Guide - Render.com

This guide walks you through deploying the JobBridge Africa backend to Render.com (free tier).

## Prerequisites

✅ GitHub account connected to this repository  
✅ MongoDB Atlas connection string (from your local `.env`)  
✅ Cloudinary credentials (from your local `.env`)  
✅ Zoho email credentials set up

---

## Step 1: Sign Up / Log In to Render

1. Go to [https://render.com](https://render.com)
2. Click **Get Started** or **Sign In**
3. Choose **Sign in with GitHub**
4. Authorize Render to access your repositories

---

## Step 2: Create New Web Service

1. From your Render Dashboard, click **New +** → **Web Service**
2. Click **Connect a repository**
3. Find and select: `Nattydread777/jobbridge-africa`
4. Click **Connect**

---

## Step 3: Configure Web Service

Fill in the following settings:

### Basic Settings

- **Name**: `jobbridge-backend` (or choose your own)
- **Region**: Choose closest to your users (e.g., Frankfurt for Europe, Oregon for US)
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`

### Build & Deploy

- **Build Command**: `npm install`
- **Start Command**: `node server.js`

### Instance Type

- **Plan**: **Free** (select the free tier)

---

## Step 4: Add Environment Variables

Click **Advanced** → **Add Environment Variable** and add these one by one:

### Required Variables

| Key                        | Value                                                                 | Notes                               |
| -------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| `NODE_ENV`                 | `production`                                                          | -                                   |
| `PORT`                     | `4000`                                                                | -                                   |
| `MONGO_URI`                | `mongodb+srv://...`                                                   | Copy from your local `backend/.env` |
| `JWT_SECRET`               | Your secret from local `.env`                                         | Long random string                  |
| `JWT_EXPIRE`               | `7d`                                                                  | -                                   |
| `COOKIE_EXPIRE`            | `7`                                                                   | In days                             |
| `CLOUDINARY_CLIENT_NAME`   | Your Cloudinary cloud name                                            | From local `.env`                   |
| `CLOUDINARY_CLIENT_API`    | Your Cloudinary API key                                               | From local `.env`                   |
| `CLOUDINARY_CLIENT_SECRET` | Your Cloudinary API secret                                            | From local `.env`                   |
| `EMAIL_USER`               | `info@jobbridgeafrica.org`                                            | -                                   |
| `EMAIL_PASS`               | `pBC7sZeQYAB9`                                                        | Your Zoho app password              |
| `ALLOWED_ORIGINS`          | `https://www.jobbridgeafrica.org,https://jobbridge-africa.vercel.app` | Comma-separated, no spaces          |

### Optional Variables (only if needed)

| Key            | Value           | Notes                     |
| -------------- | --------------- | ------------------------- |
| `EMAIL_HOST`   | `smtp.zoho.com` | Override default          |
| `EMAIL_PORT`   | `587`           | Use 587 if 465 fails      |
| `EMAIL_SECURE` | `false`         | Set to false for port 587 |

---

## Step 5: Deploy

1. Click **Create Web Service** at the bottom
2. Render will:
   - Clone your repository
   - Run `npm install` in the `backend` folder
   - Start the server with `node server.js`
3. Wait for "Your service is live 🎉" (takes 1-3 minutes)

---

## Step 6: Copy Your Backend URL

1. Your backend will be live at: `https://jobbridge-backend.onrender.com` (or your chosen name)
2. **Copy this URL** — you'll need it for the frontend

---

## Step 7: Update Frontend on Vercel

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your **JobBridge Africa** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
   - **Key**: `VITE_API_BASE`
   - **Value**: `https://jobbridge-backend.onrender.com/api` (replace with your URL)
   - **Environments**: Check all (Production, Preview, Development)
5. Click **Save**
6. Go to **Deployments** tab
7. Click ⋯ (three dots) on latest deployment → **Redeploy**
8. Check "Use existing Build Cache" → Click **Redeploy**

---

## Step 8: Test Your Deployment

### Test Backend Directly

Open in browser or use curl:

```bash
https://jobbridge-backend.onrender.com/
```

You should see a JSON response:

```json
{
  "message": "JobBridge Africa API is running",
  "version": "1.0.0",
  "status": "healthy",
  "timestamp": "2025-11-17T..."
}
```

### Test Health Endpoint

```bash
https://jobbridge-backend.onrender.com/health
```

Should return:

```json
{
  "status": "OK",
  "uptime": 123.45,
  "timestamp": "...",
  "environment": "production"
}
```

### Test Contact Form

1. Go to: `https://www.jobbridgeafrica.org/contact`
2. Fill out the form with your details
3. Click **Send Message**
4. ✅ Expected: Success message appears
5. ✅ Check your email for:
   - Message received at `info@jobbridgeafrica.org`
   - Auto-reply sent to the email you entered

---

## Troubleshooting

### "Service Unavailable" or 503

- Wait 30 seconds (free tier sleeps after 15 min inactivity)
- First request wakes it up

### CORS Errors in Browser Console

- Check `ALLOWED_ORIGINS` includes your exact Vercel domain
- No trailing slashes in origins
- Redeploy backend after changing env vars

### Email Not Sending

- Check `EMAIL_USER` and `EMAIL_PASS` are correct
- Check Render logs: Dashboard → Your Service → Logs
- Look for "SMTP verify failed" or "EAUTH" errors
- Try setting `EMAIL_PORT=587` and `EMAIL_SECURE=false`

### MongoDB Connection Failed

- Verify `MONGO_URI` is correct
- Check MongoDB Atlas allows connections from `0.0.0.0/0` (all IPs)
- Or whitelist Render's IPs in Atlas Network Access

### Build Failed

- Check Render logs for npm install errors
- Verify `backend/package.json` has all dependencies
- Make sure `ROOT_DIRECTORY` is set to `backend`

---

## Important Notes

### Free Tier Limitations

- ⏱️ Service sleeps after 15 minutes of inactivity
- 🐌 First request after sleep takes ~30 seconds to wake up
- 💾 750 hours/month of runtime (enough for a small site)
- 💿 No persistent disk storage (use MongoDB Atlas/Cloudinary)

### Keeping Your Service Awake (Optional)

Use a service like [UptimeRobot](https://uptimerobot.com) to ping your backend every 10 minutes:

- Ping URL: `https://jobbridge-backend.onrender.com/health`
- Interval: 10 minutes
- This keeps it from sleeping (stays within 750hr/month limit)
- Use `/health` endpoint instead of `/` for cleaner logs

### Auto-Deploy from GitHub

- Render watches your `main` branch
- Every `git push` triggers automatic redeployment
- Check **Dashboard → Events** to see deployment status

---

## Next Steps After Deployment

1. ✅ Test all features:

   - User registration/login
   - Job posting
   - Applications
   - Resume upload
   - Contact form

2. 📊 Monitor logs:

   - Render Dashboard → Your Service → Logs
   - Watch for errors or performance issues

3. 🔒 Security checklist:

   - ✅ `JWT_SECRET` is strong and unique
   - ✅ `MONGO_URI` uses password authentication
   - ✅ `ALLOWED_ORIGINS` only includes your domains
   - ✅ Environment variables are never committed to Git

4. 🚀 Optional upgrades:
   - Consider paid tier ($7/month) to avoid sleep
   - Set up custom domain in Render (if not using Vercel domain)
   - Add health check endpoint monitoring with UptimeRobot
   - Review rate limiting settings if needed (currently 100 req/15min general, 20 req/15min auth, 5 req/hour contact)

---

## Security & Performance Features

The backend now includes:

- ✅ **Helmet.js**: Security headers (XSS protection, content policy, etc.)
- ✅ **Compression**: Gzip compression for faster API responses
- ✅ **Rate Limiting**:
  - General API: 100 requests per 15 minutes per IP
  - Auth endpoints: 20 requests per 15 minutes per IP
  - Contact form: 5 submissions per hour per IP
- ✅ **Environment Validation**: Server won't start if required env vars are missing
- ✅ **Health Endpoints**: `/health` and `/api/health` for monitoring
- ✅ **HTTP Logging**: Morgan logger (dev mode only, not in production logs)

---

## Support

- **Render Docs**: [https://render.com/docs](https://render.com/docs)
- **Render Community**: [https://community.render.com](https://community.render.com)
- **JobBridge Support**: info@jobbridgeafrica.org

---

**Good luck with your deployment! 🚀**
