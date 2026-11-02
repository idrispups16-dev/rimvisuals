# RIMVISUALS website: audit and proposed design

Review date: 2026-11-03 (Asia/Dubai). Status: design only; implementation pending review.

## Verified source
- Launcher repository main: 2142161915d9e755dff396b5f12e450193492449. Contains Electron/Vite launcher and Fabric sources; no website deployment configuration found. Do not modify it.
- Separate website repository: https://github.com/idrispups16-dev/rimvisuals, main c46453a. Contains README.md and a 381,818-byte index.html only. No package manifest, auth server, database schema, tests, or vercel.json.
- Existing site source includes six embedded WebP concept images, also reused in feature highlights. It explicitly labels them concept art. Preserve the separate embedded logo; replace only gallery/highlight imagery.
- Social links are empty and download/version fields say Coming Soon. The claim that every feature is cosmetic needs review against HW/FT event and cooldown helpers.
- Connected Vercel account returned no matching projects and no teams. Production project, source linkage, build configuration and environment cannot be verified. The web fetch of the live URL failed; this does not establish site downtime.
- The referenced chat returns text markers for 11 attachments, without image bytes or download links. Real screenshots cannot be recovered from that response.

## Approaches
1. Recommended: preserve landing design, add a small server-backed account application with managed authentication and PostgreSQL. Fewer custom security components, but requires selecting and configuring a service.
2. Custom authentication/database: greater hosting flexibility, substantially more security and maintenance work.
3. Static visual demo: fastest preview, but cannot provide real protected accounts or authoritative licences. Not a substitute for the requested implementation.

## Proposed implementation
Keep existing purple branding and responsive landing. Add /gallery, /plans, /register, /login, /account, /account/licenses, /account/payments. Plans have no invented price, duration or entitlements; show sales unavailable until approved.

Use a managed identity provider for verified email, password reset and server-verified sessions. Suggested option for approval: Supabase Auth with PostgreSQL and row-level security. No passwords, session secrets or authoritative entitlements in localStorage. Production and preview use separate credentials and data.

Profile is private by default: user ID, optional Minecraft nickname, timestamps. Subscriptions, licences and payments are owned by authenticated user ID. Server-only writes control payment state and access. Users can view their own records and revoke their own access credentials, but cannot mint licences or change subscription status. Deny cross-user queries and expire/revoke access on every check. Integrating enforcement into the finished mod/launcher is outside this change: do not claim it is enforced there.

Do not fabricate payment history, licence keys or active subscriptions. New accounts show truthful empty states. No card collection. A provider adapter remains disabled and returns unavailable until a legally permitted offer, provider, prices, currency, refund rules, renewal/cancellation terms and merchant identity are approved. A future signed webhook must verify raw-body signature, timestamp, unique event ID, server-side product/amount/currency mapping and transactionally apply idempotent updates. Never grant access from a browser success redirect. Test refunds, disputes, duplicate and out-of-order events.

Gallery: accept only supplied authentic screenshots; review for visible chat, coordinates and player names. Generate external WebP/AVIF variants, responsive srcset, explicit dimensions, lazy loading below fold and full-resolution viewer with captions, keyboard navigation, focus trap and focus restoration. Keep logo. Do not replace missing screenshots with generated images.

## Commercial and branding constraints
Official sources reviewed: https://www.minecraft.net/en-us/eula and https://www.minecraft.net/en-us/usage-guidelines . Current Java mod EULA explicitly prohibits selling mods or trying to make money from them. Subscription-gated mod access must remain disabled; calling a fee support, a licence or a subscription does not establish permission. Determine a permitted business model or obtain applicable permission and legal review before enabling sales. Do not distribute Minecraft code/assets or a bundled modified game. Review screenshot permissions and branding rules for the intended commercial use; use an independent-product disclaimer and do not imply Mojang/Microsoft endorsement. Server rules for helper features require separate review; EULA compliance does not imply server approval.

## Verification plan
Before implementation: obtain actual screenshot files and confirm website repository/deployment target. Then test registration, verification, login/logout, recovery, protected routes, CSRF/origin checks, rate limits, cross-user access, revoked/expired licences, webhook authentication and replay resistance, responsive gallery, keyboard accessibility, build and dependency audit. Preview only; do not merge main or promote production. Capture actual test results separately from this plan.

## Decisions needed
- Approve proposed architecture/provider or choose an existing identity/database service.
- Reattach the original screenshots, ideally as files or ZIP.
- Confirm the separate website repository and connect the owning Vercel account/project.
- Resolve permissible commercial model first; then approve plans, prices, currencies, merchant jurisdiction, payment provider, privacy/refund/renewal terms and support contact.

No product code, main, launcher, Fabric sources or production settings changed in this design stage. No build, browser preview or auth/payment tests have run because implementation has not begun.

