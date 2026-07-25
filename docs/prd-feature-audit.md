# Homiva PRD Feature Audit

Audit date: 2026-07-25

Standard: production-ready. A feature counts as ready only when the user flow,
data persistence, role access, real integrations, and backend enforcement are in
place.

## Summary

Homiva is not fully ready for end-to-end PRD testing across every feature in the
two PRDs. It is ready for focused QA on the core app shell, account/role flows,
real estate browsing, owner listing submission, admin moderation, Paystack-based
payments, bookings, services, storefronts, orders, reviews, messages,
notifications, disputes, invoices, and analytics where the deployed Appwrite
schema/functions are present.

The main gaps before full production testing are live Appwrite deployment
verification, server-side contact-details enforcement, provider/customer
quotation approval depth, CMS/ads/promoted listings, complete notification
channels, and deeper operational reporting.

## Feature Status

| PRD area | Status | Evidence / gap |
| --- | --- | --- |
| Single account auth | Ready | Email OTP auth, profile creation, protected routes, and Appwrite sessions exist. |
| Multi-role model | Ready | Roles map to Appwrite Teams; applications and admin approvals/suspensions exist. |
| Real estate marketplace | Ready | Sale/rent/Airbnb tabs, filters, detail pages, favorites, recent views, and inquiries exist. |
| Listing management | Ready | Owner dashboard, create/edit/delete listing flow, image upload, pending approval status. |
| Listing moderation | Ready if deployed | `homiva-admin` approves/rejects listings and role applications with audit logs. |
| KES 200 viewing fee | Ready if deployed | Paystack checkout plus `homiva-payments` verification creates unlock rows. |
| Contact/address gating | Partial | UI gates contact details; full production readiness needs function-served details or backend-enforced sensitive-field access. |
| Maps | Partial | Property detail opens Google Maps/search links; no embedded map search experience. |
| Airbnb booking | Ready if deployed | Calendar UI, booked-date blocking, Paystack verification, host bookings, guest trips. |
| Booking availability | Partial | Server now checks overlap before fulfillment, but no transactional lock exists for race-free double-book prevention. |
| Reviews | Ready | Shared review component supports property/provider/service/product/storefront targets. |
| Property buying | Partial | Mortgage enquiries and viewing requests exist; commercial/residential distinction is not deeply modeled. |
| Home services | Partial | Request flow, category/size/urgency/photos, provider acceptance, status updates, and payments exist. Customer quote approval is still lightweight. |
| Cleaning / Mama Fua | Partial | Cleaning category and package-like inputs exist inside services; no dedicated cleaning package management. |
| Provider verification | Ready if deployed | Provider profile plus admin verify/unverify actions exist. |
| Invoices | Partial | Provider invoices exist, but invoice payment/status linkage is not fully automated across all service paths. |
| Marketplace products | Ready if deployed | Product browsing, detail, purchase, stock decrement, seller orders, admin approval. |
| Storefronts | Partial | Branding, catalog, plans, products, analytics, reviews exist; plan limits are mostly UI-enforced and subscriptions need live Paystack function deployment. |
| Subscriptions | Ready if deployed | Paystack fulfillment activates plans and creates subscription rows. |
| Promoted listings / ads | Missing | PRD revenue feature is not implemented beyond `featured` fields. |
| Chat/messages | Ready | Threaded Appwrite messages with polling and per-user permissions exist. |
| Notifications | Partial | In-app notifications exist; PRD email/SMS/push channels are not implemented. |
| Disputes | Ready | Users can raise disputes; admin can view/resolve. |
| Admin reports/analytics | Partial | Admin aggregate stats exist; no exportable reports or full BI/reporting suite. |
| CMS | Missing | No CMS module found. |
| Audit logs | Ready | Admin function writes audit log rows for privileged actions. |
| Payments provider | Ready if deployed | Paystack is the implemented provider; M-PESA is intentionally out of scope per current direction. |
| Image storage | Ready | Property, avatar, product, storefront, and service photo buckets are provisioned. |
| Accessibility/responsive UI | Needs QA | Tailwind responsive layouts exist; no automated accessibility audit found. |

## Testing Gate

Begin testing in three lanes:

1. Core QA: auth, profiles, roles, property browse/save/recent/inquiry, listing
   submission, admin moderation.
2. Payments QA: Paystack test keys, deployed `homiva-payments`, viewing fee,
   bookings, orders, services, and subscriptions.
3. Later PRD QA after implementation: CMS, ads/promoted listings, full
   notification channels, server-served contact details, richer reports, and
   dedicated cleaning package management.

Do not begin full production acceptance testing until both Appwrite Functions
are deployed and the live function variables are verified in Appwrite Console.
