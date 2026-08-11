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

/**
 * Turn opaque browser network failures into an actionable message.
 * Unregistered Appwrite web platforms surface as TypeError "Failed to fetch".
 */
export function formatAppwriteError(err: unknown, fallback = "Request failed."): string {
  const message = err instanceof Error ? err.message : String(err ?? fallback);
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return (
      "Could not reach Appwrite (network/CORS). Confirm VITE_APPWRITE_ENDPOINT " +
      "matches your project region and that this site's hostname is registered " +
      "as a Web platform in the Appwrite console."
    );
  }
  return message || fallback;
}

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
  return url;
}

/** Build a full-resolution view URL for a file. */
export function fileView(bucketId: string, fileId: string): string {
  const url = storage.getFileView({ bucketId, fileId });
  return url;
}
