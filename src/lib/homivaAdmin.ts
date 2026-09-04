import { functions } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";

export interface HomivaAdminResponse {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Execute a `homiva-admin` action. The function uses an API key, so it can
 * grant document/file permissions the browser session is not allowed to set
 * (other users, `team:admins`). Some actions are admin-only; others are
 * available to any authenticated user.
 */
export async function executeHomivaAdmin<
  T extends HomivaAdminResponse = HomivaAdminResponse,
>(payload: object): Promise<T> {
  let execution;
  try {
    execution = await functions.createExecution({
      functionId: appwriteConfig.functions.admin,
      body: JSON.stringify(payload),
      async: false,
    });
  } catch (err) {
    const e = err as { code?: number; message?: string };
    if (e.code === 404 || e.message?.includes("Function")) {
      throw new Error(
        `Admin function "${appwriteConfig.functions.admin}" is not deployed or the VITE_APPWRITE_FUNCTION_ADMIN value is wrong. Run npm run deploy:admin, then retry.`,
      );
    }
    throw err;
  }

  let parsed: HomivaAdminResponse = {};
  try {
    parsed = JSON.parse(execution.responseBody || "{}");
  } catch {
    throw new Error("Unexpected response from admin function.");
  }
  if (!parsed.ok) {
    throw new Error(parsed.error || "Admin action failed.");
  }
  return parsed as T;
}
