import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, timeAgo } from "@/lib/utils";
import {
  useNotifications,
  useMarkAllRead,
  useMarkNotificationRead,
} from "@/hooks/useNotifications";

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  const unreadIds = (data ?? []).filter((n) => !n.read).map((n) => n.$id);

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {unreadIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate(unreadIds)}
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Updates about your bookings, orders and services will appear here."
        />
      ) : (
        <div className="space-y-2">
          {data.map((n) => {
            const content = (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                  !n.read && "border-primary/40 bg-primary/5",
                )}
                onClick={() => !n.read && markRead.mutate(n.$id)}
              >
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}</p>
                  {n.body && (
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(n.$createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                )}
              </div>
            );
            return n.link ? (
              <Link key={n.$id} to={n.link}>
                {content}
              </Link>
            ) : (
              <div key={n.$id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
