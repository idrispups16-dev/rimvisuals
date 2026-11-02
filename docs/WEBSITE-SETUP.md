# RIMVISUALS website 1.0 — setup

Site repository: idrispups16-dev/rimvisuals. This branch is a draft, **not production-ready**.

## Genuine gameplay screenshots

The owner supplied nine real gameplay screenshots in ChatGPT. They were optimized as WebP in a separate ZIP attachment. Upload its `assets/screenshots/*.webp` files to this branch before merging. The site now references those files, and the former embedded AI concept gallery has been removed. Confirm each screenshot actually shows your client, and obtain permission from other players if identifiable names appear.

## Auth & billing

Deploy on Vercel with Node serverless functions. Create a Supabase project and execute `supabase/schema.sql`. Enable confirmed-email signup and set authentication redirect URL to the deployed site. Add environment variables:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public browser credentials; returned through /api/public-config)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose)
- `SITE_URL` (exact HTTPS origin)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (server-only)
- `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_QUARTERLY`, `STRIPE_PRICE_LIFETIME` once actual plan terms/prices are approved

Set Stripe webhook endpoint `/api/stripe-webhook`, with subscription created/updated/deleted and checkout.session.completed events. Use test mode until you have reviewed refund policy, consumer notices, recurring billing disclosures, tax, Minecraft commercial-use requirements, and fraud/chargeback procedures. Do not treat checkout redirect as payment verification: only signed Stripe webhooks update subscriptions. Test duplicates, webhook reordering, cancellations, failed payments, and unauthenticated requests before accepting real funds.

## Remaining work before sales

Prices, currency, privacy policy, terms, refund and cancellation policy, email support, detailed invoices, subscription portal and server-side license verification integrated with Fabric client still need approval/implementation. Lifetime access terms are not set. Remove lifetime option if it will not be offered. No current frontend guarantees that a paid account is enforced by the Fabric mod. Never put Stripe secret keys or Supabase service keys in HTML. Images must be uploaded before merging this branch.
