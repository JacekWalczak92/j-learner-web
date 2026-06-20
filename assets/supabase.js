// ============================================================================
//  supabase.js — warstwa danych na Supabase (Auth + PostgREST) bez bibliotek.
//  Udostępnia window.JLDB. Tokeny trzymane w localStorage (logowanie trwałe).
// ============================================================================

const CFG = window.JL_CONFIG || {};
const SB_URL = (CFG.supabaseUrl || "").replace(/\/+$/, "");
const SB_KEY = CFG.supabaseAnonKey || "";

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
  const resp = await fetch(SB_URL + "/auth/v1" + path, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

/** REST (PostgREST) z auto-odświeżaniem tokenu przy 401. */
async function rest(path, { method = "GET", body, prefer } = {}) {
  const doFetch = () => {
    const headers = { apikey: SB_KEY, "Content-Type": "application/json" };
    if (session && session.access_token) headers.Authorization = "Bearer " + session.access_token;
    if (prefer) headers.Prefer = prefer;
    return fetch(SB_URL + "/rest/v1" + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };
  let resp = await doFetch();
  if (resp.status === 401 && session && session.refresh_token) {
    if (await tryRefresh()) resp = await doFetch();
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
  } catch (_) {
    saveSession(null);
    return false;
  }
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
/** Kopiuje materiał (np. publiczny „od autora") do moich. */
async function copyToMine(id, folderId) {
  const m = await getMaterial(id);
  if (!m) throw new Error("Nie znaleziono materiału.");
  return createMaterial({ title: m.title, type: m.type, content: m.content, folderId: folderId || null });
}

window.JLDB = {
  isConfigured,
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
  copyToMine,
};
