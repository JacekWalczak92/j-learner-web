// ============================================================================
//  supabase.js (moduł ES) — warstwa danych na Supabase (Auth + PostgREST) bez bibliotek.
//  Eksportuje JLDB. Tokeny trzymane w localStorage (logowanie trwałe).
// ============================================================================

import { JL_CONFIG } from "./config.js?v=12";

const CFG = JL_CONFIG || {};
const SB_URL = (CFG.supabaseUrl || "").replace(/\/+$/, "");
const SB_KEY = CFG.supabaseAnonKey || "";

/** Zamienia niskopoziomowe błędy fetch (po angielsku) na czytelny komunikat. */
function asNetworkError(e) {
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(String(e && e.message))) {
    const err = new Error("Brak połączenia z internetem albo serwer jest chwilowo niedostępny. Spróbuj ponownie.");
    err.isNetwork = true;
    return err;
  }
  return e;
}

/** Ustawiany przez app.js — wywoływany, gdy sesja wygaśnie i nie da się jej odświeżyć. */
let onSessionExpired = null;
function setSessionExpiredHandler(fn) { onSessionExpired = fn; }

let session = null;
try {
  session = JSON.parse(localStorage.getItem("jl_session") || "null");
} catch (_) {}

function saveSession(s) {
  session = s || null;
  try {
    if (s) localStorage.setItem("jl_session", JSON.stringify(s));
    else localStorage.removeItem("jl_session");
  } catch (_) {}
}

function isConfigured() {
  return !!SB_URL && !!SB_KEY;
}
function getUser() {
  return session && session.user ? session.user : null;
}
function getUserId() {
  return getUser() ? getUser().id : null;
}

// ── Niskopoziomowe zapytania ─────────────────────────────────────────────────
async function authRequest(path, body) {
  let resp;
  try {
    resp = await fetch(SB_URL + "/auth/v1" + path, {
      method: "POST",
      headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw asNetworkError(e);
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data.error_description || data.msg || data.message || ("Błąd " + resp.status);
    throw new Error(translateAuthError(msg));
  }
  return data;
}

function translateAuthError(msg) {
  const m = String(msg).toLowerCase();
  if (m.includes("invalid login")) return "Nieprawidłowy e-mail lub hasło.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Konto z tym e-mailem już istnieje.";
  if (m.includes("password")) return "Hasło musi mieć co najmniej 6 znaków.";
  if (m.includes("email") && m.includes("confirm")) return "Potwierdź adres e-mail (sprawdź skrzynkę).";
  return msg;
}

/** REST (PostgREST) z auto-odświeżaniem tokenu przy 401 i obsługą wygaśnięcia sesji.
 *  keepalive=true pozwala dokończyć zapis nawet przy zamykaniu strony (flush postępu). */
async function rest(path, { method = "GET", body, prefer, keepalive = false } = {}) {
  const doFetch = async () => {
    const headers = { apikey: SB_KEY, "Content-Type": "application/json" };
    if (session && session.access_token) headers.Authorization = "Bearer " + session.access_token;
    if (prefer) headers.Prefer = prefer;
    try {
      return await fetch(SB_URL + "/rest/v1" + path, {
        method,
        headers,
        keepalive,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw asNetworkError(e);
    }
  };
  let resp = await doFetch();
  if (resp.status === 401 && session && session.refresh_token) {
    if (await tryRefresh()) {
      resp = await doFetch();
    } else {
      // Odświeżenie nie powiodło się — sesja wygasła na dobre.
      if (onSessionExpired) { try { onSessionExpired(); } catch (_) {} }
      throw new Error("Sesja wygasła — zaloguj się ponownie.");
    }
  }
  if (resp.status === 401) {
    if (onSessionExpired) { try { onSessionExpired(); } catch (_) {} }
    throw new Error("Sesja wygasła — zaloguj się ponownie.");
  }
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.message || data.hint || "Błąd bazy (" + resp.status + ").");
  }
  if (method === "DELETE" || resp.status === 204) return null;
  return resp.json().catch(() => null);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function signIn(email, password) {
  const data = await authRequest("/token?grant_type=password", { email, password });
  saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user });
  return getUser();
}

async function signUp(email, password) {
  const data = await authRequest("/signup", { email, password });
  if (data.access_token) {
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user });
    return { user: getUser(), needsConfirm: false };
  }
  // Konto utworzone, ale wymaga potwierdzenia e-mail.
  return { user: null, needsConfirm: true };
}

async function tryRefresh() {
  try {
    const data = await authRequest("/token?grant_type=refresh_token", {
      refresh_token: session.refresh_token,
    });
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user || session.user });
    return true;
  } catch (e) {
    // Chwilowy brak sieci ≠ wygasła sesja: nie wylogowujemy, tylko zgłaszamy błąd wyżej.
    if (e && e.isNetwork) throw e;
    saveSession(null);
    return false;
  }
}

/** Wysyła e-mail z linkiem do zresetowania hasła (Supabase: Auth → URL Configuration → Site URL). */
function requestPasswordReset(email) {
  return authRequest("/recover", { email });
}

