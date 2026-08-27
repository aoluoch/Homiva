import { Client, TablesDB, ID, Permission, Role, Query, Messaging, Teams, Users } from "node-appwrite";

/**
 * Homiva payments function.
 *
 * Verifies a Paystack transaction server-side using a function-only secret
 * variable, validates the paid amount against Appwrite data, then fulfills the
 * purchase depending on `purpose`:
 *   - viewing_fee  -> unlock a property for the user (viewing_payments row)
 *   - service      -> mark a service_request as paid
 *   - booking      -> confirm an Airbnb booking, notify guest/host/admins,
 *                     and email the guest dates, house times, amount and map
 *   - order        -> mark a marketplace order as paid + decrement stock
 *   - subscription -> activate a partner company or legacy storefront subscription (+30 days)
 *
 * All fulfillment happens here (never trusting the client) after Paystack
 * confirms the charge succeeded.
 *
 * Runtime secrets:
 *   PAYSTACK_SECRET_KEY  - required Appwrite function secret variable (sk_...)
 *                          Do not store the live key in the app .env file.
 *   RESEND_API_KEY       - optional fallback for booking confirmation emails
 *   APP_URL              - public site URL used in confirmation links
 * Auth:
 *   x-appwrite-user-id   - authenticated caller (injected by Appwrite)
 *   x-appwrite-key       - dynamic API key (recommended) OR APPWRITE_API_KEY env
 */

const DB = "homiva";
const T = {
  payments: "payments",
  viewingPayments: "viewing_payments",
  serviceRequests: "service_requests",
  bookings: "bookings",
  orders: "orders",
  products: "products",
  properties: "properties",
  subscriptions: "subscriptions",
  storefronts: "storefronts",
  partnerCompanies: "partner_companies",
  profiles: "profiles",
  notifications: "notifications",
  appSettings: "app_settings",
};

const VIEWING_FEE_KES = 200;
const PLAN_PRICES = { basic: 2000 };
const MARKETPLACE_DELIVERY_FEE_SETTING = "marketplace_delivery_fee_kes";
const MARKETPLACE_DELIVERY_FEE_ROW_ID = "marketplace_delivery_fee";
const DEFAULT_MARKETPLACE_DELIVERY_FEE_KES = 300;
const DEFAULT_CHECK_IN_TIME = "15:00";
const DEFAULT_CHECK_OUT_TIME = "11:00";
const APP_URL =
  process.env.APP_URL ||
  process.env.HOMIVA_APP_URL ||
  "https://homiva.appwrite.network";

