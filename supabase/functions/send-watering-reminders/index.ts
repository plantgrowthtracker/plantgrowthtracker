// supabase/functions/send-watering-reminders/index.ts
//
// Deployed with: supabase functions deploy send-watering-reminders
// Intended to be run once a day by a pg_cron schedule (see README.md
// "Watering reminder emails" section for the full one-time setup).
//
// Requires a Resend account (https://resend.com — free tier is plenty for
// personal use) and its API key set as a Supabase secret:
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set REMINDER_FROM_EMAIL="PlantGrowthTracker <reminders@yourdomain.com>"

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: plants, error } = await supabase
    .from("plants")
    .select("id, user_id, name, added_date, watering_interval_days");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const { data: waterEntries } = await supabase
    .from("entries")
    .select("plant_id, entry_date")
    .eq("type", "water");

  const lastWateredByPlant = new Map<string, string>();
  for (const e of waterEntries || []) {
    const current = lastWateredByPlant.get(e.plant_id);
    if (!current || e.entry_date > current) lastWateredByPlant.set(e.plant_id, e.entry_date);
  }

  const today = new Date();
  const overdueByUser = new Map<string, string[]>();

  for (const plant of plants || []) {
    const baseline = lastWateredByPlant.get(plant.id) || plant.added_date;
    const due = new Date(baseline);
    due.setDate(due.getDate() + plant.watering_interval_days);
    if (due <= today) {
      const list = overdueByUser.get(plant.user_id) || [];
      list.push(plant.name);
      overdueByUser.set(plant.user_id, list);
    }
  }

  if (overdueByUser.size === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("REMINDER_FROM_EMAIL") || "PlantGrowthTracker <onboarding@resend.dev>";
  let sent = 0;

  for (const [userId, plantNames] of overdueByUser) {
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email || !resendKey) continue;

    const listHtml = plantNames.map((n) => `<li>${n}</li>`).join("");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: email,
        subject: `${plantNames.length} plant${plantNames.length > 1 ? "s" : ""} due for water`,
        html: `<p>These plants are due for watering:</p><ul>${listHtml}</ul>`,
      }),
    });
    sent += 1;
  }

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
