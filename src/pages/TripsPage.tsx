import { Link } from "react-router-dom";
import { CalendarCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatKES } from "@/lib/utils";
import { formatClockTime, formatStayDate } from "@/lib/booking";
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
          {data.map((b) => {
            const unlocked =
              b.status === "confirmed" || b.status === "completed";
            return (
              <Card key={b.$id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link
                      to={`/properties/${b.propertyId}`}
                      className="font-medium hover:underline"
                    >
                      {b.propertyTitle}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {formatStayDate(b.checkIn)} → {formatStayDate(b.checkOut)}{" "}
                      · {b.nights} night{b.nights > 1 ? "s" : ""} · {b.guests}{" "}
                      guest{b.guests > 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Check-in {formatClockTime(b.checkInTime || "15:00")} ·
                      Check-out {formatClockTime(b.checkOutTime || "11:00")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {formatKES(b.amount)}
                    </p>
                    {unlocked && (
                      <Button asChild variant="link" className="h-auto px-0">
                        <Link to={`/properties/${b.propertyId}`}>
                          <MapPin className="h-3.5 w-3.5" />
                          View host contact and directions
                        </Link>
                      </Button>
                    )}
                  </div>
                  <Badge
                    variant={b.status === "confirmed" ? "success" : "secondary"}
                  >
                    {b.status}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
