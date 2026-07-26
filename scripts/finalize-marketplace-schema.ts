/**
 * Targeted marketplace schema finalizer.
 *
 * This avoids the broad setup script's column-availability wait loop. It only
 * touches the schema needed by cart checkout and exits after one pass.
 */
import "dotenv/config";
import {
  Client,
  Permission,
  Query,
  Role,
  TablesDB,
  TablesDBIndexType as IndexType,
} from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT!;
const projectId = process.env.APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB = "homiva";
const SETTINGS_TABLE = "app_settings";
const DELIVERY_FEE_ROW_ID = "marketplace_delivery_fee";
const DELIVERY_FEE_KEY = "marketplace_delivery_fee_kes";

if (!endpoint || !projectId || !apiKey) {
  console.error("Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID or APPWRITE_API_KEY.");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const tablesDB = new TablesDB(client);

const P = {
  readAny: Permission.read(Role.any()),
  createAdmins: Permission.create(Role.team("admins")),
  readAdmins: Permission.read(Role.team("admins")),
  updateAdmins: Permission.update(Role.team("admins")),
  deleteAdmins: Permission.delete(Role.team("admins")),
};

async function safe(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`+ ${label}`);
    return true;
  } catch (err) {
    const e = err as { code?: number; message?: string };
    if (e.code === 409) {
      console.log(`= ${label} (exists)`);
      return true;
    }
    console.warn(`! ${label}: ${e.message ?? err}`);
    return false;
  }
}

async function ensureStringColumn(
  tableId: string,
  key: string,
  size: number,
  required = false,
) {
  return safe(`${tableId}.${key}`, () =>
    tablesDB.createStringColumn({
      databaseId: DB,
      tableId,
      key,
      size,
      required,
    }),
  );
}

async function ensureIntegerColumn(
  tableId: string,
  key: string,
  xdefault = 0,
) {
  return safe(`${tableId}.${key}`, () =>
    tablesDB.createIntegerColumn({
      databaseId: DB,
      tableId,
      key,
      required: false,
      xdefault,
    }),
  );
}

async function columnStatus(tableId: string, keys: string[]) {
  try {
    const cols = await tablesDB.listColumns({ databaseId: DB, tableId });
    const statuses = new Map(cols.columns.map((col) => [col.key, col.status]));
    for (const key of keys) {
      console.log(`  ${tableId}.${key}: ${statuses.get(key) ?? "missing"}`);
    }
    return keys.every((key) => statuses.get(key) === "available");
  } catch (err) {
    const e = err as { message?: string };
    console.warn(`! could not inspect ${tableId}: ${e.message ?? err}`);
    return false;
  }
}

async function upsertDeliveryFee() {
  try {
    await tablesDB.getRow({
      databaseId: DB,
      tableId: SETTINGS_TABLE,
      rowId: DELIVERY_FEE_ROW_ID,
    });
    console.log("= default marketplace delivery fee (exists)");
    return;
  } catch (err) {
    const e = err as { code?: number };
    if (e.code !== 404) throw err;
  }

  await tablesDB.createRow({
    databaseId: DB,
    tableId: SETTINGS_TABLE,
    rowId: DELIVERY_FEE_ROW_ID,
    data: {
      key: DELIVERY_FEE_KEY,
      value: "300",
      label: "Marketplace delivery fee",
    } as Record<string, unknown>,
    permissions: [P.readAny, P.updateAdmins, P.deleteAdmins],
  });
  console.log("+ default marketplace delivery fee");
}

async function main() {
  console.log("Finalizing marketplace schema without wait loops\n");

  await safe(`table ${SETTINGS_TABLE}`, () =>
    tablesDB.createTable({
      databaseId: DB,
      tableId: SETTINGS_TABLE,
      name: "App Settings",
      permissions: [P.createAdmins, P.readAny, P.updateAdmins, P.deleteAdmins],
      rowSecurity: true,
    }),
  );

  await ensureStringColumn(SETTINGS_TABLE, "key", 128, true);
  await ensureStringColumn(SETTINGS_TABLE, "value", 512, true);
  await ensureStringColumn(SETTINGS_TABLE, "label", 255);

  await ensureIntegerColumn("orders", "subtotal", 0);
  await ensureIntegerColumn("orders", "deliveryFee", 0);
  await ensureStringColumn("orders", "orderGroupId", 64);
  await ensureStringColumn("orders", "secureAddress", 512);

  console.log("\nColumn status:");
  const settingsReady = await columnStatus(SETTINGS_TABLE, ["key", "value", "label"]);
  await columnStatus("orders", [
    "subtotal",
    "deliveryFee",
    "orderGroupId",
    "secureAddress",
  ]);

  if (settingsReady) {
    await safe("default marketplace delivery fee", upsertDeliveryFee);
  } else {
    console.warn("! default marketplace delivery fee skipped: app_settings columns are not available yet.");
  }

  console.log("\nIndexes, one attempt each:");
  await safe("index orders.idx_order_group", () =>
    tablesDB.createIndex({
      databaseId: DB,
      tableId: "orders",
      key: "idx_order_group",
      type: IndexType.Key,
      columns: ["orderGroupId"],
    }),
  );
  await safe("index app_settings.idx_key", () =>
    tablesDB.createIndex({
      databaseId: DB,
      tableId: SETTINGS_TABLE,
      key: "idx_key",
      type: IndexType.Key,
      columns: ["key"],
    }),
  );

  try {
    const settings = await tablesDB.listRows({
      databaseId: DB,
      tableId: SETTINGS_TABLE,
      queries: [Query.limit(1)],
    });
    console.log(`\nApp settings rows visible: ${settings.total}`);
  } catch (err) {
    const e = err as { message?: string };
    console.warn(`\n! could not list app settings rows: ${e.message ?? err}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
