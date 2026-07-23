# Deploy: Next (Vercel) + Laravel API (Railway/Render) + Neon

## 1. Database
- Create Neon project (free → Launch when live)
- Copy connection string

## 2. Laravel (`../ezurr-api`)
```bash
cd ../ezurr-api
# Set DB_CONNECTION=pgsql and DB_* / DB_URL
# CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
# RAZORPAY_KEY / RAZORPAY_SECRET / RAZORPAY_WEBHOOK_SECRET
php artisan migrate --seed --force
```
Deploy to Railway/Render as PHP service; set start command:
`php artisan serve --host=0.0.0.0 --port=$PORT`
(or use FrankenPHP / Octane / nginx+php-fpm in production)

## 3. Next.js (this repo)
Vercel env:
- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`

Without `NEXT_PUBLIC_API_URL`, the UI keeps using localStorage mocks.

## 4. Smoke
- `GET /api/health`
- Auth with mobile `9876500000` + OTP `123456` (local)
- Checkout policy + place order
- Admin → Checkout rules (syncs to Laravel when API URL set)

## 5. Backups
See `../ezurr-api/docs/ops-backup.md`
