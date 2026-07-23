import { Link } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatKES } from "@/lib/utils";
import { useMyTrips } from "@/hooks/useBookings";

export default function TripsPage() {
  const { data, isLoading } = useMyTrips();

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="mb-6 text-3xl font-bold">My Trips</h1>
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No trips yet"
          description="Book an Airbnb stay and your reservations will appear here."
          action={
            <Button asChild>
              <Link to="/properties?type=airbnb">Explore stays</Link>
            </Button>
          }
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
                    {b.checkIn?.slice(0, 10)} → {b.checkOut?.slice(0, 10)} ·{" "}
                    {b.nights} night{b.nights > 1 ? "s" : ""} · {b.guests} guest
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
