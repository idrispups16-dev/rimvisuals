# RIMVISUALS Admin Panel

This admin console is available at `/admin.html` after the corresponding deployment. It authenticates through the existing Supabase session and checks membership in `public.site_admins` before reading any member information.

## Capabilities
- Search registered member profiles by email or Minecraft nickname.
- View subscription records (read-only; no payment processing).
- Create, change, or revoke **complimentary** 30-day, 90-day, or no-expiry access grants. Grants are not proof of purchase.
- Review access change history.

## Security and provisioning
Supabase migration `rimvisuals_site_admin_console_access` was applied to project RIMVISUALS and RLS enabled on all admin tables. A single verified existing account was designated administrator only because exactly one verified account existed at the time of migration. Never authorize administrators solely using user-controlled metadata, nickname, frontend code, or email comparisons in JavaScript.

Additional administrator accounts, if needed, must be approved and added to `public.site_admins` through a privileged Supabase SQL operation. Never grant admin rights using user_metadata.

The frontend does **not** receive a Supabase secret/service-role key. Users cannot create administrators or alter others' access through Supabase RLS policies.

Access grants are tracked in `public.manual_access` and `public.admin_activity`. The current paid subscription display remains separate.

## Payment status
Checkout at `/api/checkout` intentionally returns HTTP 503 and plans on the site are display-only. Do not activate selling Minecraft Java mods without independent legal authorization and policy review. See https://www.minecraft.net/en-us/eula .

## Validation before merging
1. Confirm logged-out visitors cannot view members.
2. Confirm regular registered users cannot list other profiles, grant access or see activity.
3. Confirm the designated admin can view profiles, create a complimentary grant, see an audit record, and revoke it.
4. Confirm email verification, ordinary registration, My Account, Gallery, and payment-disabled behavior are unchanged.
5. Confirm the admin page works on both desktop and mobile widths.

Note: no live payment accounts, funds, or service keys are handled by this dashboard.
