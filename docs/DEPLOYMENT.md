# Deploy Ezurr (human guide)

This walks you from an empty server to a store you can claim, configure, and
take live. Screens below are **illustrative** — your exact theme may differ
slightly, but the steps match.

You deploy **two apps on two hosts**:

| Piece | Repo | Typical host |
|-------|------|----------------|
| Storefront + Admin UI | `ezurr-theme` (Next.js) | Vercel |
| JSON API | `ezurr-api` (Laravel) | Railway, Render, Cloudways, VPS |

```
  Shoppers & staff  →  https://www.yourstore.com   (Next)
                              │
                              │  /api/*  (same-origin proxy, recommended)
                              ▼
                        https://api.yourdomain.com  (Laravel)
                              │
                              ▼
                           MySQL / Postgres
```

---

## Before you start

Have these ready:

1. A database (MySQL/MariaDB on Cloudways, or Neon Postgres, etc.)
2. Two domains or subdomains (example: `www.yourstore.com` + `api.yourdomain.com`)
3. Access to both repos and your hosting dashboards
4. About 30–45 minutes for a first deploy

**Golden rules**

- Generate `APP_KEY` **once** and never rotate it casually — it decrypts
  integration secrets stored in the database.
- Keep payment/messaging drivers on `log` (practice) until credentials and
  webhooks are set. Practice mode looks successful but does not charge or SMS.
- Run a **queue worker** and a **scheduler** in production. Without the worker,
  login OTPs never leave the queue.

---

## Step 1 — Create the database

1. Create an empty database in your host’s panel (or a Neon project).
2. Copy the host, name, user, and password (or the full `DB_URL`).

You do not need to create tables by hand — the install command does that.

---

## Step 2 — Deploy the API (`ezurr-api`)

### 2a. Environment

Copy [`.env.production.example`](../../ezurr-api/.env.production.example) into the host’s
real `.env` (never commit the filled file).

Minimum values to fill:

| Variable | Example | Notes |
|----------|---------|--------|
| `APP_ENV` | `production` | Required — boot refuses `local` behind a public URL |
| `APP_DEBUG` | `false` | |
| `APP_KEY` | `base64:…` | From `php artisan key:generate --show` — **keep forever** |
| `APP_URL` | `https://api.yourdomain.com` | No trailing slash |
| `THEME_URL` | `https://www.yourstore.com` | Storefront origin |
| `CORS_ORIGINS` | `https://www.yourstore.com` | Same origin(s), comma-separated, no trailing slash |
| `DB_CONNECTION` | `mysql` / `pgsql` / `mariadb` | Must be set explicitly |
| `DB_*` or `DB_URL` | … | From Step 1 |
| `QUEUE_CONNECTION` | `database` | Do **not** use `sync` in production |

Drivers can stay on practice for first boot:

```env
RAZORPAY_DRIVER=log
MSG91_DRIVER=log
CASHFREE_DRIVER=log
SHIPROCKET_DRIVER=log
SHOPIFY_DRIVER=log
SERVER_ANALYTICS_DRIVER=log
```

**Keys, secrets, WhatsApp number, shop domain, etc. are entered later in
Admin → Integrations** — not in `.env`. Only drivers (and base URLs) stay in env.

### 2b. Install code & prepare the database

On the API host (SSH, deploy hook, or one-off console):

```bash
composer install --no-dev --optimize-autoloader
php artisan ezurr:install --force
# Optional: require a one-time code on the setup screen
# php artisan ezurr:install --force --claim-token
php artisan config:cache
php artisan route:cache
```

If you used `--claim-token`, **copy the printed code** into your password
manager. You will type it on `/setup`.

### 2c. Processes (do not skip)

Start **three** processes (see `Procfile` or `deploy/*.service`):

| Process | Command | Why |
|---------|---------|-----|
| Web | `php artisan serve` / nginx+php-fpm / Octane | Serves `/api/*` |
| Worker | `php artisan queue:work --queue=otp,default,shopify` | OTPs, messages, Shopify jobs |
| Scheduler | `php artisan schedule:work` (or cron `schedule:run`) | Abandoned-cart, periodic tasks |

Smoke-test:

```bash
curl -sS https://api.yourdomain.com/api/health
```

You want a healthy JSON response, not an HTML error page.

---

## Step 3 — Deploy the storefront (`ezurr-theme`)

In Vercel (or your Next host), set:

| Variable | Example | Notes |
|----------|---------|--------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | Upstream Laravel origin |
| `NEXT_PUBLIC_API_PROXY` | `1` | Recommended — browser calls same-origin `/api/*` |

With the proxy on, shoppers never talk cross-origin to the API; Next rewrites
`/api/*` to Laravel. Keep `CORS_ORIGINS` matching the storefront origin anyway
(RSC / server calls and any direct clients still need it).

Deploy the theme, then open the storefront URL.

---

## Step 4 — Claim the store (`/setup`)

A fresh install has **no owner**. The home page sends you to `/setup`.

![Claim your store — setup wizard](images/deploy-01-setup-wizard.jpg)

*Illustrative. Your form may include a setup-code field if you ran `--claim-token`.*

1. Open `https://www.yourstore.com/setup` (or follow the redirect from `/`).
2. Confirm the green checks: database + schema ready.
3. Enter store name, your name, and the **mobile number you will use to sign in**.
4. If you generated a claim token, enter that setup code.
5. Click **Claim store & continue**.

