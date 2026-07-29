// supabase/functions/get-shared-photo/index.ts
//
// Deployed with: supabase functions deploy get-shared-photo
//
// Called by the public /share/<token> page (no login required) to view photos
// of a shared plant. The plant-photos bucket is private, so this function
// uses the service role key (never exposed to the browser) to verify the
// token actually owns the requested photo path, then hands back a short-lived
// signed URL — nothing else in the bucket is ever exposed.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, path } = await req.json();
    if (!token || !path) {
      return new Response(JSON.stringify({ error: "token and path are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Confirm the requested photo path actually belongs to a plant/entry
    // owned by this share token before ever generating a signed URL for it.
    const { data: plant, error: plantErr } = await supabase
      .from("plants")
      .select("id, user_id, cover_photo_path")
      .eq("share_token", token)
      .maybeSingle();

    if (plantErr || !plant) {
      return new Response(JSON.stringify({ error: "Invalid share link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedPrefix = `${plant.user_id}/${plant.id}/`;
    const isCover = path === plant.cover_photo_path;

    let belongsToPlant = isCover || path.startsWith(expectedPrefix);

    if (!belongsToPlant) {
      // Could be an entry photo — confirm it belongs to one of this plant's entries.
      const { data: entryPhoto } = await supabase
        .from("entry_photos")
        .select("entry_id, entries!inner(plant_id)")
        .eq("photo_path", path)
        .maybeSingle();
      belongsToPlant = entryPhoto?.entries?.plant_id === plant.id;
    }

    if (!belongsToPlant) {
      return new Response(JSON.stringify({ error: "Photo does not belong to this shared plant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from("plant-photos")
      .createSignedUrl(path, 60 * 60);

    if (signErr || !signed) {
      return new Response(JSON.stringify({ error: "Could not sign photo URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
