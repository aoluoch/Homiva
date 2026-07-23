import { Client, TablesDB, ID, Permission, Role, Query } from "node-appwrite";

/**
 * Homiva payments function.
 *
 * Verifies a Paystack transaction server-side (using the secret key) and then
 * fulfills the purchase depending on `purpose`:
 *   - viewing_fee  -> unlock a property for the user (viewing_payments row)
 *   - service      -> mark a service_request as paid
 *   - booking      -> confirm an Airbnb booking
 *   - order        -> mark a marketplace order as paid + decrement stock
 *   - subscription -> activate a storefront subscription (+30 days)
 *
 * All fulfillment happens here (never trusting the client) after Paystack
 * confirms the charge succeeded.
 *
 * Env:
 *   PAYSTACK_SECRET_KEY  - required, Paystack secret key (sk_...)
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
  subscriptions: "subscriptions",
  storefronts: "storefronts",
  profiles: "profiles",
  notifications: "notifications",
};

const PLAN_PRICES = { free: 0, pro: 2500, premium: 6000 };

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

  // Guard against replaying an already-fulfilled reference.
  try {
    const existing = await tablesDB.listRows({
      databaseId: DB,
      tableId: T.payments,
      queries: [Query.equal("reference", reference), Query.limit(1)],
    });
    if (existing.rows.length > 0) {
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
        relatedId: metadata.relatedId || metadata.propertyId || metadata.serviceRequestId || metadata.productId || metadata.storefrontId || "",
      },
      permissions: userPerms,
    });

  try {
    switch (purpose) {
      case "viewing_fee": {
        const { propertyId } = metadata;
        if (!propertyId) return fail("Missing propertyId.");
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
        const { propertyId, propertyTitle, hostId, checkIn, checkOut, nights, guests } = metadata;
        if (!propertyId || !checkIn || !checkOut) return fail("Missing booking details.");
        await recordPayment();
        const guestName = await profileName(tablesDB, callerId);
        const booking = await tablesDB.createRow({
          databaseId: DB,
          tableId: T.bookings,
          rowId: ID.unique(),
          data: {
            propertyId,
            propertyTitle: propertyTitle || "",
            guestId: callerId,
            guestName,
            hostId: hostId || "",
            checkIn,
            checkOut,
            nights: Number(nights) || 1,
            guests: Number(guests) || 1,
            amount: amountKES,
            status: "confirmed",
            paymentRef: reference,
          },
          permissions: [
            ...userPerms,
            Permission.update(Role.user(callerId)),
            ...(hostId ? [Permission.read(Role.user(hostId))] : []),
          ],
        });
        if (hostId) await notify(hostId, "New booking", `${guestName} booked ${propertyTitle || "your listing"}.`, "/host/bookings");
        return res.json({ ok: true, booking });
      }

      case "order": {
        const { productId, quantity = 1, phone, address } = metadata;
        if (!productId) return fail("Missing productId.");
        const product = await tablesDB.getRow({
          databaseId: DB,
          tableId: T.products,
          rowId: productId,
        });
        await recordPayment();
        const buyerName = await profileName(tablesDB, callerId);
        const order = await tablesDB.createRow({
          databaseId: DB,
          tableId: T.orders,
          rowId: ID.unique(),
          data: {
            buyerId: callerId,
            buyerName,
            sellerId: product.sellerId,
            productId,
            productTitle: product.title,
            quantity: Number(quantity) || 1,
            amount: amountKES,
            status: "paid",
            phone: phone || "",
            address: address || "",
            paymentRef: reference,
          },
          permissions: [
            ...userPerms,
            Permission.read(Role.user(product.sellerId)),
            Permission.update(Role.user(product.sellerId)),
          ],
        });
        // Decrement stock (best-effort).
        try {
          const newStock = Math.max(0, (product.stock || 0) - (Number(quantity) || 1));
          await tablesDB.updateRow({
            databaseId: DB,
            tableId: T.products,
            rowId: productId,
            data: { stock: newStock },
          });
        } catch (e) {
          log(`stock update note: ${e.message}`);
        }
        await notify(product.sellerId, "New order", `${buyerName} ordered ${product.title}.`, "/storefront/orders");
        return res.json({ ok: true, order });
      }

      case "subscription": {
        const { plan, storefrontId } = metadata;
        if (!plan || !(plan in PLAN_PRICES)) return fail("Invalid plan.");
        await recordPayment();
        const now = new Date();
        const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sub = await tablesDB.createRow({
          databaseId: DB,
          tableId: T.subscriptions,
          rowId: ID.unique(),
          data: {
            userId: callerId,
            storefrontId: storefrontId || "",
            plan,
            amount: amountKES,
            status: "active",
            reference,
            startedAt: now.toISOString(),
            expiresAt: expiry.toISOString(),
          },
          permissions: [...userPerms, Permission.update(Role.user(callerId))],
        });
        if (storefrontId) {
          try {
            await tablesDB.updateRow({
              databaseId: DB,
              tableId: T.storefronts,
              rowId: storefrontId,
              data: {
                plan,
                subscriptionStatus: "active",
                subscriptionExpiry: expiry.toISOString(),
              },
            });
          } catch (e) {
            log(`storefront plan update note: ${e.message}`);
          }
        }
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
