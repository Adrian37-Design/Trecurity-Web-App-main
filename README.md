# Trecurity Web App

GPS vehicle tracking and fleet management system built with Nuxt 3.

## Features

✅ OTP-based authentication  
✅ Real-time vehicle tracking  
✅ Offline data synchronization  
✅ Analytics & reporting  
✅ Geofencing & route management  
✅ Total mileage calculation (GPS-based)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Clone and install**
   ```bash
   git clone <your-repo>
   cd Trecurity-Web-App-main
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Setup database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx tsx seed.ts  # Optional: create test user
   ```

4. **Run**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

## Test Login
- Email: `test@example.com`
- OTP: `123456`

## Environment Variables

See `.env.example` for required configuration:
- Database connection
- JWT secrets
- SMTP settings (for OTP emails)

## Key Endpoints

**Auth:**
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`

**Tracking:**
- `POST /api/device/tracking-data` - Upload GPS data
- `GET /api/vehicle/[id]/history`
- `GET /api/vehicle/[id]/analytics`

## Security

⚠️ **NEVER commit `.env` to Git!**  
⚠️ Generate unique JWT secrets for production  
⚠️ Configure real SMTP for production use

## License

Proprietary - All rights reserved