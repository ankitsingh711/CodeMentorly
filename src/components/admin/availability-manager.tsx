"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneSelect } from "@/components/booking/timezone-select";
import type { AvailabilityRule, AvailabilitySettings } from "@prisma/client";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayState {
  isActive: boolean;
  startTime: string;
  endTime: string;
}

export function AvailabilityManager({
  initialRules,
  initialSettings,
}: {
  initialRules: AvailabilityRule[];
  initialSettings: AvailabilitySettings | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [days, setDays] = useState<DayState[]>(() =>
    DAYS.map((_, dayOfWeek) => {
      const rule = initialRules.find((r) => r.dayOfWeek === dayOfWeek);
      return {
        isActive: rule?.isActive ?? false,
        startTime: rule?.startTime ?? "10:00",
        endTime: rule?.endTime ?? "19:00",
      };
    }),
  );

  const [timezone, setTimezone] = useState(initialSettings?.timezone ?? "Asia/Kolkata");
  const [bufferMinutes, setBufferMinutes] = useState(initialSettings?.bufferMinutes ?? 15);
  const [minNoticeHours, setMinNoticeHours] = useState(initialSettings?.minNoticeHours ?? 12);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(initialSettings?.maxAdvanceDays ?? 45);
  const [meetingUrlTemplate, setMeetingUrlTemplate] = useState(initialSettings?.meetingUrlTemplate ?? "");

  function updateDay(index: number, patch: Partial<DayState>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function save() {
    setSaving(true);
    try {
      const rules = days
        .map((d, dayOfWeek) => ({ dayOfWeek, startTime: d.startTime, endTime: d.endTime, isActive: d.isActive }))
        .filter((d) => d.isActive);

      const res = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules,
          settings: { timezone, bufferMinutes, minNoticeHours, maxAdvanceDays, meetingUrlTemplate },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't save availability.");
        return;
      }
      toast.success("Availability updated.");
      router.refresh();
    } catch {
      toast.error("Couldn't save availability.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Working hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map((label, i) => (
            <div key={label} className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-0">
              <label className="flex w-32 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={days[i].isActive}
                  onChange={(e) => updateDay(i, { isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-indigo-500"
                />
                {label}
              </label>
              <Input
                type="time"
                className="w-32"
                value={days[i].startTime}
                disabled={!days[i].isActive}
                onChange={(e) => updateDay(i, { startTime: e.target.value })}
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                className="w-32"
                value={days[i].endTime}
                disabled={!days[i].isActive}
                onChange={(e) => updateDay(i, { endTime: e.target.value })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking rules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <TimezoneSelect value={timezone} onChange={setTimezone} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buffer">Buffer between meetings (minutes)</Label>
            <Input
              id="buffer"
              type="number"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notice">Minimum booking notice (hours)</Label>
            <Input
              id="notice"
              type="number"
              value={minNoticeHours}
              onChange={(e) => setMinNoticeHours(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxAdvance">Maximum booking window (days)</Label>
            <Input
              id="maxAdvance"
              type="number"
              value={maxAdvanceDays}
              onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="meetingUrlTemplate">Default meeting URL (optional)</Label>
            <Input
              id="meetingUrlTemplate"
              placeholder="https://meet.google.com/your-room"
              value={meetingUrlTemplate}
              onChange={(e) => setMeetingUrlTemplate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Not sent automatically — set a link per booking from the Bookings page, or paste one here as your
              default and copy it in manually.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} size="lg">
        {saving ? "Saving…" : "Save availability"}
      </Button>
    </div>
  );
}
