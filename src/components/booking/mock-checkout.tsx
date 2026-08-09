"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { BookingStatus } from "@prisma/client";

export function MockCheckout({
  bookingNumber,
  offeringName,
  priceCents,
  currency,
  initialStatus,
}: {
  bookingNumber: string;
  offeringName: string;
  priceCents: number;
  currency: string;
  initialStatus: BookingStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"success" | "failure" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (initialStatus !== "PENDING") {
    router.replace(`/book/confirmation/${bookingNumber}`);
    return null;
  }

  async function pay(outcome: "success" | "failure") {
    setLoading(outcome);
    setError(null);
    try {
      const res = await fetch("/api/bookings/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingNumber, outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Payment failed.");
        setLoading(null);
        return;
      }
      if (outcome === "success") {
        track("completed_payment");
        track("booking_confirmed");
        router.push(`/book/confirmation/${bookingNumber}`);
      } else {
        setError("Payment failed. Your booking has not been confirmed.");
        setLoading(null);
      }
    } catch {
      setError("Payment failed. Your booking has not been confirmed.");
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Development mode — Stripe isn&apos;t configured, so this is a simulated payment. No real charge occurs.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-400" />
            Simulated payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
            <span className="text-sm text-muted-foreground">{offeringName}</span>
            <span className="font-semibold">{formatPrice(priceCents, currency)}</span>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-col gap-3">
            <Button onClick={() => pay("success")} disabled={loading !== null} size="lg">
              {loading === "success" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Simulate successful payment
            </Button>
            <Button onClick={() => pay("failure")} disabled={loading !== null} variant="outline" size="lg">
              {loading === "failure" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Simulate failed payment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
