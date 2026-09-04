import { useState, type ReactNode } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAuthenticatedFileUrl } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

export function VerificationDocumentLink({
  fileId,
  label,
  className,
}: {
  fileId: string;
  label: ReactNode;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const open = async () => {
    // Open synchronously so the browser treats this as a user gesture.
    const preview = window.open("about:blank", "_blank");
    setBusy(true);
    try {
      const objectUrl = await fetchAuthenticatedFileUrl(
        appwriteConfig.buckets.verificationDocuments,
        fileId,
      );
      if (preview) {
        preview.location.href = objectUrl;
      } else {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = "verification-document";
        a.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      preview?.close();
      toast.error((err as Error).message || "Could not open document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-primary hover:bg-secondary disabled:opacity-60",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate">{label}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </button>
  );
}
