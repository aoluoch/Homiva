import { ID, Permission, Role } from "appwrite";
import { tablesDB } from "@/lib/appwrite";
import { appwriteConfig, TABLES } from "@/lib/config";

export interface AdminAuditEntry {
  /** The admin performing the action (user $id). */
  actorId: string;
  /** Machine-readable action key, e.g. "order_delivered". */
  action: string;
  /** The kind of record affected, e.g. "order", "product". */
  targetType: string;
  /** The affected record id, when applicable. */
  targetId?: string;
  /** Human-readable description shown in the audit trail. */
  summary: string;
}

/**
 * Write an admin action to the shared audit trail.
 *
 * Many privileged actions are performed directly from the client by admins
 * (order fulfilment, marketplace settings, product/service edits, disputes).
 * Those bypass the admin function, so we record them here to keep a complete
 * trace of who did what. This is best-effort: auditing must never block or fail
 * the primary action, so errors are swallowed.
 */
export async function logAdminAudit(entry: AdminAuditEntry): Promise<void> {
  if (!entry.actorId) return;
  try {
    await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: TABLES.auditLogs,
      rowId: ID.unique(),
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? "",
        summary: entry.summary,
      },
        // Clients may only grant roles they hold. Admins already have
        // table-level read on audit_logs, so a self grant is enough.
        permissions: [Permission.read(Role.user(entry.actorId))],
    });
  } catch {
    // Best-effort: never let audit logging interrupt the primary action.
  }
}
