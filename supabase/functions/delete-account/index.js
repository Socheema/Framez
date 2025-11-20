// This file targets the Supabase Edge Functions (Deno) runtime.
// The imports below are provided by Deno at runtime.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Single CORS helper and serve handler (cleaned, non-duplicated)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");

    // parse body defensively
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || body.user_id || null;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Read secrets with SB_* (recommended) and fall back to SUPABASE_* for compatibility
    const SUPABASE_URL = Deno.env.get("SB_URL") ?? Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SB_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing server environment variables" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // verify caller
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userData, error: getUserError } = await supabaseAuth.auth.getUser();
    if (getUserError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (userData.user.id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results = { userId, steps: [], counts: {}, errors: [], success: false };

    async function countedDelete(table, filterBuilder) {
      try {
        const countRes = await filterBuilder(
          supabaseAdmin.from(table).select("*", { count: "exact", head: true })
        );
        if (countRes.error) throw countRes.error;
        const count = countRes.count || 0;
        const deleteRes = await filterBuilder(supabaseAdmin.from(table).delete());
        if (deleteRes.error) throw deleteRes.error;
        results.counts[table] = count;
        results.steps.push({ table, deleted: count });
      } catch (err) {
        results.errors.push({ table, message: err.message || "Unknown error" });
      }
    }

    // gather conversation ids
    let conversationIds = [];
    try {
      const convRes = await supabaseAdmin
        .from("conversations")
        .select("id")
        .or(`participant_one.eq.${userId},participant_two.eq.${userId}`);
      if (convRes.error) throw convRes.error;
      conversationIds = (convRes.data || []).map((c) => c.id);
      results.counts["conversations_involved"] = conversationIds.length;
    } catch (err) {
      results.errors.push({ step: "fetch_conversations", message: err.message || "Failed to fetch conversations" });
    }

    await countedDelete("messages", (q) => q.eq("sender_id", userId));

    if (conversationIds.length) {
      await countedDelete("messages", (q) => q.in("conversation_id", conversationIds));
    }

    await countedDelete("conversations", (q) => q.or(`participant_one.eq.${userId},participant_two.eq.${userId}`));
    await countedDelete("likes", (q) => q.eq("user_id", userId));
    await countedDelete("comments", (q) => q.eq("user_id", userId));
    await countedDelete("follows", (q) => q.or(`follower_id.eq.${userId},following_id.eq.${userId}`));

    // posts and images
    let postImagePaths = [];
    try {
      const postsRes = await supabaseAdmin
        .from("posts")
        .select("id,image_url")
        .eq("user_id", userId);
      if (postsRes.error) throw postsRes.error;
      postImagePaths = (postsRes.data || [])
        .map((p) => p.image_url)
        .filter(Boolean)
        .map((url) => {
          const marker = "/public/posts/";
          const idx = url.indexOf(marker);
          return idx !== -1 ? url.substring(idx + marker.length) : null;
        })
        .filter(Boolean);
      results.counts["post_images_found"] = postImagePaths.length;
    } catch (err) {
      results.errors.push({ step: "fetch_post_images", message: err.message || "Failed to gather post images" });
    }
    await countedDelete("posts", (q) => q.eq("user_id", userId));

    // profile/avatar
    let avatarPath = null;
    try {
      const profileRes = await supabaseAdmin
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();
      if (!profileRes.error && profileRes.data?.avatar_url) {
        const marker = "/public/avatars/";
        const idx = profileRes.data.avatar_url.indexOf(marker);
        if (idx !== -1) avatarPath = profileRes.data.avatar_url.substring(idx + marker.length);
      }
    } catch (_) {}
    await countedDelete("profiles", (q) => q.eq("id", userId));

    async function removeStorageObjects(bucket, paths) {
      if (!paths.length) return;
      try {
        const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
        if (error) throw error;
        results.steps.push({ bucket, removed: paths.length });
      } catch (err) {
        results.errors.push({ bucket, message: err.message || "Failed to remove objects" });
      }
    }
    await removeStorageObjects("posts", postImagePaths);
    if (avatarPath) await removeStorageObjects("avatars", [avatarPath]);

    // delete auth
    try {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
      results.steps.push({ auth: "user_deleted" });
      results.success = true;
    } catch (err) {
      results.errors.push({ step: "auth_delete", message: err.message || "Failed to delete auth user" });
    }

    const status = results.success && results.errors.length === 0 ? 200 : 207;
    return new Response(JSON.stringify(results), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
