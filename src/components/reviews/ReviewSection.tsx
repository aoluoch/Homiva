import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials, timeAgo } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  useCreateReview,
  useReviews,
  type ReviewTarget,
} from "@/hooks/useReviews";

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(!onChange && "cursor-default")}
          aria-label={`${n} star`}
        >
          <Star
            className={cn(
              "h-5 w-5",
              n <= value
                ? "fill-accent text-accent"
                : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewSection({
  targetType,
  targetId,
}: {
  targetType: ReviewTarget;
  targetId: string;
}) {
  const { user } = useAuth();
  const { data: reviews, isLoading } = useReviews(targetType, targetId);
  const create = useCreateReview();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const avg =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const submit = () => {
    create.mutate(
      { targetType, targetId, rating, comment },
      {
        onSuccess: () => {
          toast.success("Thanks for your review!");
          setComment("");
          setRating(5);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Reviews</h2>
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars value={Math.round(avg)} />
            <span className="font-medium">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({reviews.length})
            </span>
          </div>
        )}
      </div>

      {user && (
        <div className="mb-6 rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-medium">Leave a review</p>
          <Stars value={rating} onChange={setRating} />
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..."
            className="mt-3"
          />
          <Button
            className="mt-3"
            onClick={submit}
            disabled={create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Post review
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.$id} className="flex gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(r.userName)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.userName}</span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(r.$createdAt)}
                  </span>
                </div>
                <Stars value={r.rating} />
                {r.comment && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.comment}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No reviews yet. Be the first to share your experience.
        </p>
      )}
    </section>
  );
}
