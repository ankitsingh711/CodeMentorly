"use client";

import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/lib/availability";

export function TimeSlotPicker({
  slots,
  selected,
  onSelect,
  isLoading,
}: {
  slots: TimeSlot[];
  selected: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
        <p>No available times on this date.</p>
        <p className="mt-1">Please choose another date.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const isSelected = selected?.startsAt === slot.startsAt;
        return (
          <button
            key={slot.startsAt}
            type="button"
            onClick={() => onSelect(slot)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              isSelected
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-border bg-muted/40 text-foreground hover:border-indigo-500/50 hover:bg-muted",
            )}
          >
            {slot.label}
          </button>
        );
      })}
    </div>
  );
}
