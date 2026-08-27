import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatKES } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useBookStay, usePropertyBookings } from "@/hooks/useBookings";
import {
  addDaysKey,
  nightsBetweenKeys,
  toDateKey,
} from "@/lib/booking";
import type { Property } from "@/types/models";

export function BookingWidget({ property }: { property: Property }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: bookings } = usePropertyBookings(property.$id);
  const book = useBookStay();

  const [view, setView] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);

  // Occupied nights from confirmed, completed, or pending stays (check-in
  // inclusive, check-out exclusive) using local calendar days.
  const blocked = useMemo(() => {
    const set = new Set<string>();
    (bookings ?? []).forEach((booking) => {
      if (booking.status === "cancelled") return;
      let key = toDateKey(booking.checkIn);
      const end = toDateKey(booking.checkOut);
      while (key && end && key < end) {
        set.add(key);
        key = addDaysKey(key, 1);
      }
    });
    return set;
  }, [bookings]);

  const today = toDateKey(new Date());

  const days = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [view]);

  const nights = checkIn && checkOut ? nightsBetweenKeys(checkIn, checkOut) : 0;
  const total = nights * property.price;

  const selectDate = (key: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(key);
      setCheckOut(null);
      return;
    }
    if (key <= checkIn) {
      setCheckIn(key);
      return;
    }
    // Ensure no blocked date lies in the chosen range.
    for (let night = checkIn; night < key; night = addDaysKey(night, 1)) {
      if (blocked.has(night)) {
        toast.error("Those dates include an unavailable night.");
        return;
      }
    }
    setCheckOut(key);
  };

  const onBook = () => {
    if (!user) {
      toast.error("Log in to book this stay.");
      navigate("/login");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Select your check-in and check-out dates.");
      return;
    }
    book.mutate(
      { property, checkIn, checkOut, nights, guests },
      {
        onSuccess: () => {
          toast.success(
            "Booking confirmed! Check your email for dates, house times and directions.",
          );
          navigate("/trips");
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="mb-4 text-lg font-bold">
        {formatKES(property.price)}
        <span className="text-sm font-normal text-muted-foreground"> / night</span>
      </p>

      {/* Calendar */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {view.toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
          {days.map((date, i) => {
            if (!date) return <div key={i} />;
            const key = toDateKey(date);
            const isPast = key < today;
            const isBlocked = blocked.has(key);
            const disabled = isPast || isBlocked;
            const inRange =
              checkIn && checkOut && key > checkIn && key < checkOut;
            const isEndpoint = key === checkIn || key === checkOut;
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => selectDate(key)}
                className={cn(
                  "aspect-square rounded-md text-xs transition-colors",
                  disabled && "text-muted-foreground/30 line-through",
                  !disabled && "hover:bg-secondary",
                  inRange && "bg-primary/15",
                  isEndpoint && "bg-primary text-primary-foreground",
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border p-2">
          <p className="text-xs text-muted-foreground">Check-in</p>
          <p className="font-medium">{checkIn ?? "-"}</p>
        </div>
        <div className="rounded-lg border p-2">
          <p className="text-xs text-muted-foreground">Check-out</p>
          <p className="font-medium">{checkOut ?? "-"}</p>
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="guests">Guests</Label>
        <Input
          id="guests"
          type="number"
          min={1}
          value={guests}
          onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
          className="mt-1"
        />
      </div>

      {nights > 0 && (
        <div className="mb-4 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>
              {formatKES(property.price)} x {nights} night
              {nights > 1 ? "s" : ""}
            </span>
            <span>{formatKES(total)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary">{formatKES(total)}</span>
          </div>
        </div>
      )}

      <Button className="w-full" onClick={onBook} disabled={book.isPending}>
        {book.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {nights > 0 ? `Book · ${formatKES(total)}` : "Book stay"}
      </Button>
    </div>
  );
}
