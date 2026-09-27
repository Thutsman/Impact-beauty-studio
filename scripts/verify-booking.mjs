import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const slug = env.NEXT_PUBLIC_BUSINESS_SLUG || "impact-beauty-studio";
const TAKEN = "Sorry, that appointment time was just taken. Please select another time.";
const failures = [];
const tokens = [];

function pass(name) {
  console.log(`PASS  ${name}`);
}

function fail(name, detail) {
  failures.push(name);
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function dow(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function localToday(timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function slots(serviceId, date) {
  const { data, error } = await supabase.rpc("ibs_public_slots", {
    p_slug: slug,
    p_service_id: serviceId,
    p_date: date,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function book(serviceId, startsAt, name, phone) {
  const { data, error } = await supabase.rpc("ibs_book_appointment", {
    p_slug: slug,
    p_service_id: serviceId,
    p_starts_at: startsAt,
    p_full_name: name,
    p_phone: phone,
    p_email: "",
    p_notes: "Verification booking",
  });
  if (error) return { ok: false, error: error.message };
  if (data?.ok && data.appointment?.manage_token) tokens.push(data.appointment.manage_token);
  return data;
}

function starts(list) {
  return (list?.slots ?? []).map((slot) => slot.starts_at);
}

function nextWeekday(today, weekday) {
  for (let offset = 1; offset <= 21; offset += 1) {
    const date = addDays(today, offset);
    if (dow(date) === weekday) return date;
  }
  throw new Error("No matching weekday");
}

try {
  const { data: context, error: contextError } = await supabase.rpc("ibs_public_context", { p_slug: slug });
  if (contextError || !context?.services?.length) {
    fail("public catalog", contextError?.message ?? "no services");
    throw new Error("catalog");
  }
  pass("public catalog");

  const wig = context.services.find((service) => service.duration_minutes === 120);
  const combo = context.services.find((service) => service.duration_minutes === 210);
  const makeup = context.services.find((service) => service.duration_minutes === 90);
  if (!wig || !combo || !makeup) fail("service durations", "expected 120, 90 and 210 minute services");
  else pass("service durations come from the catalog");

  const today = localToday(context.settings.timezone);
  const monday = nextWeekday(today, 1);
  const thursday = nextWeekday(today, 4);
  const friday = nextWeekday(today, 5);
  const tuesday = nextWeekday(today, 2);

  const closed = await slots(wig.id, monday);
  if (closed.reason === "closed" && (closed.slots ?? []).length === 0) pass("closed day offers no times");
  else fail("closed day offers no times", JSON.stringify(closed));

  const past = await slots(wig.id, addDays(today, -1));
  if (past.reason === "past" && (past.slots ?? []).length === 0) pass("past date offers no times");
  else fail("past date offers no times", JSON.stringify(past));

  const comboSlots = await slots(combo.id, thursday);
  const comboStarts = starts(comboSlots);
  const tooLate = comboStarts.find((value) => value.includes("T12:00") || value.endsWith("14:00:00+02:00") || value.includes("14:00"));
  const fourteen = comboStarts.filter((value) => {
    const hour = new Date(value).toLocaleString("en-GB", { timeZone: context.settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return hour === "14:00";
  });
  const thirteenThirty = comboStarts.filter((value) => {
    const hour = new Date(value).toLocaleString("en-GB", { timeZone: context.settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return hour === "13:30";
  });
  if (fourteen.length === 0 && thirteenThirty.length === 1) pass("3.5 hour service cannot start after it would pass closing");
  else fail("3.5 hour service cannot start after it would pass closing", `14:00=${fourteen.length} 13:30=${thirteenThirty.length}`);
  if (tooLate && fourteen.length) fail("closing guard extra", tooLate);

  const ten = comboStarts.find((value) => {
    const hour = new Date(value).toLocaleString("en-GB", { timeZone: context.settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return hour === "10:00";
  });
  const twelve = (await slots(wig.id, thursday)).slots.find((slot) => {
    const hour = new Date(slot.starts_at).toLocaleString("en-GB", { timeZone: context.settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return hour === "12:00";
  })?.starts_at;

  if (!ten || !twelve) {
    fail("thursday fixtures", `ten=${ten} twelve=${twelve}`);
  } else {
    const first = await book(combo.id, ten, "Verify Ndlovu", "+15555550901");
    if (first?.ok && first.appointment.price_cents === combo.price_cents && first.appointment.duration_minutes === 210) {
      pass("customer books an available appointment at the catalog price");
    } else fail("customer books an available appointment at the catalog price", JSON.stringify(first));

    const after = starts(await slots(wig.id, thursday));
    const tenStill = after.some((value) => value === ten);
    const twelveStill = after.some((value) => value === twelve);
    if (!tenStill && !twelveStill) pass("booked 3.5 hour appointment removes overlapping times");
    else fail("booked 3.5 hour appointment removes overlapping times", `10=${tenStill} 12=${twelveStill}`);

    const overlap = await book(wig.id, twelve, "Verify Moyo", "+15555550902");
    if (!overlap?.ok && overlap.error === TAKEN) pass("second customer cannot book an overlapping appointment");
    else fail("second customer cannot book an overlapping appointment", JSON.stringify(overlap));

    const early = starts(await slots(wig.id, thursday)).find((value) => {
      const hour = new Date(value).toLocaleString("en-GB", { timeZone: context.settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      return hour === "08:00";
    });
    if (early) pass("a slot that ends when the booking starts stays available");
    else fail("a slot that ends when the booking starts stays available");

    const offGrid = await book(makeup.id, new Date(new Date(ten).getTime() + 7 * 60 * 1000).toISOString(), "Verify Dube", "+15555550903");
    if (!offGrid?.ok) pass("off-grid booking time is rejected");
    else fail("off-grid booking time is rejected");

    const pastBook = await book(makeup.id, new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), "Verify Past", "+15555550904");
    if (!pastBook?.ok) pass("past booking time is rejected");
    else fail("past booking time is rejected");

    const [raceA, raceB] = await Promise.all([
      book(wig.id, early, "Verify Race A", "+15555550905"),
      book(makeup.id, early, "Verify Race B", "+15555550906"),
    ]);
    const winners = [raceA, raceB].filter((result) => result?.ok);
    const losers = [raceA, raceB].filter((result) => !result?.ok);
    if (winners.length === 1 && losers.length === 1 && losers[0].error === TAKEN) {
      pass("simultaneous bookings: one succeeds and the other is told the time was taken");
    } else if (winners.length === 1 && losers.length === 1) {
      fail("simultaneous bookings message", losers[0].error);
    } else {
      fail("simultaneous bookings", `winners=${winners.length}`);
    }

    const winner = winners[0];
    const alternate = starts(await slots(makeup.id, thursday)).find((value) => value !== ten && value !== early);
    if (winner?.appointment?.manage_token && alternate) {
      const moved = await supabase.rpc("ibs_reschedule_appointment", {
        p_token: winner.appointment.manage_token,
        p_starts_at: alternate,
      });
      const oldFree = starts(await slots(wig.id, thursday)).includes(early);
      const newTaken = !starts(await slots(makeup.id, thursday)).includes(alternate);
      if (moved.data?.ok && oldFree && newTaken) pass("reschedule releases the old time and reserves the new time");
      else fail("reschedule releases the old time and reserves the new time", JSON.stringify({ moved: moved.data, oldFree, newTaken }));

      const clash = await supabase.rpc("ibs_reschedule_appointment", {
        p_token: first.appointment.manage_token,
        p_starts_at: alternate,
      });
      const still = await supabase.rpc("ibs_get_appointment", { p_token: first.appointment.manage_token });
      if (!clash.data?.ok && still.data?.appointment?.starts_at === ten) pass("failed reschedule keeps the original time");
      else fail("failed reschedule keeps the original time", JSON.stringify({ clash: clash.data, starts: still.data?.appointment?.starts_at }));
    } else fail("reschedule fixtures", `winner=${Boolean(winner?.ok)} alternate=${alternate}`);

    const cancelled = await supabase.rpc("ibs_cancel_appointment", { p_token: first.appointment.manage_token });
    const released = starts(await slots(combo.id, thursday)).includes(ten);
    if (cancelled.data?.ok && released) pass("cancellation releases the appointment time");
    else fail("cancellation releases the appointment time", JSON.stringify({ cancelled: cancelled.data, released }));
  }

  const fridaySlots = starts(await slots(wig.id, friday));
  const blockedHit = fridaySlots.some((value) => {
    const hour = new Date(value).toLocaleString("en-GB", { timeZone: context.settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return hour === "12:00" || hour === "13:00" || hour === "14:00";
  });
  const beforeBlock = fridaySlots.some((value) => {
    const hour = new Date(value).toLocaleString("en-GB", { timeZone: context.settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return hour === "10:00";
  });
  if (!blockedHit && beforeBlock) pass("blocked period is not bookable");
  else fail("blocked period is not bookable", `blockedHit=${blockedHit} before=${beforeBlock} count=${fridaySlots.length}`);

  const tuesdaySlots = starts(await slots(wig.id, tuesday));
  const sample = tuesdaySlots.some((value) => {
    const hour = new Date(value).toLocaleString("en-GB", { timeZone: context.settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    return hour === "09:00" || hour === "10:00" || hour === "11:30";
  });
  if (!sample) pass("sample appointments are removed from availability");
  else fail("sample appointments are removed from availability");

  const denied = await supabase.from("appointments").select("id");
  if (denied.error) pass("anonymous clients cannot read appointments");
  else fail("anonymous clients cannot read appointments", `rows=${denied.data?.length ?? 0}`);

  const inserted = await supabase.from("appointments").insert({ business_id: crypto.randomUUID() });
  if (inserted.error) pass("anonymous clients cannot insert appointments");
  else fail("anonymous clients cannot insert appointments");

  const adminDenied = await supabase.rpc("ibs_admin_create_appointment", {
    p_service_id: wig.id,
    p_starts_at: ten,
    p_full_name: "Nope",
    p_phone: "+15555550999",
    p_email: "",
    p_notes: "",
  });
  if (adminDenied.error || adminDenied.data?.ok === false) pass("anonymous clients cannot create staff appointments");
  else fail("anonymous clients cannot create staff appointments", JSON.stringify(adminDenied.data));
} catch (error) {
  if (error?.message !== "catalog") fail("verification run", error.message);
} finally {
  for (const token of tokens) {
    await supabase.rpc("ibs_cancel_appointment", { p_token: token });
  }
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll booking checks passed.");
