// ============================================================================
//  Edge Function: publish-material
//  Publikuje materiał do sekcji „Od Autora" (is_public = true).
//  Wywoływana m.in. z aplikacji mobilnej (opcja „Wyślij do Od Autora").
//
//  POST /functions/v1/publish-material
//  Nagłówki:  Authorization: Bearer <ACCESS_TOKEN użytkownika>
//             Content-Type: application/json
//  Body:      { "title": "...", "type": "flashcards"|"test", "content": "...", "tags": "..."? }
//
//  Sekrety funkcji (Project Settings → Edge Functions → Secrets):
//    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTHOR_USER_ID
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const AUTHOR_USER_ID = Deno.env.get("AUTHOR_USER_ID")!;

  // 1) token użytkownika
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "missing_token" });

  // 2) pobierz użytkownika z Auth
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "invalid_token" });

  // 3+4) tylko autor może publikować
  if (userData.user.id !== AUTHOR_USER_ID) return json(403, { error: "forbidden" });

  // walidacja body
  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }); }
  const { title, type, content, tags } = body || {};
  if (!title || !content || (type !== "flashcards" && type !== "test")) {
    return json(400, { error: "invalid_payload" });
  }

  // 5) zapis jako publiczny
  const { data, error } = await admin
    .from("materials")
    .insert({ user_id: AUTHOR_USER_ID, title, type, content, tags: tags ?? null, is_public: true })
    .select()
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { ok: true, id: data.id, title: data.title, type: data.type });
});
