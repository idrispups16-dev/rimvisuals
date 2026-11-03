# RIMVISUALS website 1.0 — setup

Site repository: idrispups16-dev/rimvisuals. Billing and mod sales stay disabled; accounts need the Supabase connection below.

## Genuine gameplay screenshots

Ten real 1920×1080 screenshots live in `assets/screenshots/*.webp` (lossless WebP, pixel-identical to the supplied PNGs). See `assets/screenshots/README.md`.

## Accounts (My Account page)

Registration and sign-in use Supabase Auth. Until `SUPABASE_URL` and `SUPABASE_ANON_KEY` exist in the Vercel project, `/api/public-config` reports `authEnabled:false` and the page says so; no accounts are faked. To enable: create a Supabase project, run `supabase/schema.sql` (profiles, subscriptions, sign-up trigger that stores the Minecraft nickname, row-level security), set the two variables (plus `SITE_URL`) in Vercel, add the site URL to Supabase Auth redirect URLs, redeploy.

## Auth & billing

Deploy on Vercel with Node serverless functions. Create a Supabase project and execute `supabase/schema.sql`. Enable confirmed-email signup and set authentication redirect URL to the deployed site. Add environment variables:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public browser credentials; returned through /api/public-config)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose)
- `SITE_URL` (exact HTTPS origin)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (server-only)
- `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_QUARTERLY`, `STRIPE_PRICE_LIFETIME` once actual plan terms/prices are approved

Set Stripe webhook endpoint `/api/stripe-webhook`, with subscription created/updated/deleted and checkout.session.completed events. Use test mode until you have reviewed refund policy, consumer notices, recurring billing disclosures, tax, Minecraft commercial-use requirements, and fraud/chargeback procedures. Do not treat checkout redirect as payment verification: only signed Stripe webhooks update subscriptions. Test duplicates, webhook reordering, cancellations, failed payments, and unauthenticated requests before accepting real funds.

## Remaining work before sales

IMPORTANT: The Minecraft Java EULA currently states that original Java mods may not be sold for money or monetized. Review https://www.minecraft.net/en-us/eula and https://www.minecraft.net/en-us/usage-guidelines, and obtain appropriate legal permission or choose a compliant business model BEFORE activating any payment checkout or selling access to the mod. The current pricing section is strictly non-transactional.\n\nPrices, currency, privacy policy, terms, refund and cancellation policy, email support, detailed invoices, subscription portal and server-side license verification integrated with Fabric client still need approval/implementation. Lifetime access terms are not set. Remove lifetime option if it will not be offered. No current frontend guarantees that a paid account is enforced by the Fabric mod. Never put Stripe secret keys or Supabase service keys in HTML.
