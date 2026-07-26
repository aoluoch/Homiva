import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadMoreButton({
  hasMore,
  loading,
  onLoadMore,
  label = "Load more",
}: {
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  label?: string;
}) {
  if (!hasMore) return null;

  return (
    <div className="mt-8 flex justify-center">
      <Button
        variant="outline"
        size="lg"
        onClick={onLoadMore}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>
    </div>
  );
}
