# KLIKFIBER portals

- `/myshop`: dedicated administrator login for `klikfiber@gmail.com`. No Google login or self-registration. Password is salted and hashed with scrypt in `portal_admin`; never include it in source or public environment variables. Admin sessions use random, server-validated, HttpOnly cookies, SameSite Strict, Secure in production, expiring after eight hours. Logout revokes the server session.
- Products: name, model, price, stock and description are persisted as catalog overrides. Public catalog and server checkout pricing read these same overrides.
- Sales approval: Google sign-in → full name, WhatsApp, verified account email → pending → administrator approval. Code is generated on approval. Admin can reject, suspend, reactivate and set discount limits. Sales can only set their own discount within the current limit.
- Promo codes and approved sales referral codes are resolved by the server for checkout estimates and project quote attribution. Suspended/rejected/pending sales cannot access activity or edit discounts. Tracking exposes customer name, reference, date, type, status and totals, without addresses or contact details.
- Customer account: four code-native avatar choices or uploaded JPEG/PNG/WebP photo, display name, account-owned wishlist, and required profile/address onboarding. Images are decoded and re-encoded on the server to 256px WebP, stripping metadata. Checkout loads the saved server address.
- Portal tables and customer records reject direct anonymous/authenticated database access. Application endpoints perform authorization, with the server database connection handling persistence.

Validation: `npm run build`; `scripts/check-portals.mjs` with TEST_ADMIN_PASSWORD supplied only through the process environment. This integration test checks credential restrictions, logout revocation, protected endpoints, catalog persistence, approval/suspension and discount limits. It removes only its own generated QC sales row.

Existing limitation: online order/payment creation remains disabled by the existing payment activation guard. Referral attribution for real project requests works independently; a paid purchase was not executed during this revision. Do not present simulated payments as successful transactions.
