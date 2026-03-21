"use client";

import { useEffect, useMemo, useState } from "react";

type CurrentTimeLineProps = {
  selectedDate: string;
  startMinutes: number;
  endMinutes: number;
  slotMinutes: number;
  rowHeight: number;
  timeColumnWidthPx: number;
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CurrentTimeLine({
  selectedDate,
  startMinutes,
  endMinutes,
  slotMinutes,
  rowHeight,
  timeColumnWidthPx,
}: CurrentTimeLineProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const state = useMemo(() => {
    if (toDateKey(now) !== selectedDate) {
      return { show: false, top: 0, label: "" };
    }

    const minutesFromStart = now.getHours() * 60 + now.getMinutes() - startMinutes;
    const totalMinutes = endMinutes - startMinutes;

    if (minutesFromStart < 0 || minutesFromStart > totalMinutes) {
      return { show: false, top: 0, label: "" };
    }

    const top = (minutesFromStart / slotMinutes) * rowHeight;
    const label = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return { show: true, top, label };
  }, [now, selectedDate, startMinutes, endMinutes, slotMinutes, rowHeight]);

  if (!state.show) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{ left: `${timeColumnWidthPx}px`, right: 0, top: `${state.top}px` }}
    >
      <div className="relative w-full">
        <div className="h-[2px] w-full bg-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]" />
        <span className="absolute -left-2 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
        <span className="absolute left-2 -top-3 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {state.label}
        </span>
      </div>
    </div>
  );
}
