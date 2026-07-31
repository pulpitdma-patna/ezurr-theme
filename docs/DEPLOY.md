# Deploy: Next (Vercel) + Laravel API (Railway/Render) + Neon

UI and API stay on **separate hosts**. The storefront can either call the API
origin directly, or proxy `/api/*` through Next (recommended in production).

## 1. Database
- Create Neon project (free → Launch when live)
- Copy connection string

## 2. Laravel (`../ezurr-api`)
```bash
cd ../ezurr-api
# Set DB_CONNECTION=pgsql and DB_* / DB_URL
# APP_URL=https://api.yourdomain.com
# THEME_URL=https://your-app.vercel.app
# CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
# Drivers default to `log` (fake success). For real money/OTP set:
#   RAZORPAY_DRIVER=live MSG91_DRIVER=live
#   (and the matching credentials). `log` means a payment looks paid with no money moved.
php artisan ezurr:install --force
# Optional: require a one-time setup code on /setup
# php artisan ezurr:install --force --claim-token
```
Deploy to Railway/Render as PHP service; set start command:
`php artisan serve --host=0.0.0.0 --port=$PORT`
(or use FrankenPHP / Octane / nginx+php-fpm in production)

## 3. Next.js (this repo)
Vercel env:
- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` (rewrite target + RSC + images)
- `NEXT_PUBLIC_API_PROXY=1` (production default when the API URL is set; browser uses same-origin `/api`)

Set `NEXT_PUBLIC_API_PROXY=0` only if you want the browser to call the API origin
directly (then `CORS_ORIGINS` must include the UI origin).

Without `NEXT_PUBLIC_API_URL`, the UI keeps using localStorage mocks (and production builds refuse to ship).

## 4. Smoke
- UI: `GET /api/health` (proxied) or API: `GET https://api…/api/health`
- Unclaimed store: `/` redirects to `/setup`
- Claim owner on `/setup`, then Admin → System
- Checkout policy + place order
- Admin → Checkout rules (syncs to Laravel when API URL set)

## 5. Backups
See `../ezurr-api/docs/ops-backup.md`