export default async ({ req, res, log, error }) => {
  const endpoint =
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    "https://fra.cloud.appwrite.io/v1";
  const projectId =
    process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = req.headers["x-appwrite-key"] || process.env.APPWRITE_API_KEY;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  const tablesDB = new TablesDB(client);
  const messaging = new Messaging(client);
  const teams = new Teams(client);
  const users = new Users(client);

  const fail = (message, code = 400) =>
    res.json({ ok: false, error: message }, code);

  if (!paystackSecret) return fail("Payments not configured (missing secret key).", 500);

  const callerId = req.headers["x-appwrite-user-id"];
  if (!callerId) return fail("Not authenticated.", 401);

  let body;
  try {
    body = req.bodyJson ?? JSON.parse(req.body || "{}");
  } catch {
    return fail("Invalid request body.");
  }

  const { reference, purpose, metadata = {} } = body;
  if (!reference) return fail("Missing transaction reference.");
  if (!purpose) return fail("Missing payment purpose.");

  // 1) Verify the transaction with Paystack.
  let tx;
  try {
    const r = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } },
    );
    const json = await r.json();
    if (!json.status || !json.data) {
      return fail(json.message || "Could not verify transaction.");
    }
    tx = json.data;
  } catch (e) {
    error(`Paystack verify failed: ${e.message}`);
    return fail("Payment verification failed.", 502);
  }

  if (tx.status !== "success") {
    return fail(`Payment not successful (status: ${tx.status}).`);
  }

  if ((tx.currency || "").toUpperCase() !== "KES") {
    return fail("Only KES Paystack payments are accepted.");
  }

  // Guard against replaying an already-fulfilled reference.
  try {
    const existing = await tablesDB.listRows({
      databaseId: DB,
      tableId: T.payments,
      queries: [Query.equal("reference", reference), Query.limit(1)],
    });
    if (existing.rows.length > 0) {
      if (existing.rows[0].userId !== callerId) {
        return fail("This payment reference has already been used.", 409);
      }
      return res.json({ ok: true, alreadyProcessed: true, payment: existing.rows[0] });
    }
  } catch (e) {
    log(`Replay check note: ${e.message}`);
  }

  const amountKES = Math.round((tx.amount || 0) / 100);
  const userPerms = [
    Permission.read(Role.user(callerId)),
    Permission.read(Role.team("admins")),
  ];

  const notify = async (userId, title, bodyText, link) => {
    try {
      await tablesDB.createRow({
        databaseId: DB,
        tableId: T.notifications,
        rowId: ID.unique(),
        data: { userId, type: "payment", title, body: bodyText || "", link: link || "", read: false },
        permissions: [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ],
      });
    } catch (e) {
      log(`notify note: ${e.message}`);
    }
  };

  const recordPayment = async () =>
    tablesDB.createRow({
      databaseId: DB,
      tableId: T.payments,
      rowId: ID.unique(),
      data: {
        userId: callerId,
        amount: amountKES,
        currency: tx.currency || "KES",
        purpose,
        method: "paystack",
        status: "paid",
        reference,
        relatedId: metadata.relatedId || metadata.propertyId || metadata.serviceRequestId || metadata.productId || metadata.partnerCompanyId || metadata.storefrontId || metadata.targetId || "",
      },
      permissions: userPerms,
    });

  const assertPaidAmount = (expectedKES) => {
    if (!Number.isFinite(expectedKES) || expectedKES <= 0) {
      throw new Error("Invalid expected payment amount.");
    }
    if (amountKES !== Math.round(expectedKES)) {
      throw new Error(`Payment amount mismatch. Expected KES ${Math.round(expectedKES)}, received KES ${amountKES}.`);
    }
  };

  const marketplaceDeliveryFee = async () => {
    try {
      const setting = await tablesDB.getRow({
        databaseId: DB,
        tableId: T.appSettings,
        rowId: MARKETPLACE_DELIVERY_FEE_ROW_ID,
      });
      const parsed = Number(setting?.value);
      return Number.isFinite(parsed)
        ? Math.max(0, Math.round(parsed))
        : DEFAULT_MARKETPLACE_DELIVERY_FEE_KES;
    } catch (e) {
      log(`delivery fee setting note: ${e.message}`);
      return DEFAULT_MARKETPLACE_DELIVERY_FEE_KES;
    }
  };

  try {
    switch (purpose) {
      case "viewing_fee": {
        const { propertyId } = metadata;
        if (!propertyId) return fail("Missing propertyId.");
        const property = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
        });
        if (property.status !== "approved") {
          return fail("Only approved properties can be unlocked.");
        }
        if (property.locationVerificationStatus !== "verified") {
          return fail(
            "This property's location has not been verified by Homiva yet. Unlock is unavailable until verification is complete.",
          );
        }
        assertPaidAmount(VIEWING_FEE_KES);
        const payment = await recordPayment();
        const viewing = await tablesDB.createRow({
          databaseId: DB,
          tableId: T.viewingPayments,
          rowId: ID.unique(),
          data: {
            userId: callerId,
            propertyId,
            amount: amountKES,
            status: "paid",
            paymentId: payment.$id,
            unlockedAt: new Date().toISOString(),
          },
          permissions: [...userPerms, Permission.update(Role.user(callerId))],
        });
        return res.json({ ok: true, viewing });
      }

      case "service": {
        const { serviceRequestId } = metadata;
        if (!serviceRequestId) return fail("Missing serviceRequestId.");
        const request = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.serviceRequests,
          rowId: serviceRequestId,
        });
        if (request.userId !== callerId) {
          return fail("You can only pay for your own service request.", 403);
        }
        if (request.status === "paid" || request.status === "cancelled") {
          return fail(`Service request cannot be paid while ${request.status}.`);
        }
        const expected = Number(request.quotedAmount || request.estimatedMax || request.estimatedMin || 0);
        assertPaidAmount(expected);
        await recordPayment();
        const updated = await tablesDB.updateRow({
          databaseId: DB,
          tableId: T.serviceRequests,
          rowId: serviceRequestId,
          data: { status: "paid", paymentRef: reference },
        });
        return res.json({ ok: true, serviceRequest: updated });
      }

      case "booking": {
        const { propertyId, checkIn, checkOut, guests } = metadata;
        if (!propertyId || !checkIn || !checkOut) return fail("Missing booking details.");
        const property = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.properties,
          rowId: propertyId,
        });
        if (property.status !== "approved" || property.listingType !== "airbnb") {
          return fail("Only approved Airbnb listings can be booked.");
        }
        const nights = nightsBetween(checkIn, checkOut);
        if (nights <= 0) return fail("Check-out must be after check-in.");
        const guestCount = Math.max(1, Number(guests) || 1);
        assertPaidAmount(Number(property.price || 0) * nights);
        const hasOverlap = await bookingOverlaps(tablesDB, propertyId, checkIn, checkOut);
        if (hasOverlap) return fail("Those dates are no longer available.", 409);
        await recordPayment();
        const guest = await profileOf(tablesDB, users, callerId);
        const checkInTime = (property.checkInTime || "").trim() || DEFAULT_CHECK_IN_TIME;
        const checkOutTime = (property.checkOutTime || "").trim() || DEFAULT_CHECK_OUT_TIME;
        const booking = await tablesDB.createRow({
          databaseId: DB,
          tableId: T.bookings,
          rowId: ID.unique(),
          data: {
            propertyId,
            propertyTitle: property.title || "",
            guestId: callerId,
            guestName: guest.name,
            guestEmail: guest.email,
            hostId: property.ownerId || "",
            checkIn,
            checkOut,
            checkInTime,
            checkOutTime,
            nights,
            guests: guestCount,
            amount: amountKES,
            status: "confirmed",
            paymentRef: reference,
          },
          permissions: [
            ...userPerms,
            Permission.update(Role.user(callerId)),
            ...(property.ownerId ? [Permission.read(Role.user(property.ownerId))] : []),
          ],
        });
        const stayLabel = property.title || "your listing";
        await notify(
          callerId,
          "Booking confirmed",
          `Your stay at ${stayLabel} is confirmed. Host contact and directions are now unlocked.`,
          "/trips",
        );
        if (property.ownerId) {
          await notify(
            property.ownerId,
            "New booking",
            `${guest.name} booked ${stayLabel}.`,
            "/host/bookings",
          );
        }
        const adminIds = await adminUserIds(teams);
        await Promise.all(
          adminIds
            .filter((id) => id && id !== callerId && id !== property.ownerId)
            .map((adminId) =>
              notify(
                adminId,
                "Airbnb booking",
                `${guest.name} booked ${stayLabel} · ${formatStayDate(checkIn)} → ${formatStayDate(checkOut)}.`,
                "/admin?tab=bookings",
              ),
            ),
        );
        await sendBookingConfirmationEmail({
          messaging,
          log,
          error,
          guestId: callerId,
          guest,
          property,
          checkIn,
          checkOut,
          checkInTime,
          checkOutTime,
          nights,
          guests: guestCount,
          amountKES,
        });
        return res.json({ ok: true, booking });
      }

      case "order": {
        const { productId, quantity = 1, phone, address, secureAddress } = metadata;
        const rawItems = Array.isArray(metadata.items) && metadata.items.length > 0
          ? metadata.items
          : productId
            ? [{ productId, quantity }]
            : [];
        if (rawItems.length === 0) return fail("Missing cart items.");

        const mergedItems = new Map();
        for (const item of rawItems.slice(0, 20)) {
          const itemProductId = item?.productId;
          if (!itemProductId) return fail("Missing productId.");
          const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
          mergedItems.set(itemProductId, (mergedItems.get(itemProductId) || 0) + qty);
        }

        const orderItems = [];
        for (const [itemProductId, qty] of mergedItems.entries()) {
          const product = await tablesDB.getRow({
            databaseId: DB,
            tableId: T.products,
            rowId: itemProductId,
          });
          if (product.status !== "approved") {
            return fail(`${product.title || "A product"} is not available for purchase.`);
          }
          if ((product.stock || 0) < qty) {
            return fail(`Not enough stock available for ${product.title || "a product"}.`);
          }
          orderItems.push({
            product,
            quantity: qty,
            subtotal: Number(product.price || 0) * qty,
          });
        }

        const deliveryFee = await marketplaceDeliveryFee();
        const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        assertPaidAmount(subtotal + deliveryFee);
        await recordPayment();
        const buyerName = await profileName(tablesDB, callerId);
        const orderGroupId = ID.unique();
        const orders = [];

        for (const [index, item] of orderItems.entries()) {
          const { product, quantity: qty, subtotal: lineSubtotal } = item;
          const lineDeliveryFee = index === 0 ? deliveryFee : 0;
          const sellerPerms =
            product.sellerId === "homiva-admin"
              ? [
                  Permission.read(Role.team("admins")),
                  Permission.update(Role.team("admins")),
                ]
              : [
                  Permission.read(Role.user(product.sellerId)),
                  Permission.update(Role.user(product.sellerId)),
                ];
          const order = await tablesDB.createRow({
            databaseId: DB,
            tableId: T.orders,
            rowId: ID.unique(),
            data: {
              buyerId: callerId,
              buyerName,
              sellerId: product.sellerId,
              productId: product.$id,
              productTitle: product.title,
              quantity: qty,
              amount: lineSubtotal + lineDeliveryFee,
              subtotal: lineSubtotal,
              deliveryFee: lineDeliveryFee,
              orderGroupId,
              status: "paid",
              phone: phone || "",
              address: secureAddress || address || "",
              secureAddress: secureAddress || address || "",
              paymentRef: reference,
            },
            permissions: [
              ...userPerms,
              ...sellerPerms,
            ],
          });
          orders.push(order);

          try {
            const newStock = Math.max(0, (product.stock || 0) - qty);
            await tablesDB.updateRow({
              databaseId: DB,
              tableId: T.products,
              rowId: product.$id,
              data: { stock: newStock },
            });
          } catch (e) {
            log(`stock update note: ${e.message}`);
          }
          if (product.sellerId && product.sellerId !== "homiva-admin") {
            await notify(product.sellerId, "New order", `${buyerName} ordered ${product.title}.`, "/orders");
          }
        }
        return res.json({ ok: true, orders, orderGroupId });
      }

      case "subscription": {
        const { plan, storefrontId, partnerCompanyId, targetType, targetId } = metadata;
        if (!plan || !(plan in PLAN_PRICES)) return fail("Invalid plan.");
        assertPaidAmount(PLAN_PRICES[plan]);
        const resolvedTargetType = targetType || (partnerCompanyId ? "partner_company" : "storefront");
        const resolvedTargetId = targetId || partnerCompanyId || storefrontId || "";
        if (resolvedTargetType === "partner_company") {
          if (!resolvedTargetId) return fail("Missing partner company id.");
          const company = await tablesDB.getRow({
            databaseId: DB,
            tableId: T.partnerCompanies,
            rowId: resolvedTargetId,
          });
          const ownerId = rowField(company, "ownerId");
          const companyStatus = rowField(company, "status");
          if (ownerId !== callerId) {
            return fail("You can only subscribe your own partner company profile.", 403);
          }
          // Partners typically pay immediately after submitting a profile, before
          // an admin has approved it. Charge and mark the subscription active now;
          // the public directory still requires status === "approved".
          if (companyStatus === "rejected" || companyStatus === "suspended") {
            return fail("This partner company cannot be published.");
          }
        } else if (storefrontId) {
          const store = await tablesDB.getRow({
            databaseId: DB,
            tableId: T.storefronts,
            rowId: storefrontId,
          });
          if (rowField(store, "ownerId") !== callerId) {
            return fail("You can only subscribe your own storefront.", 403);
          }
        }
        const now = new Date();
        const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiryIso = expiry.toISOString();
        // Publish the paid profile before recording payment rows so a later
        // bookkeeping failure cannot leave a charged partner unpublished.
        if (resolvedTargetType === "partner_company") {
          await tablesDB.updateRow({
            databaseId: DB,
            tableId: T.partnerCompanies,
            rowId: resolvedTargetId,
            data: {
              plan,
              subscriptionStatus: "active",
              subscriptionExpiry: expiryIso,
            },
          });
        } else if (storefrontId) {
          await tablesDB.updateRow({
            databaseId: DB,
            tableId: T.storefronts,
            rowId: storefrontId,
            data: {
              plan,
              subscriptionStatus: "active",
              subscriptionExpiry: expiryIso,
            },
          });
        }
        await recordPayment();
        const sub = await tablesDB.createRow({
          databaseId: DB,
          tableId: T.subscriptions,
          rowId: ID.unique(),
          data: {
            userId: callerId,
            storefrontId: storefrontId || "",
            targetType: resolvedTargetType,
            targetId: resolvedTargetId,
            plan,
            amount: amountKES,
            status: "active",
            reference,
            startedAt: now.toISOString(),
            expiresAt: expiryIso,
          },
          permissions: [...userPerms, Permission.update(Role.user(callerId))],
        });
        return res.json({ ok: true, subscription: sub });
      }

      default:
        return fail(`Unknown purpose: ${purpose}`);
    }
  } catch (e) {
    error(`Fulfillment for ${purpose} failed: ${e.message}`);
    return fail(e.message || "Fulfillment failed.", 500);
  }
};

