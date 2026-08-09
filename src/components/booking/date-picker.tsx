"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DatePicker({
  selectedDate,
  onSelect,
  minDate,
  maxDate,
}: {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  minDate: Date;
  maxDate: Date;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? minDate));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth));
    const end = endOfWeek(endOfMonth(visibleMonth));
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const today = startOfDay(new Date());
  const canGoPrev = isBefore(startOfMonth(minDate), visibleMonth);
  const canGoNext = isBefore(visibleMonth, startOfMonth(maxDate));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">{format(visibleMonth, "MMMM yyyy")}</span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canGoPrev}
            onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canGoNext}
            onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const disabled =
            isBefore(day, startOfDay(minDate)) || isBefore(startOfDay(maxDate), day) || !isSameMonth(day, visibleMonth);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={cn(
                "aspect-square rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground/30",
                !disabled && "hover:bg-muted text-foreground",
                selected && "bg-indigo-500 text-white hover:bg-indigo-500",
                isToday && !selected && "border border-indigo-500/50",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function nextNDays(n: number, startFrom: Date = new Date()) {
  return Array.from({ length: n }, (_, i) => addDays(startFrom, i));
}
