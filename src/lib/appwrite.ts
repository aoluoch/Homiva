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
 * True when the Appwrite Web SDK already has a session locally.
 * Guest visits must not call `account.get()` — Cloud answers 401 and the
 * browser logs it even when the app treats that as "signed out".
 */
export function hasStoredAppwriteSession(): boolean {
  if (typeof window === "undefined") return false;

  // Same-origin custom domains keep the session in an HttpOnly cookie the
  // page cannot read, so the only way to know is to ask Appwrite.
  try {
    if (new URL(appwriteConfig.endpoint).origin === window.location.origin) {
      return true;
    }
  } catch {
    /* fall through to stored-session checks */
  }

  const sessionKey = `a_session_${appwriteConfig.projectId}`;

  try {
    const hasCookie = document.cookie
      .split(";")
      .some((part) => part.trim().startsWith(`${sessionKey}=`));
    if (hasCookie) return true;
  } catch {
    /* ignore restricted cookie access */
  }

  try {
    const raw = window.localStorage.getItem("cookieFallback");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed[sessionKey] === "string" && parsed[sessionKey].length > 0;
  } catch {
    return false;
  }
}

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

/**
 * Fetch a private Storage file using the current session and return a blob URL.
 *
 * `fileView()` URLs are unauthenticated — the Web SDK keeps the session in
 * localStorage, so `<a href={fileView(...)}>` cannot read `team:admins` or
 * `user:<self>` files.
 */
export async function fetchAuthenticatedFileUrl(
  bucketId: string,
  fileId: string,
): Promise<string> {
  const { jwt } = await account.createJWT();
  const res = await fetch(String(storage.getFileView({ bucketId, fileId })), {
    headers: {
      "X-Appwrite-Project": appwriteConfig.projectId,
      "X-Appwrite-JWT": jwt,
    },
  });
  if (!res.ok) {
    throw new Error("Could not open this document.");
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
