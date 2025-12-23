# Setting Up Email OTP Delivery

## Quick Setup Guide

### Step 1: Get Gmail App Password

1. **Go to:** https://myaccount.google.com/apppasswords
2. **Sign in** to your Google account
3. **Create App Password:**
   - App name: "Trecurity OTP"
   - Click "Create"
4. **Copy the 16-character password** (looks like: `xxxx xxxx xxxx xxxx`)

### Step 2: Update Your Local .env

Add these lines to your `.env` file:

```env
# SMTP Email Configuration
NUXT_PUBLIC_SMTP_HOST="smtp.gmail.com"
NUXT_PUBLIC_SMTP_PORT="587"
NUXT_PUBLIC_SMTP_USER="your-email@gmail.com"
NUXT_PUBLIC_SMTP_PASSWORD="xxxx xxxx xxxx xxxx"
NUXT_PUBLIC_SMTP_FROM="your-email@gmail.com"
```

**Replace:**
- `your-email@gmail.com` = Your Gmail address
- `xxxx xxxx xxxx xxxx` = The App Password you just created

### Step 3: Update Vercel Environment Variables

1. **Vercel Dashboard** → Settings → Environment Variables
2. **Add each one:**
   - `NUXT_PUBLIC_SMTP_HOST` = `smtp.gmail.com`
   - `NUXT_PUBLIC_SMTP_PORT` = `587`
   - `NUXT_PUBLIC_SMTP_USER` = `your-email@gmail.com`
   - `NUXT_PUBLIC_SMTP_PASSWORD` = `your app password`
   - `NUXT_PUBLIC_SMTP_FROM` = `your-email@gmail.com`

3. **Save and Redeploy**

### Step 4: Enable 2FA for Users

**Via UI:**
1. Login to your app (as super admin)
2. Go to Users section
3. Edit a user
4. Enable "Two Factor Authentication"
5. Save

**Or create new user with 2FA enabled**

### Step 5: Test

1. **Logout**
2. **Login with that user**
3. **Random 6-digit OTP** will be sent to their email!
4. **Check inbox** for OTP code
5. **Enter OTP** to complete login

---

## How It Works

**With SMTP configured:**
- ✅ Random 6-digit OTP generated on each login
- ✅ Sent to user's email address
- ✅ Different code every time
- ✅ Expires after use

**Without SMTP:**
- ⚠️ OTP generated but not sent
- ⚠️ Only visible in server logs
- ⚠️ Not useful for production

---

## Alternative Email Services

### SendGrid (Free Tier: 100 emails/day)
```env
NUXT_PUBLIC_SMTP_HOST="smtp.sendgrid.net"
NUXT_PUBLIC_SMTP_PORT="587"
NUXT_PUBLIC_SMTP_USER="apikey"
NUXT_PUBLIC_SMTP_PASSWORD="your-sendgrid-api-key"
NUXT_PUBLIC_SMTP_FROM="verified-sender@yourdomain.com"
```

### Mailgun, AWS SES, etc.
Similar setup - just get SMTP credentials and update values.

---

## Ready?

**Tell me when you:**
1. ✅ Created Gmail App Password
2. ✅ Have the password ready

Then I'll help you add it to .env and Vercel!
