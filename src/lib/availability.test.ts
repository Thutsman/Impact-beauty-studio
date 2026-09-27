import { describe, expect, it } from "vitest";
import { getAvailableSlots, type TimeRange } from "@/lib/availability";
import { zonedTimeToUtc } from "@/lib/time";

const zone = "UTC";
const openDay = {
  date: "2026-09-29",
  timeZone: zone,
  openTime: "08:00",
  closeTime: "17:00",
  isClosed: false,
  intervalMinutes: 30,
  minNoticeMinutes: 0,
  maxAdvanceDays: 90,
  now: new Date("2026-09-27T08:00:00.000Z"),
  appointments: [] as TimeRange[],
  blocked: [] as TimeRange[],
};

function slot(date: string, time: string, minutes: number): TimeRange {
  const start = zonedTimeToUtc(date, time, zone);
  return { start, end: new Date(start.getTime() + minutes * 60 * 1000) };
}

function labels(dates: Date[]): string[] {
  return dates.map((date) => date.toISOString().slice(11, 16));
}

describe("availability", () => {
  it("offers interval starts that finish before closing", () => {
    const slots = getAvailableSlots({ ...openDay, durationMinutes: 120 });
    expect(labels(slots).slice(0, 3)).toEqual(["08:00", "08:30", "09:00"]);
    expect(labels(slots)).toContain("15:00");
    expect(labels(slots)).not.toContain("15:30");
  });

  it("removes every start that would overlap a 10:00–12:00 booking", () => {
    const slots = getAvailableSlots({
      ...openDay,
      durationMinutes: 120,
      appointments: [slot("2026-09-29", "10:00", 120)],
    });
    const times = labels(slots);
    expect(times).not.toContain("09:00");
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("11:00");
    expect(times).toContain("08:00");
    expect(times).toContain("12:00");
  });

  it("holds the full 3.5 hours and refuses a start that would pass closing", () => {
    const slots = getAvailableSlots({ ...openDay, durationMinutes: 210 });
    const times = labels(slots);
    expect(times).toContain("13:30");
    expect(times).not.toContain("14:00");
    expect(zonedTimeToUtc("2026-09-29", "13:30", zone).getTime() + 210 * 60 * 1000).toBe(
      zonedTimeToUtc("2026-09-29", "17:00", zone).getTime(),
    );
  });

  it("returns nothing on a closed day", () => {
    expect(getAvailableSlots({ ...openDay, date: "2026-09-27", isClosed: true, durationMinutes: 90 })).toEqual([]);
  });

  it("skips blocked periods", () => {
    const slots = getAvailableSlots({
      ...openDay,
      durationMinutes: 90,
      blocked: [slot("2026-09-29", "12:00", 180)],
    });
    const times = labels(slots);
    expect(times).not.toContain("12:00");
    expect(times).not.toContain("11:00");
    expect(times).toContain("10:30");
    expect(times).toContain("15:00");
  });

  it("treats a cancelled appointment as free when it is not in the active list", () => {
    const slots = getAvailableSlots({ ...openDay, durationMinutes: 120 });
    expect(labels(slots)).toContain("10:00");
  });

  it("rejects a past date", () => {
    expect(
      getAvailableSlots({ ...openDay, date: "2026-09-26", durationMinutes: 90 }).length,
    ).toBe(0);
  });

  it("applies minimum notice", () => {
    const slots = getAvailableSlots({
      ...openDay,
      date: "2026-09-27",
      durationMinutes: 60,
      minNoticeMinutes: 120,
      now: new Date("2026-09-27T09:00:00.000Z"),
    });
    expect(labels(slots)).not.toContain("10:00");
    expect(labels(slots)).toContain("11:00");
  });

  it("uses the business timezone for opening time", () => {
    const slots = getAvailableSlots({
      ...openDay,
      timeZone: "Africa/Johannesburg",
      durationMinutes: 60,
    });
    expect(slots[0]?.toISOString()).toBe("2026-09-29T06:00:00.000Z");
  });
});
