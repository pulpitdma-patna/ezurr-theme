# Deploy (quick start)

UI and API stay on **separate hosts**. Full walkthrough with screenshots:

→ **[DEPLOYMENT.md](./DEPLOYMENT.md)** — full guide with screenshots  
  (canonical copy also in `ezurr-api/docs/DEPLOYMENT.md`)

## Storefront env (this repo)

| Variable | Example | Notes |
|----------|---------|--------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | Laravel upstream |
| `NEXT_PUBLIC_API_PROXY` | `1` | Production default when API URL is set — browser uses same-origin `/api` |

Set `NEXT_PUBLIC_API_PROXY=0` only if the browser should call the API origin
directly (then API `CORS_ORIGINS` must include this UI origin).

Without `NEXT_PUBLIC_API_URL`, the UI keeps using localStorage mocks (and
production builds refuse to ship).

## API side (sibling repo)

1. Start from `ezurr-api/.env.production.example`
2. `php artisan ezurr:install --force` (optional `--claim-token`)
3. Run **web + worker + scheduler** (`Procfile`)
4. Claim the store on `/setup`, then **Admin → Integrations** for keys/secrets
5. Flip `*_DRIVER=live` in API env when ready

## Smoke

- UI: `GET /api/health` (proxied) or API: `GET https://api…/api/health`
- Unclaimed store: `/` → `/setup`
- Claim owner, then Admin → System / Integrations
- Place a test order; confirm webhooks when live

## Backups

See `../ezurr-api/docs/ops-backup.md`
