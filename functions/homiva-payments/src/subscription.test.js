import assert from "node:assert/strict";
import { test } from "node:test";
import { completeSubscriptionFulfillment } from "./subscription.js";

const COMPANY_ID = "company-utawala";
const OWNER_ID = "owner-utawala";

function createDb({
  company = {
    ownerId: OWNER_ID,
    status: "approved",
    data: { ownerId: OWNER_ID, status: "approved" },
  },
  failCreateSub = false,
} = {}) {
  const calls = [];
  const tablesDB = {
    async getRow({ tableId, rowId }) {
      calls.push({ op: "getRow", tableId, rowId });
      if (tableId === "partner_companies" && rowId === COMPANY_ID) return company;
      throw new Error(`unexpected getRow ${tableId} ${rowId}`);
    },
    async updateRow({ tableId, rowId, data }) {
      calls.push({ op: "updateRow", tableId, rowId, data });
      return { $id: rowId, ...data };
    },
    async listRows({ tableId }) {
      calls.push({ op: "listRows", tableId });
      return { rows: [] };
    },
    async createRow({ tableId, data }) {
      calls.push({ op: "createRow", tableId, data });
      if (tableId === "subscriptions" && failCreateSub) {
        throw new Error("Invalid document: The storefrontId value must be a valid string.");
      }
      return { $id: `${tableId}-1`, ...data };
    },
  };
  return { tablesDB, calls };
}

function baseArgs(overrides = {}) {
  return {
    callerId: OWNER_ID,
    metadata: {
      plan: "basic",
      targetType: "partner_company",
      targetId: COMPANY_ID,
      partnerCompanyId: COMPANY_ID,
    },
    amountKES: 2000,
    reference: "HOMIVA-TEST-SUB",
    log: () => {},
    userPerms: [],
    ...overrides,
  };
}

test("records the payment before publishing the partner company", async () => {
  const { tablesDB, calls } = createDb();
  const order = [];
  const result = await completeSubscriptionFulfillment({
    ...baseArgs(),
    tablesDB,
    recordPayment: async () => {
      order.push("payment");
    },
  });

  const update = calls.find((call) => call.op === "updateRow");
  order.push("company");
  assert.deepEqual(order.slice(0, 2), ["payment", "company"]);
  assert.equal(update.tableId, "partner_companies");
  assert.equal(update.data.subscriptionStatus, "active");
  assert.ok(update.data.subscriptionExpiry);
  assert.equal(result.targetId, COMPANY_ID);
});

test("replay still publishes when the payment row already exists", async () => {
  const { tablesDB, calls } = createDb();
  let recorded = false;
  await completeSubscriptionFulfillment({
    ...baseArgs(),
    tablesDB,
    skipPaymentRecord: true,
    recordPayment: async () => {
      recorded = true;
    },
  });
  assert.equal(recorded, false);
  assert.ok(calls.some((call) => call.op === "updateRow" && call.data.subscriptionStatus === "active"));
});

test("omits empty storefrontId so partner ledger rows can be created", async () => {
  const { tablesDB, calls } = createDb();
  await completeSubscriptionFulfillment({
    ...baseArgs({
      metadata: {
        plan: "basic",
        targetType: "partner_company",
        targetId: COMPANY_ID,
        partnerCompanyId: COMPANY_ID,
        storefrontId: "",
      },
    }),
    tablesDB,
    recordPayment: async () => {},
  });
  const created = calls.find((call) => call.op === "createRow" && call.tableId === "subscriptions");
  assert.ok(created);
  assert.equal("storefrontId" in created.data, false);
  assert.equal(created.data.targetType, "partner_company");
  assert.equal(created.data.targetId, COMPANY_ID);
});

test("company stays published if the subscription ledger write fails", async () => {
  const { tablesDB, calls } = createDb({ failCreateSub: true });
  const result = await completeSubscriptionFulfillment({
    ...baseArgs(),
    tablesDB,
    recordPayment: async () => {},
  });
  assert.equal(result.subscription, null);
  assert.ok(calls.some((call) => call.op === "updateRow" && call.data.subscriptionStatus === "active"));
});

test("rejects a payment that is not for the company owner", async () => {
  const { tablesDB } = createDb();
  await assert.rejects(
    () =>
      completeSubscriptionFulfillment({
        ...baseArgs({ callerId: "someone-else" }),
        tablesDB,
        recordPayment: async () => {
          throw new Error("should not record payment");
        },
      }),
    /own partner company/,
  );
});

test("does not publish a rejected company", async () => {
  const { tablesDB } = createDb({
    company: { ownerId: OWNER_ID, status: "rejected" },
  });
  await assert.rejects(
    () =>
      completeSubscriptionFulfillment({
        ...baseArgs(),
        tablesDB,
        recordPayment: async () => {
          throw new Error("should not record payment");
        },
      }),
    /cannot be published/,
  );
});
