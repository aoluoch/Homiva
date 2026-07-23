import { Link } from "react-router-dom";
import { CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatKES } from "@/lib/utils";
import { useHostBookings } from "@/hooks/useBookings";

export default function HostBookingsPage() {
  const { data, isLoading } = useHostBookings();

  const revenue =
    data?.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.amount, 0) ??
    0;

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Booking Requests</h1>
        {data && data.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total revenue</p>
            <p className="font-bold text-primary">{formatKES(revenue)}</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No bookings yet"
          description="When guests book your short-stay listings, they'll appear here."
        />
      ) : (
        <div className="space-y-3">
          {data.map((b) => (
            <Card key={b.$id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <Link
                    to={`/properties/${b.propertyId}`}
                    className="font-medium hover:underline"
                  >
                    {b.propertyTitle}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {b.guestName} · {b.checkIn?.slice(0, 10)} →{" "}
                    {b.checkOut?.slice(0, 10)} · {b.guests} guest
                    {b.guests > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {formatKES(b.amount)}
                  </p>
                </div>
                <Badge
                  variant={b.status === "confirmed" ? "success" : "secondary"}
                >
                  {b.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