/** Ustawia nowe hasło tokenem z linku „recovery" (hash w URL: #access_token=…&type=recovery). */
async function updatePasswordWithToken(accessToken, refreshToken, newPassword) {
  let resp;
  try {
    resp = await fetch(SB_URL + "/auth/v1/user", {
      method: "PUT",
      headers: { apikey: SB_KEY, "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
      body: JSON.stringify({ password: newPassword }),
    });
  } catch (e) {
    throw asNetworkError(e);
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data.error_description || data.msg || data.message || ("Błąd " + resp.status);
    throw new Error(translateAuthError(msg));
  }
  // Token z linku recovery jest pełnoprawną sesją — logujemy od razu.
  if (refreshToken) saveSession({ access_token: accessToken, refresh_token: refreshToken, user: data });
  return data;
}

function signOut() {
  if (session && session.access_token) {
    fetch(SB_URL + "/auth/v1/logout", {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: "Bearer " + session.access_token },
    }).catch(() => {});
  }
  saveSession(null);
}

// ── Foldery ─────────────────────────────────────────────────────────────────
function listFolders() {
  return rest("/folders?select=id,name,parent_id&order=name.asc");
}
function createFolder(name, parentId) {
  return rest("/folders", {
    method: "POST",
    prefer: "return=representation",
    body: { name, parent_id: parentId || null },
  }).then((r) => (Array.isArray(r) ? r[0] : r));
}
function deleteFolder(id) {
  return rest("/folders?id=eq." + encodeURIComponent(id), { method: "DELETE" });
}

// ── Materiały ─────────────────────────────────────────────────────────────────
function listMyMaterials(folderId) {
  const uid = getUserId();
  let q =
    "/materials?select=id,title,type,folder_id,updated_at&user_id=eq." +
    encodeURIComponent(uid) +
    "&order=title.asc";
  q += folderId ? "&folder_id=eq." + encodeURIComponent(folderId) : "&folder_id=is.null";
  return rest(q);
}
function listPublicMaterials() {
  return rest("/materials?select=id,title,type,updated_at&is_public=eq.true&order=updated_at.desc");
}
function getMaterial(id) {
  return rest("/materials?select=*&id=eq." + encodeURIComponent(id)).then((r) =>
    Array.isArray(r) && r.length ? r[0] : null
  );
}
function createMaterial({ title, type, content, folderId }) {
  return rest("/materials", {
    method: "POST",
    prefer: "return=representation",
    body: { title, type, content, folder_id: folderId || null, is_public: false },
  }).then((r) => (Array.isArray(r) ? r[0] : r));
}
function updateMaterial(id, patch) {
  return rest("/materials?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    prefer: "return=representation",
    body: patch,
  }).then((r) => (Array.isArray(r) ? r[0] : r));
}
function deleteMaterial(id) {
  return rest("/materials?id=eq." + encodeURIComponent(id), { method: "DELETE" });
}
/** Przenosi materiał do folderu (folderId=null → poza folder / korzeń). */
function moveMaterial(id, folderId) {
  return updateMaterial(id, { folder_id: folderId || null });
}
/** Kopiuje materiał (np. publiczny „od autora") do moich. */
async function copyToMine(id, folderId) {
  const m = await getMaterial(id);
  if (!m) throw new Error("Nie znaleziono materiału.");
  return createMaterial({ title: m.title, type: m.type, content: m.content, folderId: folderId || null });
}

// ── Postęp nauki (per materiał / karta / tryb) ───────────────────────────────
function listProgress(materialId, mode) {
  let q = "/progress?select=card_key,passed,difficulty,times_shown&material_id=eq." + encodeURIComponent(materialId);
  if (mode) q += "&mode=eq." + encodeURIComponent(mode);
  return rest(q);
}
/** rows: [{ material_id, card_key, mode, passed, difficulty?, times_shown? }] */
function upsertProgress(rows, { keepalive = false } = {}) {
  if (!rows || !rows.length) return Promise.resolve(null);
  const uid = getUserId();
  const body = rows.map((r) => ({
    user_id: uid,
    material_id: r.material_id,
    card_key: r.card_key,
    mode: r.mode,
    passed: r.passed !== false,
    difficulty: r.difficulty || "none",
    times_shown: r.times_shown || 0,
  }));
  return rest("/progress?on_conflict=user_id,material_id,card_key,mode", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    keepalive,
    body,
  });
}
/** Reset postępu materiału — całego (mode=null) lub jednego trybu. */
function resetProgress(materialId, mode) {
  let q = "/progress?material_id=eq." + encodeURIComponent(materialId);
  if (mode) q += "&mode=eq." + encodeURIComponent(mode);
  return rest(q, { method: "DELETE" });
}

export const JLDB = {
  isConfigured,
  setSessionExpiredHandler,
  requestPasswordReset,
  updatePasswordWithToken,
  getUser,
  signIn,
  signUp,
  signOut,
  listFolders,
  createFolder,
  deleteFolder,
  listMyMaterials,
  listPublicMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  moveMaterial,
  copyToMine,
  listProgress,
  upsertProgress,
  resetProgress,
};