You are signed in as owner immediately (OTP is not used for claim — messaging
may still be in practice mode).

After claim, `/setup` closes for good. Later sign-ins use OTP on `/auth`.

---

## Step 5 — Configure integrations (Admin)

Open **Admin → Integrations**.

![Admin Integrations — configure providers](images/deploy-02-integrations.jpg)

*Illustrative. Configure each provider you need; leave the rest disconnected.*

For each provider you use, click **Configure** and paste real values:

| Integration | Typical fields |
|-------------|----------------|
| WhatsApp Business | MSG91 auth key, sender number, namespace, OTP SMS template, DLR secret |
| Razorpay / Cashfree | Key / app id, secret, webhook signing secret |
| Shiprocket | Panel email + password, tracking webhook token |
| Shopify | Access token, `*.myshopify.com` domain, webhook secret |
| Google Analytics | GA4 Measurement Protocol secret + Meta CAPI token *(public measurement / pixel IDs live under Settings → Store)* |

Secrets are stored **encrypted** in the database (using `APP_KEY`).

Then register provider webhooks to your API (examples):

| Provider | URL |
|----------|-----|
| Razorpay | `https://api.yourdomain.com/api/webhooks/razorpay` |
| Cashfree | `https://api.yourdomain.com/api/webhooks/cashfree` |
| MSG91 DLR | `https://api.yourdomain.com/api/webhooks/msg91?token=YOUR_DLR_SECRET` |
| Shiprocket | `https://api.yourdomain.com/api/webhooks/shiprocket` (token as `x-api-key`) |
| Shopify | `https://api.yourdomain.com/api/webhooks/shopify` |

Use **Test connection** on each row after saving. A result of *simulated* means
the driver is still `log` — expected until Step 6.

Also set store basics under **Settings → Store** (name, GA measurement id, Meta
pixel id, etc.).

---

## Step 6 — Flip practice → live

![Practice mode vs live](images/deploy-03-practice-vs-live.jpg)

Credentials live in Admin. **Drivers stay in the API `.env`.**

When WhatsApp templates are Meta-approved, payment webhooks are registered, and
a test order looks right in practice mode:

1. Edit API env, for example:
   ```env
   MSG91_DRIVER=live
   RAZORPAY_DRIVER=live
   ```
2. Redeploy / reload config: `php artisan config:cache`
3. Confirm the queue worker is running
4. Send a real OTP to your phone and place a small live prepaid order

Until messaging is `live`, production OTP send is refused (you will not get a
silent “success” with no SMS).

---

## Step 7 — Smoke checklist

Work through this once after go-live:

- [ ] `GET /api/health` on the API (and `/api/health` on the storefront if proxied)
- [ ] Unclaimed → claimed: `/setup` no longer available
- [ ] Owner can open Admin
- [ ] OTP sign-in works on a real handset (`MSG91_DRIVER=live` + worker)
- [ ] Catalog loads on the storefront
- [ ] COD and/or prepaid checkout completes
- [ ] Prepaid webhook marks the order paid (not only the browser sheet)
- [ ] Admin → System / health shows expected drivers
- [ ] Backup plan exists — see [ops-backup.md](../../ezurr-api/docs/ops-backup.md)

---

## Common snags

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Setup says database not ready | Bad `DB_*` / firewall | Fix env; re-run `ezurr:install` |
| Claim asks for a setup code you do not have | `--claim-token` was used | Re-run install with a new token, or clear the hash from install state (ops only) |
| OTP never arrives | Worker down, or `MSG91_DRIVER=log` | Start worker; set credentials in Integrations; flip driver to `live` |
| “Practice mode” payments | `RAZORPAY_DRIVER=log` | Expected until you flip live |
| CORS / network errors in browser | Proxy off + missing CORS | Prefer `NEXT_PUBLIC_API_PROXY=1`; keep `CORS_ORIGINS` exact |
| Integrations secrets unreadable after deploy | `APP_KEY` changed | Restore the original key from your secret store |
| Jobs “succeed” but nothing external happens | Driver still `log` | Flip the matching `*_DRIVER` after credentials are set |

---

## Updating an existing store

```bash
# On the API host after pulling a new release
php artisan ezurr:update
php artisan config:cache
php artisan route:cache
# Restart web + worker + scheduler
```

Redeploy the theme on Vercel as usual. Do not re-run the setup wizard — the
store is already claimed.

---

## Where things live (cheat sheet)

| Thing | Where you set it |
|-------|------------------|
| App key, DB, CORS, drivers | API `.env` |
| Payment / MSG91 / Shopify / Shiprocket secrets | Admin → Integrations |
| GA measurement id / Meta pixel id | Settings → Store |
| Owner phone / store name (first time) | `/setup` |
| Queue + scheduler | Host process manager (`Procfile` / systemd) |

---

## Related docs

- Theme short notes: [DEPLOY.md](./DEPLOY.md)
- Backups: [ops-backup.md](../../ezurr-api/docs/ops-backup.md)
- Env templates: [`.env.production.example`](../../ezurr-api/.env.production.example), theme Vercel env above
- Shopify module notes: [`app/Shopify/README.md`](../../ezurr-api/app/Shopify/README.md)
