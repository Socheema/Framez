import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS helper
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
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

    const { userId } = await req.json().catch(() => ({ userId: undefined })) as { userId?: string };
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

    // Verify the caller is the same user making the request
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

    // Service role client (no persisted session needed in Edge env)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Accumulator for results
    const results: {
      userId: string;
      steps: any[];
      counts: Record<string, number>;
      errors: { table?: string; bucket?: string; step?: string; message: string }[];
      success: boolean;
    } = {
      userId,
      steps: [],
      counts: {},
      errors: [],
      success: false,
    };

    // Helper to run a counted deletion (pre-count then delete)
    async function countedDelete(table: string, filterBuilder: <T>(q: any) => any) {
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
      } catch (err: any) {
        results.errors.push({ table, message: err.message || "Unknown error" });
      }
    }

    // 1. Gather conversation IDs involving user (for message cleanup)
    let conversationIds: string[] = [];
    try {
      const convRes = await supabaseAdmin
        .from("conversations")
        .select("id")
        .or(`participant_one.eq.${userId},participant_two.eq.${userId}`);
      if (convRes.error) throw convRes.error;
      conversationIds = (convRes.data || []).map((c: any) => c.id);
      results.counts["conversations_involved"] = conversationIds.length;
    } catch (err: any) {
      results.errors.push({ step: "fetch_conversations", message: err.message || "Failed to fetch conversations" });
    }

    // 2. Delete messages sent by user
    await countedDelete("messages", (q) => q.eq("sender_id", userId));

    // 3. Delete messages in conversations where user was participant (remaining messages from others)
    if (conversationIds.length) {
      await countedDelete("messages", (q) => q.in("conversation_id", conversationIds));
    }

    // 4. Delete conversations involving user
    await countedDelete("conversations", (q) => q.or(`participant_one.eq.${userId},participant_two.eq.${userId}`));

    // 5. Delete likes by user
    await countedDelete("likes", (q) => q.eq("user_id", userId));
    // 6. Delete comments by user
    await countedDelete("comments", (q) => q.eq("user_id", userId));
    // 7. Delete follows where user is follower or following
    await countedDelete("follows", (q) => q.or(`follower_id.eq.${userId},following_id.eq.${userId}`));

    // 8. Collect post image paths & delete posts
    let postImagePaths: string[] = [];
    try {
      const postsRes = await supabaseAdmin
        .from("posts")
        .select("id,image_url")
        .eq("user_id", userId);
      if (postsRes.error) throw postsRes.error;
      postImagePaths = (postsRes.data || [])
        .map((p: any) => p.image_url)
        .filter(Boolean)
        .map((url: string) => {
          const marker = "/public/posts/";
          const idx = url.indexOf(marker);
          return idx !== -1 ? url.substring(idx + marker.length) : null;
        })
        .filter(Boolean) as string[];
      results.counts["post_images_found"] = postImagePaths.length;
    } catch (err: any) {
      results.errors.push({ step: "fetch_post_images", message: err.message || "Failed to gather post images" });
    }
    await countedDelete("posts", (q) => q.eq("user_id", userId));

    // 9. Fetch avatar path then delete profile row
    let avatarPath: string | null = null;
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

    // 10. Storage cleanup
    async function removeStorageObjects(bucket: string, paths: string[]) {
      if (!paths.length) return;
      try {
        const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
        if (error) throw error;
        results.steps.push({ bucket, removed: paths.length });
      } catch (err: any) {
        results.errors.push({ bucket, message: err.message || "Failed to remove objects" });
      }
    }
    await removeStorageObjects("posts", postImagePaths);
    if (avatarPath) await removeStorageObjects("avatars", [avatarPath]);

    // 11. Delete auth user
    try {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
      results.steps.push({ auth: "user_deleted" });
      results.success = true;
    } catch (err: any) {
      results.errors.push({ step: "auth_delete", message: err.message || "Failed to delete auth user" });
    }

    const status = results.success && results.errors.length === 0 ? 200 : 207;
    return new Response(JSON.stringify(results), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
