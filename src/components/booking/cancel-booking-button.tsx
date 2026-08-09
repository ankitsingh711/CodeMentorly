"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export function CancelBookingButton({ bookingNumber }: { bookingNumber: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't cancel this booking.");
        setLoading(false);
        return;
      }
      toast.success("Booking cancelled.");
      router.refresh();
    } catch {
      toast.error("Couldn't cancel this booking. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Need to cancel?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            This will cancel your session. If a refund is due, it will be processed to your original
            payment method.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline">Keep booking</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? "Cancelling…" : "Cancel booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
