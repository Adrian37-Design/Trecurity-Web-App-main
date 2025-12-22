# Remote Testing with Ngrok

## Quick Setup Guide

### Step 1: Install ngrok (if not already installed)

**Download:**
- Visit https://ngrok.com/download
- Or install via chocolatey: `choco install ngrok`

### Step 2: Start ngrok

**Your Nuxt app runs on port 3000**, so run:
```powershell
ngrok http 3000
```

### Step 3: Share the URL

Ngrok will display something like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

**Share this URL** with your remote tester: `https://abc123.ngrok-free.app`

### Step 4: Test Access

Your remote user can:
1. Open the ngrok URL in their browser
2. Login with test credentials
3. Test all features (map, engine lock, etc.)

## Important Notes

### ⚠️ Security
- Free ngrok URLs are public (anyone with the URL can access)
- Uses a random subdomain each time
- Consider password-protecting your test account

### 🔒 Authentication
Make sure you have test user credentials ready:
- Email: `test@example.com` (or whatever you created)
- Password: [your test password]

### 📱 Mobile Testing
The ngrok URL works on mobile devices too!
- Perfect for testing responsive design
- Test GPS features on actual phones

### ⏱️ Session Limits
- Free ngrok: 2 hour session limit
- Tunnel will expire, need to restart ngrok
- URL changes each time unless you have paid plan

## Troubleshooting

**"Tunnel not found"**: Restart ngrok
**"ERR_NGROK_3200"**: Exceeded free tier limits
**Can't connect**: Make sure `npm run dev` is running on port 3000

## Alternative: Ngrok with Auth

Add basic auth for extra security:
```powershell
ngrok http 3000 --basic-auth="username:password"
```

Remote user will need to enter username/password to access.
