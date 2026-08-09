"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

export function TimezoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (timezone: string) => void;
}) {
  const options = COMMON_TIMEZONES.includes(value) ? COMMON_TIMEZONES : [value, ...COMMON_TIMEZONES];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Timezone">
        <SelectValue placeholder="Select timezone" />
      </SelectTrigger>
      <SelectContent>
        {options.map((tz) => (
          <SelectItem key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}