function rowField(row, key) {
  if (!row) return undefined;
  if (row[key] !== undefined && row[key] !== null) return row[key];
  return row.data?.[key];
}

async function profileOf(tablesDB, users, userId) {
  let name = "Homiva user";
  let email = "";
  try {
    const list = await tablesDB.listRows({
      databaseId: DB,
      tableId: T.profiles,
      queries: [Query.equal("userId", userId), Query.limit(1)],
    });
    const row = list.rows[0];
    if (row?.name) name = row.name;
    if (row?.email) email = row.email;
  } catch {
    // fall through to Users API
  }
  if (!email) {
    try {
      const account = await users.get({ userId });
      email = account.email || "";
      if (name === "Homiva user" && account.name) name = account.name;
    } catch {
      // guest email stays empty; in-app notification still works
    }
  }
  return { name, email, userId };
}

async function profileName(tablesDB, userId) {
  try {
    const list = await tablesDB.listRows({
      databaseId: DB,
      tableId: T.profiles,
      queries: [Query.equal("userId", userId), Query.limit(1)],
    });
    return list.rows[0]?.name || "Homiva user";
  } catch {
    return "Homiva user";
  }
}

async function adminUserIds(teams) {
  try {
    const memberships = await teams.listMemberships({
      teamId: "admins",
      queries: [Query.limit(100)],
    });
    return [...new Set((memberships.memberships || []).map((m) => m.userId).filter(Boolean))];
  } catch {
    return [];
  }
}

function formatStayDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso || "").slice(0, 10);
  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatClockTime(value) {
  const raw = String(value || "").trim() || DEFAULT_CHECK_IN_TIME;
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  const minutes = match[2];
  let hours = Number(match[1]);
  if (!Number.isFinite(hours)) return raw;
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

function formatKES(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}

function mapsDirectionsHref(property) {
  if (property.latitude && property.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${property.latitude},${property.longitude}`,
    )}`;
  }
  const query = [property.address, property.town, property.county, "Kenya"]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bookingConfirmationHtml({
  guestName,
  property,
  checkIn,
  checkOut,
  checkInTime,
  checkOutTime,
  nights,
  guests,
  amountKES,
}) {
  const title = escapeHtml(property.title || "your stay");
  const location = escapeHtml(
    [property.address, property.town, property.county].filter(Boolean).join(", ") ||
      "Kenya",
  );
  const host = escapeHtml(property.ownerName || "your host");
  const directions = mapsDirectionsHref(property);
  const tripsUrl = `${APP_URL.replace(/\/$/, "")}/trips`;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f6f4f0;font-family:Georgia,serif;color:#1f1b16;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f0;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#1b5e3b;color:#fff;padding:24px 28px;">
          <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Homiva</p>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;">Your stay is confirmed</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(guestName)},</p>
          <p style="margin:0 0 20px;line-height:1.5;">Payment was received and your booking at <strong>${title}</strong> is confirmed. Host contact and directions are now unlocked in your Homiva account.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f0;border-radius:12px;">
            <tr><td style="padding:16px 18px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;">${title}</p>
              <p style="margin:0 0 12px;color:#5c564e;">${location}</p>
              <p style="margin:0;line-height:1.7;">
                <strong>Dates:</strong> ${escapeHtml(formatStayDate(checkIn))} → ${escapeHtml(formatStayDate(checkOut))}<br/>
                <strong>Check-in:</strong> ${escapeHtml(formatClockTime(checkInTime))}<br/>
                <strong>Check-out:</strong> ${escapeHtml(formatClockTime(checkOutTime))}<br/>
                <strong>Guests:</strong> ${escapeHtml(String(guests))} · <strong>Nights:</strong> ${escapeHtml(String(nights))}<br/>
                <strong>Amount paid:</strong> ${escapeHtml(formatKES(amountKES))}<br/>
                <strong>Host:</strong> ${host}
              </p>
            </td></tr>
          </table>
          <p style="margin:22px 0 0;">
            <a href="${directions}" style="display:inline-block;background:#1b5e3b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Get map directions</a>
          </p>
          <p style="margin:14px 0 0;">
            <a href="${tripsUrl}" style="color:#1b5e3b;">View this trip in Homiva</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendBookingConfirmationEmail({
  messaging,
  log,
  error,
  guestId,
  guest,
  property,
  checkIn,
  checkOut,
  checkInTime,
  checkOutTime,
  nights,
  guests,
  amountKES,
}) {
  const subject = `Booking confirmed · ${property.title || "your Homiva stay"}`;
  const html = bookingConfirmationHtml({
    guestName: guest.name,
    property,
    checkIn,
    checkOut,
    checkInTime,
    checkOutTime,
    nights,
    guests,
    amountKES,
  });
  const text = [
    `Hi ${guest.name},`,
    `Your stay at ${property.title || "the listing"} is confirmed.`,
    `Dates: ${formatStayDate(checkIn)} → ${formatStayDate(checkOut)}`,
    `Check-in: ${formatClockTime(checkInTime)}`,
    `Check-out: ${formatClockTime(checkOutTime)}`,
    `Amount paid: ${formatKES(amountKES)}`,
    `Directions: ${mapsDirectionsHref(property)}`,
  ].join("\n");

  let sent = false;
  try {
    await messaging.createEmail({
      messageId: ID.unique(),
      subject,
      content: html,
      users: guestId ? [guestId] : [],
      html: true,
      draft: false,
    });
    sent = true;
    log("Booking confirmation email queued via Appwrite Messaging.");
  } catch (e) {
    log(`Messaging email note: ${e.message}`);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM || "Homiva <bookings@homiva.co.ke>";
  if (!sent && resendKey && guest.email) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [guest.email],
          subject,
          html,
          text,
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Resend ${response.status}`);
      }
      sent = true;
      log("Booking confirmation email sent via Resend.");
    } catch (e) {
      error(`Resend email failed: ${e.message}`);
    }
  }

  if (!sent) {
    log(
      "Booking email was not sent. Add an Appwrite Messaging email provider, or set RESEND_API_KEY on homiva-payments.",
    );
  }
}

function nightsBetween(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

async function bookingOverlaps(tablesDB, propertyId, checkIn, checkOut) {
  const existing = await tablesDB.listRows({
    databaseId: DB,
    tableId: T.bookings,
    queries: [
      Query.equal("propertyId", propertyId),
      Query.equal("status", ["confirmed", "completed"]),
      Query.limit(200),
    ],
  });
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  return existing.rows.some((booking) => {
    const bookingStart = new Date(booking.checkIn).getTime();
    const bookingEnd = new Date(booking.checkOut).getTime();
    return start < bookingEnd && end > bookingStart;
  });
}
