import { ID, Permission, Query, Role } from "node-appwrite";

const DB = "homiva";
const T = {
  subscriptions: "subscriptions",
  storefronts: "storefronts",
  partnerCompanies: "partner_companies",
};

export const PLAN_PRICES = { basic: 2000 };
const SUBSCRIPTION_MS = 30 * 24 * 60 * 60 * 1000;

export function rowField(row, key) {
  if (!row) return undefined;
  if (row[key] !== undefined && row[key] !== null) return row[key];
  return row.data?.[key];
}

/**
 * Record the payment (unless replaying), then publish the partner/storefront.
 * A later ledger failure must not undo a successful Paystack charge.
 */
export async function completeSubscriptionFulfillment({
  tablesDB,
  callerId,
  metadata = {},
  amountKES,
  reference,
  log,
  recordPayment,
  userPerms = [],
  assertPaidAmount,
  skipPaymentRecord = false,
}) {
  const { plan, storefrontId, partnerCompanyId, targetType, targetId } = metadata;
  if (!plan || !(plan in PLAN_PRICES)) {
    throw new Error("Invalid plan.");
  }
  if (assertPaidAmount && !skipPaymentRecord) {
    assertPaidAmount(PLAN_PRICES[plan]);
  }
  const resolvedTargetType =
    targetType || (partnerCompanyId ? "partner_company" : "storefront");
  const resolvedTargetId = targetId || partnerCompanyId || storefrontId || "";
  if (resolvedTargetType === "partner_company") {
    if (!resolvedTargetId) throw new Error("Missing partner company id.");
    const company = await tablesDB.getRow({
      databaseId: DB,
      tableId: T.partnerCompanies,
      rowId: resolvedTargetId,
    });
    const ownerId = rowField(company, "ownerId");
    const companyStatus = rowField(company, "status");
    if (ownerId !== callerId) {
      throw new Error("You can only subscribe your own partner company profile.");
    }
    if (companyStatus === "rejected" || companyStatus === "suspended") {
      throw new Error("This partner company cannot be published.");
    }
  } else if (storefrontId) {
    const store = await tablesDB.getRow({
      databaseId: DB,
      tableId: T.storefronts,
      rowId: storefrontId,
    });
    if (rowField(store, "ownerId") !== callerId) {
      throw new Error("You can only subscribe your own storefront.");
    }
  }

  if (!skipPaymentRecord && recordPayment) {
    await recordPayment();
  }

  const now = new Date();
  const expiryIso = new Date(now.getTime() + SUBSCRIPTION_MS).toISOString();

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

  let subscription = null;
  try {
    const existingSubs = await tablesDB.listRows({
      databaseId: DB,
      tableId: T.subscriptions,
      queries: [Query.equal("reference", reference), Query.limit(1)],
    });
    if (existingSubs.rows.length === 0) {
      const payload = {
        userId: callerId,
        targetType: resolvedTargetType,
        targetId: resolvedTargetId,
        plan,
        amount: amountKES,
        status: "active",
        reference,
        startedAt: now.toISOString(),
        expiresAt: expiryIso,
      };
      if (storefrontId) payload.storefrontId = storefrontId;
      subscription = await tablesDB.createRow({
        databaseId: DB,
        tableId: T.subscriptions,
        rowId: ID.unique(),
        data: payload,
        permissions: [
          ...userPerms,
          ...(callerId ? [Permission.update(Role.user(callerId))] : []),
        ],
      });
    } else {
      subscription = existingSubs.rows[0];
    }
  } catch (e) {
    log?.(`subscription ledger note: ${e.message}`);
  }

  return { subscription, targetType: resolvedTargetType, targetId: resolvedTargetId };
}
