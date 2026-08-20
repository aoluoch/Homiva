/**
 * Create/update and deploy the homiva-image-compress Appwrite Function.
 *
 * This function compresses uploaded storage images down to ~1MB while keeping
 * visual quality high. It runs with an Appwrite dynamic execution API key
 * scoped only to Storage files (read + write).
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
  Role,
  Runtime,
} from "node-appwrite";
import { InputFile } from "node-appwrite/file";

const endpoint = process.env.APPWRITE_ENDPOINT!;
const projectId = process.env.APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const FUNCTION_ID = "homiva-image-compress";
const FUNCTION_NAME = "Homiva Image Compress";
const FUNCTION_DIR = resolve("functions/homiva-image-compress");
const ENTRYPOINT = "src/main.js";
const COMMANDS = "npm install";

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
  // Sharp encoding of large images can take a few seconds.
  timeout: 60,
  enabled: true,
  logging: true,
  entrypoint: ENTRYPOINT,
  commands: COMMANDS,
  scopes: [ProjectKeyScopes.FilesRead, ProjectKeyScopes.FilesWrite],
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

function packageFunction() {
  const dir = mkdtempSync(join(tmpdir(), "homiva-image-compress-"));
  const archive = join(dir, "homiva-image-compress.tar.gz");
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

  const { dir, archive } = packageFunction();
  try {
    const deployment = await functions.createDeployment({
      functionId: FUNCTION_ID,
      code: InputFile.fromPath(archive, "homiva-image-compress.tar.gz"),
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
  console.error((err as Error).message);
  process.exit(1);
});
