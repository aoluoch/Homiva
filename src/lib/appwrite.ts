import {
  Account,
  Client,
  Functions,
  ID,
  Query,
  Storage,
  TablesDB,
  Teams,
} from "appwrite";
import { appwriteConfig } from "./config";

export const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
export const teams = new Teams(client);
export const functions = new Functions(client);

export { ID, Query };

/** Build a public preview URL for an image stored in a bucket. */
export function filePreview(
  bucketId: string,
  fileId: string,
  opts: { width?: number; height?: number } = {},
): string {
  const url = storage.getFilePreview({
    bucketId,
    fileId,
    width: opts.width,
    height: opts.height,
  });
  return typeof url === "string" ? url : url.toString();
}

/** Build a full-resolution view URL for a file. */
export function fileView(bucketId: string, fileId: string): string {
  const url = storage.getFileView({ bucketId, fileId });
  return typeof url === "string" ? url : url.toString();
}
