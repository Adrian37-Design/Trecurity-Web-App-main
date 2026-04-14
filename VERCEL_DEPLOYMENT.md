# Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

### Step 1: Push to GitHub (if not done)

```powershell
git add .
git commit -m "Prepared for Vercel deployment"
git push
```

### Step 2: Deploy via Vercel Dashboard

1. **Go to:** https://vercel.com/new
2. **Sign in** with GitHub
3. **Import** your `Trecurity-Web-App-main` repository
4. **Configure:**
   - Framework Preset: **Nuxt.js** (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `.output` (auto-filled)
   
5. **Add Environment Variables:**
   Click "Environment Variables" and add these from your `.env` file:
   
   ```
   DATABASE_URL=file:./prisma/dev.db
   NUXT_PUBLIC_JWT_APP_TOKEN_SECRET=your_secret_here
   NUXT_JWT_CONTROLLER_TOKEN_SECRET=your_controller_secret_here
   NUXT_PUBLIC_RECAPTCHA_CLIENT_SITE_KEY=
   NUXT_PUBLIC_SITE_URL=https://your-app.vercel.app
   ```

6. **Click "Deploy"**

### Step 3: After First Deployment

1. **Get your Vercel URL** (e.g., `https://trecurity.vercel.app`)
2. **Update Environment Variable:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Update `NUXT_PUBLIC_SITE_URL` to your actual Vercel URL
3. **Redeploy** (automatic on next git push)

---

## ⚙️ Alternative: Deploy via CLI

```powershell
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: trecurity
# - Directory: ./ (current)
# - Build settings: auto-detected
```

---

## 📝 Important Notes

### Database
- **Current:** SQLite (file-based) - will work for testing
- **Production:** Consider PostgreSQL or MySQL for better performance
- **Migration:** Use Prisma migrate when ready

### Auto-Deploy
- Every `git push` to main branch will auto-deploy
- Preview deployments for pull requests
- Rollback available in dashboard

### Custom Domain (Optional)
1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain (e.g., `app.trecurity.com`)
3. Update DNS records as shown

---

## ✅ Configuration Complete

Your `nuxt.config.ts` is now configured for:
- ✅ Production security enabled
- ✅ Dynamic site URL (dev vs production)
- ✅ Vite allowed hosts for deployments
- ✅ CORS and security headers

**Ready to deploy!** 🚀

---

## 🔍 Verify After Deployment

1. **Check login works**
2. **Test map display**
3. **Try vehicle tracking**
4. **Test engine commands**

If any issues, check Vercel logs in the dashboard.
