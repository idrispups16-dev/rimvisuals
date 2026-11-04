# Automatic fulfillment — staged, not live

Bot: @RIMVISUALSPAY_bot. Do not collect its token in chat, browser JavaScript, Git or logs.

Implemented: server-only Stars orders, bound Telegram payer, exact currency/amount validation, protected webhook, transactional activation with unique payment reference, 30/90-day and lifetime grants, private signed downloads, bot document delivery and /download retries, support command, single-use activation keys and admin-only key issuing/webhook setup. Database schema is applied and transaction/replay/permission checks passed with rolled-back test users. Paid-only mod access migration is deliberately NOT applied while payments are not ready.

Production prerequisites:
- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, server secrets only.
- TELEGRAM_BOT_TOKEN, sensitive Production env, value pasted by owner directly from BotFather.
- TELEGRAM_WEBHOOK_SECRET, random 32+ character secret generated on server/setup workstation.
- MOD_STORAGE_OBJECT=rimvisuals-0.4.10-hw.1.jar in private bucket mod-releases.
- AUTO_BILLING_ENABLED remains unset/false. Automatic approval review rejected enabling this flag in Production before a real payment test. Do not bypass this rejection. A separately approved owner-only test launch is required. PUBLIC_AUTO_PAYMENTS_ENABLED remains false/unset; create-order also checks site_admins server-side until public launch. Redeploy after env changes.
- Optional TELEGRAM_BOT_USERNAME=RIMVISUALSPAY_bot (code defaults to this exact provided bot).

The owner enabled Chrome local-file upload. The JAR is now uploaded to private mod-releases storage: rimvisuals-0.4.10-hw.1.jar, 438150 bytes. Database verification confirms bucket public=false. JAR SHA256: FAD349AEBC7CAB947D3D6694B447E50849D99B5B3AD93B3CD3BE07105A61C025.

Admin surface: /billing-admin.html. Run setup webhook there after redeploy, using an authenticated site administrator. Native FunPay auto-delivery has not been verified/attached for the current Minecraft services lots. Do not advertise it as active. Keys can be generated only by an admin; add to FunPay only when the correct supported native stock-delivery configuration is confirmed. Otherwise a separately hosted FunPay worker and its secure account authorization are required; no FunPay cookie was obtained or deployed.

TON automatic verification is NOT implemented/enabled. Manual wallet instructions remain truthful. Before enabling TON automation: create per-account orders with unique comments, validate finalized incoming native-TON transactions at the receiver (address, exact nanoTON amount, comment, success/no bounce, fresh timestamp), enforce one transaction per order, add scheduled reconciliation and recovery. Do not accept user screenshots or a pasted hash as proof without chain verification.

Launch blockers: real Stars invoice/payment/document delivery and refunds not tested, FunPay adapter not configured, TON verifier not configured. Refund processing/revocation must be implemented and tested before public automatic payment launch. No real customer money was collected in tests.

After all readiness checks: apply paid-launch.sql (restores mod-access gating; preserve explicit manual grants), update public payment UI from manual to automatic, and retest downloads and expiration. Existing manual payment UI is unchanged until then.

The bot token has been saved as a Production secret. The user explicitly authorized moving the existing service_role key to the same project’s Vercel Production secret. Both remain out of Git. Never include values in support notes or test logs.

The staged purchase controls are visible only to verified site administrators. Server authorization independently blocks non-admin order creation while PUBLIC_AUTO_PAYMENTS_ENABLED is unset.
