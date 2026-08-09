"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";
import type { Booking, Customer, Offering, Payment, BookingStatus } from "@prisma/client";

type FullBooking = Booking & { offering: Offering; customer: Customer; payment: Payment | null };

const STATUS_FILTERS: (BookingStatus | "ALL")[] = ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "REFUNDED"];

export function BookingsTable({ initialBookings }: { initialBookings: FullBooking[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [meetingUrlBooking, setMeetingUrlBooking] = useState<FullBooking | null>(null);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const bookings = useMemo(
    () => (statusFilter === "ALL" ? initialBookings : initialBookings.filter((b) => b.status === statusFilter)),
    [initialBookings, statusFilter],
  );

  async function performAction(id: string, body: Record<string, unknown>) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Action failed.");
        return;
      }
      toast.success("Updated.");
      router.refresh();
    } catch {
      toast.error("Action failed.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
              (statusFilter === status
                ? "border-indigo-500/60 bg-indigo-500/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {status}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Date &amp; time</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No bookings match this filter.
                </td>
              </tr>
            )}
            {bookings.map((booking) => {
              const zoned = toZonedTime(booking.startsAt, booking.timezone);
              return (
                <tr key={booking.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{booking.customer.fullName}</p>
                    <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
                  </td>
                  <td className="px-4 py-3">{booking.offering.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(zoned, "MMM d, yyyy")}
                    <br />
                    <span className="text-muted-foreground">{format(zoned, "h:mm a")}</span>
                  </td>
                  <td className="px-4 py-3">{formatPrice(booking.priceCents, booking.currency)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground" title={booking.topic}>
                    {booking.topic}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={loadingId === booking.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setMeetingUrlBooking(booking);
                            setMeetingUrl(booking.meetingUrl ?? "");
                          }}
                        >
                          Set meeting link
                        </DropdownMenuItem>
                        {booking.status === "CONFIRMED" && (
                          <DropdownMenuItem onClick={() => performAction(booking.id, { action: "complete" })}>
                            Mark completed
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {booking.status !== "CANCELLED" && (
                          <DropdownMenuItem onClick={() => performAction(booking.id, { action: "cancel" })}>
                            Cancel booking
                          </DropdownMenuItem>
                        )}
                        {(booking.status === "CONFIRMED" || booking.status === "COMPLETED") && (
                          <DropdownMenuItem onClick={() => performAction(booking.id, { action: "refund" })}>
                            Refund
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!meetingUrlBooking} onOpenChange={(open) => !open && setMeetingUrlBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set meeting link</DialogTitle>
            <DialogDescription>
              Paste a Google Meet, Zoom, or Cal.com link for {meetingUrlBooking?.customer.fullName}&apos;s session.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
          />
          <div className="mt-4 flex justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={async () => {
                if (!meetingUrlBooking) return;
                await performAction(meetingUrlBooking.id, { action: "set-meeting-url", meetingUrl });
                setMeetingUrlBooking(null);
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const variant =
    status === "CONFIRMED"
      ? "success"
      : status === "PENDING"
        ? "warning"
        : status === "CANCELLED" || status === "REFUNDED"
          ? "destructive"
          : "muted";
  return <Badge variant={variant}>{status}</Badge>;
}
