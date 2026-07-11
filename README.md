# Ezurr Theme

React storefront converted from the Ezurr DC (Design Compiler) prototype — ready to deploy on [Vercel](https://vercel.com).

## Stack

- **Next.js 16** (App Router)
- **React 19** + TypeScript
- **Tailwind CSS 4** with Ezurr design tokens (`--ez-h` accent hue, oklch palette)

## Pages

| Route | Prototype source |
|-------|------------------|
| `/` | Ezurr Home |
| `/preorders` | Ezurr Preorders |
| `/consoles` | Ezurr Consoles |
| `/games` | Ezurr Games |
| `/game-cards` | Ezurr Game Cards |
| `/accessories` | Ezurr Accessories |
| `/product` | Ezurr Product |
| `/checkout` | Ezurr Preorder |

Original `.dc.html` prototypes are preserved in `../prototype/`.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this folder to GitHub (or import directly).
2. In Vercel, **Add New Project** → import the `ezurr-theme` repository.
3. Framework preset: **Next.js** (auto-detected).
4. Root directory: `ezurr-theme` if the repo contains the parent folder.
5. Deploy — no environment variables required for the demo theme.

Or use the Vercel CLI:

```bash
npm i -g vercel
cd ezurr-theme
vercel
```

## Theme customization

Edit `src/lib/theme.ts`:

- `accentHue` — brand accent (default `255`, blue)
- `showOffer` / `offerStyle` — home offer band (parallax vs split)
- `showMembership` — Ezurr Plus section
- `prepaidDiscount` — checkout prepaid discount %

Product catalog data lives in `src/data/*.json` (extracted from prototype scripts).

## Production notes

This is a **front-end theme demo**. To go live as a store:

- Wire product data to Shopify, Medusa, or your CMS
- Replace static `/product` with dynamic `[slug]` routes
- Connect checkout to a payment provider (Razorpay, Stripe, etc.)
- Add auth for sign-in and cart persistence
