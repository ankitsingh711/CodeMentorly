"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/booking/date-picker";
import { TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { TimezoneSelect, detectTimezone } from "@/components/booking/timezone-select";
import { formatDuration, formatPrice } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { Offering } from "@prisma/client";
import type { TimeSlot } from "@/lib/availability";

const detailsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  company: z.string().trim().optional(),
  topic: z.string().trim().min(5, "Tell us a bit about what you need help with"),
  notes: z.string().trim().optional(),
  linkedinOrGithub: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//.test(v ?? ""), "Must be a valid URL")
    .optional(),
});

type DetailsForm = z.infer<typeof detailsSchema>;

type Step = "date" | "time" | "details";

const MAX_ADVANCE_FALLBACK_DAYS = 45;

export function BookingWizard({ offering }: { offering: Offering }) {
  const [step, setStep] = useState<Step>("date");
  const [timezone, setTimezone] = useState(detectTimezone());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(MAX_ADVANCE_FALLBACK_DAYS);
  const [submitting, setSubmitting] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const minDate = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + maxAdvanceDays);
    return d;
  }, [maxAdvanceDays]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsForm>({ resolver: zodResolver(detailsSchema) });

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((data) => setMaxAdvanceDays(data.maxAdvanceDays ?? MAX_ADVANCE_FALLBACK_DAYS))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    async function loadSlots(date: Date) {
      setSlotsLoading(true);
      setSlotError(null);
      const dateISO = format(date, "yyyy-MM-dd");
      try {
        const res = await fetch(
          `/api/availability?offeringId=${offering.id}&date=${dateISO}&timezone=${encodeURIComponent(timezone)}`,
        );
        const data = await res.json();
        setSlots(data.slots ?? []);
      } catch {
        setSlotError("Couldn't load availability. Please try again.");
      } finally {
        setSlotsLoading(false);
      }
    }

    loadSlots(selectedDate);
  }, [selectedDate, timezone, offering.id]);

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("time");
    track("selected_date", { offeringId: offering.id });
  }

  function handleSlotSelect(slot: TimeSlot) {
    setSelectedSlot(slot);
    setStep("details");
    track("started_booking", { offeringId: offering.id });
  }

  async function onSubmit(values: DetailsForm) {
    if (!selectedSlot) return;
    setSubmitting(true);
    track("started_checkout", { offeringId: offering.id });

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offeringId: offering.id,
          startsAt: selectedSlot.startsAt,
          timezone,
          ...values,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(data.error ?? "This time slot was just booked. Please choose another time.");
          setStep("time");
          setSelectedSlot(null);
          if (selectedDate) {
            const dateISO = format(selectedDate, "yyyy-MM-dd");
            fetch(`/api/availability?offeringId=${offering.id}&date=${dateISO}&timezone=${encodeURIComponent(timezone)}`)
              .then((r) => r.json())
              .then((d) => setSlots(d.slots ?? []));
          }
        } else {
          toast.error(data.error ?? "Something went wrong. Please try again.");
        }
        setSubmitting(false);
        return;
      }

      window.location.assign(data.checkoutUrl);
    } catch {
      toast.error("Payment failed. Your booking has not been confirmed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{offering.tagline}</p>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold">{offering.name}</h1>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">{formatDuration(offering.durationMinutes)}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm font-medium">{formatPrice(offering.priceCents, offering.currency)}</span>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <StepBadge active={step === "date"} done={step !== "date"} label="1. Date & time" />
        <StepBadge active={step === "time"} done={step === "details"} label="2. Pick a slot" />
        <StepBadge active={step === "details"} done={false} label="3. Your details" />
      </div>

      {step === "date" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Choose a date</Label>
            <div className="w-48">
              <TimezoneSelect value={timezone} onChange={setTimezone} />
            </div>
          </div>
          <DatePicker selectedDate={selectedDate} onSelect={handleDateSelect} minDate={minDate} maxDate={maxDate} />
        </div>
      )}

      {step === "time" && selectedDate && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep("date")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Change date
          </button>
          <div>
            <p className="text-sm font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
            <p className="text-xs text-muted-foreground">Times shown in {timezone.replace(/_/g, " ")}</p>
          </div>
          {slotError ? (
            <p className="text-sm text-red-400">{slotError}</p>
          ) : (
            <TimeSlotPicker slots={slots} selected={selectedSlot} onSelect={handleSlotSelect} isLoading={slotsLoading} />
          )}
        </div>
      )}

      {step === "details" && selectedDate && selectedSlot && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep("time")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Change time
          </button>

          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
            <p className="text-muted-foreground">
              {selectedSlot.label} ({timezone.replace(/_/g, " ")})
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" autoComplete="name" {...register("fullName")} aria-invalid={!!errors.fullName} />
              {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company">Company (optional)</Label>
              <Input id="company" autoComplete="organization" {...register("company")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="topic">What would you like help with?</Label>
              <Input id="topic" placeholder="e.g. Reviewing my Next.js app's architecture" {...register("topic")} aria-invalid={!!errors.topic} />
              {errors.topic && <p className="text-xs text-red-400">{errors.topic.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Meeting notes / context (optional)</Label>
              <Textarea id="notes" rows={4} {...register("notes")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedinOrGithub">LinkedIn or GitHub URL (optional)</Label>
              <Input id="linkedinOrGithub" placeholder="https://github.com/you" {...register("linkedinOrGithub")} />
              {errors.linkedinOrGithub && <p className="text-xs text-red-400">{errors.linkedinOrGithub.message}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing checkout…
                </>
              ) : (
                `Continue to payment — ${formatPrice(offering.priceCents, offering.currency)}`
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function StepBadge({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span
      className={
        "rounded-full border px-3 py-1 " +
        (active
          ? "border-indigo-500/60 bg-indigo-500/10 text-foreground"
          : done
            ? "border-border bg-muted text-muted-foreground"
            : "border-border text-muted-foreground/60")
      }
    >
      {label}
    </span>
  );
}
