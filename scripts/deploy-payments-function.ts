/**
 * Create/update and deploy the homiva-payments Appwrite Function.
 *
 * This script intentionally does not read PAYSTACK_SECRET_KEY from `.env`.
 * If you want it to set the function secret variable during deployment, export
 * PAYSTACK_SECRET_KEY only for the shell running this command.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  Client,
  Functions,
  ProjectKeyScopes,
  Query,
  Role,
  Runtime,
} from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const endpoint = process.env.APPWRITE_ENDPOINT!;
const projectId = process.env.APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const FUNCTION_ID = "homiva-payments";
const FUNCTION_NAME = "Homiva Payments";
const FUNCTION_DIR = resolve("functions/homiva-payments");
const ENTRYPOINT = "src/main.js";
const COMMANDS = "npm install";
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

if (!endpoint || !projectId || !apiKey) {
  console.error("Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID or APPWRITE_API_KEY.");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const functions = new Functions(client);

const functionConfig = {
  functionId: FUNCTION_ID,
  name: FUNCTION_NAME,
  runtime: Runtime.Node22,
  execute: [Role.users()],
  timeout: 30,
  enabled: true,
  logging: true,
  entrypoint: ENTRYPOINT,
  commands: COMMANDS,
  scopes: [
    ProjectKeyScopes.DatabasesRead,
    ProjectKeyScopes.TablesRead,
    ProjectKeyScopes.RowsRead,
    ProjectKeyScopes.RowsWrite,
  ],
};

async function upsertFunction() {
  try {
    await functions.get({ functionId: FUNCTION_ID });
    await functions.update(functionConfig);
    console.log(`Updated function ${FUNCTION_ID}.`);
  } catch (err) {
    const e = err as { code?: number; message?: string };
    if (e.code !== 404) throw err;
    await functions.create(functionConfig);
    console.log(`Created function ${FUNCTION_ID}.`);
  }
}

async function upsertPaystackSecret() {
  if (!PAYSTACK_SECRET) {
    console.warn(
      "PAYSTACK_SECRET_KEY was not exported, so the function secret variable was not changed.",
    );
    console.warn(
      "Set it in Appwrite Console -> Functions -> homiva-payments -> Variables as a secret.",
    );
    return;
  }

  const variables = await functions.listVariables({
    functionId: FUNCTION_ID,
    queries: [Query.equal("key", "PAYSTACK_SECRET_KEY"), Query.limit(1)],
  });
  const existing = variables.variables[0];

  if (existing) {
    await functions.updateVariable({
      functionId: FUNCTION_ID,
      variableId: existing.$id,
      key: "PAYSTACK_SECRET_KEY",
      value: PAYSTACK_SECRET,
      secret: true,
    });
    console.log("Updated PAYSTACK_SECRET_KEY function secret variable.");
    return;
  }

  await functions.createVariable({
    functionId: FUNCTION_ID,
    variableId: "paystack_secret_key",
    key: "PAYSTACK_SECRET_KEY",
    value: PAYSTACK_SECRET,
    secret: true,
  });
  console.log("Created PAYSTACK_SECRET_KEY function secret variable.");
}

function packageFunction() {
  const dir = mkdtempSync(join(tmpdir(), "homiva-payments-"));
  const archive = join(dir, "homiva-payments.tar.gz");
  execFileSync("tar", [
    "--exclude=node_modules",
    "--exclude=.env",
    "-czf",
    archive,
    "-C",
    FUNCTION_DIR,
    ".",
  ]);
  return { dir, archive };
}

async function deploy() {
  await upsertFunction();
  await upsertPaystackSecret();

  const { dir, archive } = packageFunction();
  try {
    const deployment = await functions.createDeployment({
      functionId: FUNCTION_ID,
      code: InputFile.fromPath(archive, "homiva-payments.tar.gz"),
      activate: true,
      entrypoint: ENTRYPOINT,
      commands: COMMANDS,
    });
    console.log(`Deployment uploaded: ${deployment.$id} (${deployment.status}).`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

deploy().catch((err) => {
  const error = err as Error & {
    code?: number;
    type?: string;
    cause?: { code?: string; message?: string };
  };
  console.error(error.message || "Deployment failed.");
  if (error.code) console.error(`code: ${error.code}`);
  if (error.type) console.error(`type: ${error.type}`);
  if (error.cause) {
    console.error(
      `cause: ${error.cause.code ?? ""} ${error.cause.message ?? ""}`.trim(),
    );
  }
  if (/fetch failed|networkerror|enotfound|econnrefused|etimedout/i.test(error.message)) {
    console.error(
      "Hint: could not reach Appwrite. Check network/VPN/DNS and that APPWRITE_ENDPOINT is reachable.",
    );
  }
  process.exit(1);
});
