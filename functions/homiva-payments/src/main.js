import { Client, TablesDB, ID, Permission, Role, Query } from "node-appwrite";

/**
 * Homiva payments function.
 *
 * Verifies a Paystack transaction server-side using a function-only secret
 * variable, validates the paid amount against Appwrite data, then fulfills the
 * purchase depending on `purpose`:
 *   - viewing_fee  -> unlock a property for the user (viewing_payments row)
 *   - service      -> mark a service_request as paid
 *   - booking      -> confirm an Airbnb booking
 *   - order        -> mark a marketplace order as paid + decrement stock
 *   - subscription -> activate a partner company or legacy storefront subscription (+30 days)
 *
 * All fulfillment happens here (never trusting the client) after Paystack
 * confirms the charge succeeded.
 *
 * Runtime secrets:
 *   PAYSTACK_SECRET_KEY  - required Appwrite function secret variable (sk_...)
 *                          Do not store the live key in the app .env file.
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
        const guestName = await profileName(tablesDB, callerId);
        const booking = await tablesDB.createRow({
          databaseId: DB,
          tableId: T.bookings,
          rowId: ID.unique(),
          data: {
            propertyId,
            propertyTitle: property.title || "",
            guestId: callerId,
            guestName,
            hostId: property.ownerId || "",
            checkIn,
            checkOut,
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
        if (property.ownerId) await notify(property.ownerId, "New booking", `${guestName} booked ${property.title || "your listing"}.`, "/host/bookings");
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
          if (company.ownerId !== callerId) {
            return fail("You can only subscribe your own partner company profile.", 403);
          }
          if (company.status !== "approved") {
            return fail("Partner company must be approved before subscription can publish it.");
          }
        } else if (storefrontId) {
          const store = await tablesDB.getRow({
            databaseId: DB,
            tableId: T.storefronts,
            rowId: storefrontId,
          });
          if (store.ownerId !== callerId) {
            return fail("You can only subscribe your own storefront.", 403);
          }
        }
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
            targetType: resolvedTargetType,
            targetId: resolvedTargetId,
            plan,
            amount: amountKES,
            status: "active",
            reference,
            startedAt: now.toISOString(),
            expiresAt: expiry.toISOString(),
          },
          permissions: [...userPerms, Permission.update(Role.user(callerId))],
        });
        if (resolvedTargetType === "partner_company") {
          try {
            await tablesDB.updateRow({
              databaseId: DB,
              tableId: T.partnerCompanies,
              rowId: resolvedTargetId,
              data: {
                plan,
                subscriptionStatus: "active",
                subscriptionExpiry: expiry.toISOString(),
              },
            });
          } catch (e) {
            log(`partner company plan update note: ${e.message}`);
          }
        } else if (storefrontId) {
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
