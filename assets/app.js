// ============================================================================
//  app.js — J-Learner na Supabase: logowanie, biblioteka (foldery + publiczne),
//  edytor materiałów oraz sesje (test/fiszki). Silnik sesji jak dotąd.
// ============================================================================

// Anty-clickjacking (hosting statyczny nie ustawi nagłówka).
if (window.self !== window.top) {
  try { window.top.location = window.self.location.href; } catch (_) { document.documentElement.style.display = "none"; }
}

const JLP = window.JLParsers;
const DB = window.JLDB;
const MAX_CONTENT_BYTES = 5 * 1024 * 1024;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const state = {
  material: null,
  test: null,
  flash: null,
  my: { folders: [], stack: [{ id: null, name: "Moje materiały" }], category: null, _dirty: true },
  editing: null,
};

const LIB_CATEGORIES = [
  { key: "flashcards", type: "flashcards", name: "Fiszki", folderName: "Fiszki", icon: "❏", sub: "Foldery i materiały z fiszkami" },
  { key: "test", type: "test", name: "Testy ABCD", folderName: "Testy ABCD", icon: "≡", sub: "Foldery i materiały z testami ABCD" },
];
const ROOT_STACK = { id: null, name: "Moje materiały" };

function normName(v) { return String(v || "").trim().toLowerCase(); }
function categoryByKey(key) { return LIB_CATEGORIES.find((c) => c.key === key) || null; }
function categoryByType(type) { return LIB_CATEGORIES.find((c) => c.type === type) || null; }
function isCategoryRootFolder(folder) {
  return (folder.parent_id || null) === null && LIB_CATEGORIES.some((c) => normName(c.folderName) === normName(folder.name));
}
function getCategoryFolder(categoryKey) {
  const cat = categoryByKey(categoryKey);
  if (!cat) return null;
  return state.my.folders.find((f) => (f.parent_id || null) === null && normName(f.name) === normName(cat.folderName)) || null;
}
function setCategoryRoot(categoryKey) {
  const cat = categoryByKey(categoryKey);
  const root = getCategoryFolder(categoryKey);
  if (!cat || !root) return false;
  state.my.category = cat.key;
  state.my.stack = [{ ...ROOT_STACK }, { id: root.id, name: cat.name, categoryKey: cat.key, isCategoryRoot: true }];
  return true;
}
function setRootLibraryView() {
  state.my.category = null;
  state.my.stack = [{ ...ROOT_STACK }];
}

function showScreen(id) {
  $$(".screen").forEach((s) => s.classList.toggle("is-active", s.id === id));
  window.scrollTo({ top: 0 });
}

// ════════════════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════════════════
function setAuthStatus(msg, kind = "") {
  $("#auth-status").textContent = msg;
  $("#auth-status").className = "status" + (kind ? " " + kind : "");
}

function initApp() {
  if (!DB.isConfigured()) {
    showScreen("screen-auth");
    setAuthStatus("Aplikacja nie jest skonfigurowana — uzupełnij dane Supabase w assets/config.js.", "err");
    $("#btn-signin").disabled = true;
    $("#btn-signup").disabled = true;
    return;
  }
  if (DB.getUser()) enterApp();
  else showScreen("screen-auth");
}

async function enterApp() {
  const u = DB.getUser();
  $("#user-email").textContent = u ? u.email : "";
  $("#user-box").classList.remove("hidden");
  setRootLibraryView();
  state.my._dirty = true;
  showScreen("screen-library");
  await seedDefaultFolders();
  switchTab("mine");
}

/** Zapewnia dwa główne katalogi-sekcje: „Fiszki” oraz „Testy ABCD”. */
async function seedDefaultFolders() {
  await ensureCategoryRootFolders();
}

async function ensureCategoryRootFolders() {
  if (!DB.getUser()) return;
  try {
    let folders = (await DB.listFolders()) || [];
    for (const cat of LIB_CATEGORIES) {
      const exists = folders.some((f) => (f.parent_id || null) === null && normName(f.name) === normName(cat.folderName));
      if (!exists) {
        const created = await DB.createFolder(cat.folderName, null);
        if (created) folders.push(created);
      }
    }
    state.my.folders = folders;
    state.my._dirty = false;
  } catch (_) {}
}

async function doSignIn() {
  const email = $("#auth-email").value.trim();
  const pass = $("#auth-pass").value;
  if (!email || !pass) return setAuthStatus("Podaj e-mail i hasło.", "err");
  setAuthStatus("Logowanie…");
  try { await DB.signIn(email, pass); setAuthStatus(""); await enterApp(); }
  catch (e) { setAuthStatus(e.message, "err"); }
}

async function doSignUp() {
  const email = $("#auth-email").value.trim();
  const pass = $("#auth-pass").value;
  if (!email || !pass) return setAuthStatus("Podaj e-mail i hasło.", "err");
  setAuthStatus("Zakładam konto…");
  try {
    const { needsConfirm } = await DB.signUp(email, pass);
    if (needsConfirm) setAuthStatus("Konto utworzone. Potwierdź adres e-mail, potem się zaloguj.", "ok");
    else { setAuthStatus(""); await enterApp(); }
  } catch (e) { setAuthStatus(e.message, "err"); }
}

function doSignOut() {
  DB.signOut();
  $("#user-box").classList.add("hidden");
  showScreen("screen-auth");
  setAuthStatus("");
}

$("#btn-signin").addEventListener("click", doSignIn);
$("#btn-signup").addEventListener("click", doSignUp);
$("#btn-logout").addEventListener("click", doSignOut);
$("#auth-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") doSignIn(); });

// ════════════════════════════════════════════════════════════════════════════
//  BIBLIOTEKA
// ════════════════════════════════════════════════════════════════════════════
function setLibStatus(msg, kind = "") {
  $("#lib-status").textContent = msg;
  $("#lib-status").className = "status" + (kind ? " " + kind : "");
}

function switchTab(tab) {
  $$('.source-tab[data-tab]').forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tab));
  $("#tab-mine").classList.toggle("hidden", tab !== "mine");
  $("#tab-public").classList.toggle("hidden", tab !== "public");
  setLibStatus("");
  if (tab === "mine") loadMy();
  else loadPublic();
}
$$('.source-tab[data-tab]').forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));

function curFolderId() {
  return state.my.stack[state.my.stack.length - 1].id;
}

async function loadMy() {
  setLibStatus("Wczytuję…");
  try {
    if (state.my._dirty) { state.my.folders = (await DB.listFolders()) || []; state.my._dirty = false; }
    if (LIB_CATEGORIES.some((cat) => !getCategoryFolder(cat.key))) await ensureCategoryRootFolders();

    if (!categoryByKey(state.my.category) || !getCategoryFolder(state.my.category)) {
      if (!setCategoryRoot(LIB_CATEGORIES[0].key)) {
        renderMyCategoryTabs();
        setLibStatus("Nie udało się przygotować sekcji Fiszki/Testy ABCD. Odśwież stronę i spróbuj ponownie.", "err");
        return;
      }
    }
    renderMyCategoryTabs();

    const cat = categoryByKey(state.my.category);
    const parent = curFolderId();
    const subfolders = state.my.folders.filter((f) => (f.parent_id || null) === parent);
    const isCategoryRoot = state.my.stack.length === 2;
    const legacyRootFolders = isCategoryRoot
      ? state.my.folders.filter((f) => (f.parent_id || null) === null && !isCategoryRootFolder(f))
      : [];
    const folders = subfolders.concat(legacyRootFolders);
    const directMaterials = (await DB.listMyMaterials(parent)) || [];
    const legacyRootMaterials = isCategoryRoot ? ((await DB.listMyMaterials(null)) || []) : [];
    const materials = directMaterials.concat(legacyRootMaterials).filter((m) => m.type === cat.type);
    renderMy(folders, materials);
    setLibStatus("");
  } catch (e) { setLibStatus(e.message, "err"); }
}

function renderMyCrumbs() {
  const nav = $("#my-crumbs");
  nav.innerHTML = "";
  state.my.stack.forEach((f, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "crumb-sep"; sep.textContent = "›"; nav.appendChild(sep);
    }
    const b = document.createElement("button");
    b.type = "button";
    const last = i === state.my.stack.length - 1;
    b.className = "crumb" + (last ? " current" : "");
    b.textContent = f.name;
    if (!last) b.addEventListener("click", () => {
      if (i === 0 && state.my.category) {
        setCategoryRoot(state.my.category);
      } else {
        state.my.stack = state.my.stack.slice(0, i + 1);
        state.my.category = state.my.stack.length > 1 ? state.my.stack[1].categoryKey : null;
      }
      loadMy();
    });
    nav.appendChild(b);
  });
}

function renderMyCategoryTabs() {
  const tabs = $("#my-category-tabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  LIB_CATEGORIES.forEach((cat) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "category-tab" + (state.my.category === cat.key ? " is-active" : "");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", state.my.category === cat.key ? "true" : "false");
    b.dataset.category = cat.key;
    b.innerHTML = `<span class="category-tab-icon">${cat.icon}</span><span>${escapeHtml(cat.name)}</span>`;
    b.addEventListener("click", () => {
      if (state.my.category === cat.key && state.my.stack.length === 2) return;
      if (!setCategoryRoot(cat.key)) {
        setLibStatus("Nie udało się odnaleźć sekcji. Odśwież stronę i spróbuj ponownie.", "err");
        return;
      }
      loadMy();
    });
    tabs.appendChild(b);
  });
}

function renderMy(folders, materials) {
  renderMyCrumbs();
  const list = $("#my-list");
  list.innerHTML = "";
  $("#my-empty").classList.toggle("hidden", folders.length + materials.length > 0);

  folders.forEach((f) => {
    const li = document.createElement("li");
    const row = rowEl("folder", "▤", f.name, "Folder");
    row.querySelector(".lib-row").addEventListener("click", () => { state.my.stack.push({ id: f.id, name: f.name, categoryKey: state.my.category }); loadMy(); });
    row.appendChild(iconBtn("✕", "Usuń folder", async (e) => {
      e.stopPropagation();
      if (!confirm(`Usunąć folder „${f.name}" i jego zawartość?`)) return;
      try { await DB.deleteFolder(f.id); state.my._dirty = true; loadMy(); }
      catch (err) { setLibStatus(err.message, "err"); }
    }));
    li.appendChild(row);
    list.appendChild(li);
  });

  materials.forEach((m) => {
    const li = document.createElement("li");
    const sub = (m.type === "test" ? "Test ABCD" : "Fiszki") + " · " + fmtDate(m.updated_at);
    const row = rowEl("file", m.type === "test" ? "≡" : "❏", m.title, sub);
    row.querySelector(".lib-row").addEventListener("click", () => openMaterial(m.id));
    row.appendChild(iconBtn("↪", "Przenieś do folderu", (e) => { e.stopPropagation(); openMovePicker(m); }));
    row.appendChild(iconBtn("✎", "Edytuj", (e) => { e.stopPropagation(); editMaterial(m.id); }));
    row.appendChild(iconBtn("✕", "Usuń", async (e) => {
      e.stopPropagation();
      if (!confirm(`Usunąć materiał „${m.title}"?`)) return;
      try { await DB.deleteMaterial(m.id); loadMy(); }
      catch (err) { setLibStatus(err.message, "err"); }
    }));
    li.appendChild(row);
    list.appendChild(li);
  });
}

async function loadPublic() {
  setLibStatus("Wczytuję…");
  try {
    const materials = (await DB.listPublicMaterials()) || [];
    const list = $("#pub-list");
    list.innerHTML = "";
    $("#pub-empty").classList.toggle("hidden", materials.length > 0);
    materials.forEach((m) => {
      const li = document.createElement("li");
      const sub = (m.type === "test" ? "Test ABCD" : "Fiszki") + " · " + fmtDate(m.updated_at);
      const row = rowEl("file", m.type === "test" ? "≡" : "❏", m.title, sub);
      row.querySelector(".lib-row").addEventListener("click", () => openMaterial(m.id));
      row.appendChild(iconBtn("⤓", "Kopiuj do moich", async (e) => {
        e.stopPropagation();
        try {
          await ensureCategoryRootFolders();
          const cat = categoryByType(m.type);
          const root = cat ? getCategoryFolder(cat.key) : null;
          await DB.copyToMine(m.id, root ? root.id : null);
          setLibStatus(`Skopiowano „${m.title}" do sekcji „${cat ? cat.name : "Moje materiały"}".`, "ok");
        }
        catch (err) { setLibStatus(err.message, "err"); }
      }));
      li.appendChild(row);
      list.appendChild(li);
    });
    setLibStatus("");
  } catch (e) { setLibStatus(e.message, "err"); }
}

function rowEl(kind, icon, name, sub) {
  const wrap = document.createElement("div");
  wrap.className = "lib-rowwrap";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lib-row";
  btn.innerHTML =
    `<span class="lib-ico ${kind}">${icon}</span>` +
    `<span class="lib-row-main"><span class="lib-name">${escapeHtml(name)}</span>` +
    (sub ? `<span class="lib-sub">${escapeHtml(sub)}</span>` : "") + `</span>`;
  wrap.appendChild(btn);
  return wrap;
}
function iconBtn(glyph, label, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "row-action";
  b.title = label;
  b.setAttribute("aria-label", label);
  b.textContent = glyph;
  b.addEventListener("click", onClick);
  return b;
}

// ── Modal (ogólny) + przenoszenie materiałów do/z folderów ───────────────────
function openModal(title, buildBody) {
  $("#modal-title").textContent = title;
  const body = $("#modal-body");
  body.innerHTML = "";
  buildBody(body);
  $("#modal-overlay").classList.remove("hidden");
}
function closeModal() { $("#modal-overlay").classList.add("hidden"); }
$("#modal-close").addEventListener("click", closeModal);
$("#modal-overlay").addEventListener("click", (e) => { if (e.target === $("#modal-overlay")) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal-overlay").classList.contains("hidden")) closeModal(); });

/** Drzewo folderów danej kategorii: korzeń sekcji + podfoldery (z wcięciem). */
function categoryFolderTree(catKey) {
  const root = getCategoryFolder(catKey);
  if (!root) return [];
  const cat = categoryByKey(catKey);
  const out = [{ id: root.id, name: cat.name, depth: 0, isRoot: true }];
  const walk = (pid, depth) => {
    state.my.folders
      .filter((f) => (f.parent_id || null) === pid && !isCategoryRootFolder(f))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"))
      .forEach((f) => { out.push({ id: f.id, name: f.name, depth }); walk(f.id, depth + 1); });
  };
  walk(root.id, 1);
  return out;
}

function openMovePicker(m) {
  const cat = categoryByType(m.type);
  if (!cat) return setLibStatus("Nie można ustalić sekcji materiału.", "err");
  const root = getCategoryFolder(cat.key);
  const rootId = root ? root.id : null;
  const cur = m.folder_id || rootId;            // legacy null traktujemy jak „góra sekcji”
  const inSubfolder = cur !== rootId;
  const tree = categoryFolderTree(cat.key);

  openModal("Przenieś materiał", (body) => {
    const info = document.createElement("p");
    info.className = "modal-sub";
    info.textContent = `„${m.title}” — wybierz folder w sekcji ${cat.name}.`;
    body.appendChild(info);

    tree.forEach((node) => {
      const isCurrent = node.id === cur;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "move-target" + (isCurrent ? " is-current" : "");
      b.style.paddingLeft = 12 + node.depth * 18 + "px";
      let label;
      if (node.isRoot) label = inSubfolder ? `↩ Usuń z folderu (góra sekcji)` : `${cat.name} (góra sekcji)`;
      else label = node.name;
      b.innerHTML =
        `<span class="move-ico">${node.isRoot ? "■" : "▤"}</span>` +
        `<span class="move-name">${escapeHtml(label)}</span>` +
        (isCurrent ? `<span class="move-here">tutaj</span>` : "");
      if (!isCurrent) b.addEventListener("click", () => doMove(m, node.id));
      body.appendChild(b);
    });

    const nf = document.createElement("button");
    nf.type = "button";
    nf.className = "move-newfolder";
    nf.textContent = "+ Nowy folder tutaj";
    nf.addEventListener("click", async () => {
      const name = (prompt("Nazwa nowego folderu:") || "").trim();
      if (!name) return;
      try {
        const created = await DB.createFolder(name, rootId);
        state.my._dirty = true;
        if (created) await doMove(m, created.id);
      } catch (e) { setLibStatus(e.message, "err"); }
    });
    body.appendChild(nf);
  });
}

async function doMove(m, folderId) {
  try {
    await DB.moveMaterial(m.id, folderId);
    closeModal();
    state.my._dirty = true;
    await loadMy();
    setLibStatus(`Przeniesiono „${m.title}”.`, "ok");
  } catch (e) { setLibStatus(e.message, "err"); }
}

$("#btn-new-folder").addEventListener("click", async () => {
  if (!state.my.category) return setLibStatus("Najpierw wybierz sekcję: Fiszki albo Testy ABCD.", "err");
  const name = (prompt("Nazwa folderu:") || "").trim();
  if (!name) return;
  try { await DB.createFolder(name, curFolderId()); state.my._dirty = true; loadMy(); }
  catch (e) { setLibStatus(e.message, "err"); }
});
$("#btn-new-material").addEventListener("click", () => {
  if (!state.my.category) return setLibStatus("Najpierw wybierz sekcję: Fiszki albo Testy ABCD.", "err");
  editMaterial(null);
});

// ════════════════════════════════════════════════════════════════════════════
//  EDYTOR
// ════════════════════════════════════════════════════════════════════════════
function setEdStatus(msg, kind = "") {
  $("#ed-status").textContent = msg;
  $("#ed-status").className = "status" + (kind ? " " + kind : "");
}

function populateFolderSelect(catKey, selectedId) {
  const sel = $("#ed-folder");
  sel.innerHTML = "";
  const tree = categoryFolderTree(catKey);
  if (!tree.length) {
    const o = document.createElement("option");
    o.value = ""; o.textContent = "(góra sekcji)";
    sel.appendChild(o);
    return;
  }
  tree.forEach((node) => {
    const o = document.createElement("option");
    o.value = node.id;
    const indent = node.depth > 0 ? "\u00A0\u00A0".repeat(node.depth) + "↳ " : "";
    o.textContent = indent + (node.isRoot ? node.name + " (góra sekcji)" : node.name);
    if (node.id === selectedId) o.selected = true;
    sel.appendChild(o);
  });
}

async function editMaterial(id) {
  const cat = categoryByKey(state.my.category);
  state.editing = { id: id, folderId: curFolderId(), categoryKey: state.my.category };
  setEdStatus("");
  if (id) {
    $("#editor-title").textContent = "Edytuj materiał";
    try {
      const m = await DB.getMaterial(id);
      if (!m) return setLibStatus("Nie znaleziono materiału.", "err");
      $("#ed-title").value = m.title;
      $("#ed-type").value = m.type;
      $("#ed-content").value = m.content;
      const catKey = (categoryByType(m.type) || cat || {}).key || state.my.category;
      state.editing.categoryKey = catKey;
      const rootId = (getCategoryFolder(catKey) || {}).id || null;
      populateFolderSelect(catKey, m.folder_id || rootId);
    } catch (e) { return setLibStatus(e.message, "err"); }
  } else {
    $("#editor-title").textContent = cat ? `Nowy materiał — ${cat.name}` : "Nowy materiał";
    $("#ed-title").value = "";
    $("#ed-type").value = cat ? cat.type : "auto";
    $("#ed-content").value = "";
    populateFolderSelect(state.my.category, curFolderId());
  }
  showScreen("screen-editor");
}

async function saveMaterial() {
  const title = $("#ed-title").value.trim();
  const content = $("#ed-content").value;
  let type = $("#ed-type").value;
  const folderId = $("#ed-folder").value || null;
  const cat = state.editing ? categoryByKey(state.editing.categoryKey) : null;
  if (!title) return setEdStatus("Podaj tytuł.", "err");
  if (!content.trim()) return setEdStatus("Treść jest pusta.", "err");
  if (content.length > MAX_CONTENT_BYTES) return setEdStatus("Treść jest za duża (limit 5 MB).", "err");
  if (type === "auto") type = cat ? cat.type : JLP.detectMaterialType(content);
  if (type !== "test" && type !== "flashcards") {
    return setEdStatus("Nie rozpoznano formatu. Test: Q:/A:/B:/C:/D:/CORRECT: — Fiszki: przód;tył", "err");
  }
  if (cat && type !== cat.type) {
    return setEdStatus(`Jesteś w sekcji „${cat.name}", więc materiał musi mieć zgodny typ.`, "err");
  }
  const items = type === "test" ? JLP.parseTestText(content) : JLP.parseFlashcardText(content);
  if (!items.length) return setEdStatus("Nie udało się odczytać żadnej pozycji z treści.", "err");

  setEdStatus("Zapisuję…");
  try {
    if (state.editing.id) await DB.updateMaterial(state.editing.id, { title, type, content, folder_id: folderId });
    else await DB.createMaterial({ title, type, content, folderId });
    setEdStatus("");
    state.my._dirty = true;
    showScreen("screen-library");
    loadMy();
  } catch (e) { setEdStatus(e.message, "err"); }
}

$("#btn-ed-save").addEventListener("click", saveMaterial);
$("#btn-ed-cancel").addEventListener("click", () => showScreen("screen-library"));
$("#btn-ed-sample-test").addEventListener("click", () => { $("#ed-content").value = SAMPLE_TEST; $("#ed-type").value = "test"; });
$("#btn-ed-sample-cards").addEventListener("click", () => { $("#ed-content").value = SAMPLE_CARDS; $("#ed-type").value = "flashcards"; });
$("#ed-file").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > MAX_CONTENT_BYTES) return setEdStatus("Plik za duży (limit 5 MB).", "err");
  const r = new FileReader();
  r.onload = () => {
    $("#ed-content").value = String(r.result);
    if (!$("#ed-title").value.trim()) $("#ed-title").value = f.name.replace(/\.[^.]+$/, "");
  };
  r.readAsText(f, "utf-8");
});

// ════════════════════════════════════════════════════════════════════════════
//  OTWARCIE MATERIAŁU → PODGLĄD/START
// ════════════════════════════════════════════════════════════════════════════
async function openMaterial(id) {
  setLibStatus("Otwieram…");
  try {
    const m = await DB.getMaterial(id);
    if (!m) return setLibStatus("Nie znaleziono materiału.", "err");
    const items = m.type === "test" ? JLP.parseTestText(m.content) : JLP.parseFlashcardText(m.content);
    if (!items.length) return setLibStatus("Materiał jest pusty lub w złym formacie.", "err");
    state.material = { id: m.id, type: m.type, name: m.title, items };
    setLibStatus("");
    renderReady();
    showScreen("screen-ready");
  } catch (e) { setLibStatus(e.message, "err"); }
}

function renderReady() {
  const mat = state.material;
  const isTest = mat.type === "test";
  $("#ready-badge").textContent = isTest ? "TEST ABCD" : "FISZKI";
  $("#ready-badge").className = "badge" + (isTest ? "" : " cards");
  $("#ready-title").textContent = mat.name;
  $("#ready-count").textContent = isTest
    ? `${mat.items.length} ${plural(mat.items.length, "pytanie", "pytania", "pytań")}`
    : `${mat.items.length} ${plural(mat.items.length, "fiszka", "fiszki", "fiszek")}`;

  const modes = isTest ? TEST_MODES : FLASH_MODES;
  state.mode = modes[0].key;
  const box = $("#ready-modes");
  box.innerHTML = "";
  modes.forEach((m, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mode-tile" + (i === 0 ? " active" : "");
    b.innerHTML =
      `<span class="mode-ico">${m.icon}</span>` +
      `<span class="mode-meta"><span class="mode-name">${m.label}</span><span class="mode-desc">${m.desc}</span></span>`;
    b.addEventListener("click", () => selectMode(m.key, b));
    box.appendChild(b);
  });
  $("#reset-panel").classList.add("hidden");
  selectMode(modes[0].key, box.firstChild);
}

function selectMode(key, tileEl) {
  state.mode = key;
  $$("#ready-modes .mode-tile").forEach((t) => t.classList.toggle("active", t === tileEl));
  $("#reset-panel").classList.add("hidden");
  renderReadyOptions();
  loadModeProgress(key);
}

// ── Postęp: ładowanie i wyświetlanie dla wybranego trybu ─────────────────────
async function loadModeProgress(mode) {
  const line = $("#ready-progress");
  const resetBtn = $("#btn-reset-progress");
  state.ready = { mode, passed: new Set() };
  if (!DB.isConfigured() || !state.material.id) { line.textContent = ""; resetBtn.classList.add("hidden"); return; }
  line.textContent = "Ładuję postęp…";
  try {
    const rows = await DB.listProgress(state.material.id, mode);
    if (state.ready.mode !== mode) return; // zmieniono tryb w międzyczasie
    const passed = new Set((rows || []).filter((r) => r.passed).map((r) => r.card_key));
    state.ready.passed = passed;
    const total = state.material.items.length;
    line.textContent = `Postęp w tym trybie: ${passed.size} / ${total} zaliczone`;
    resetBtn.classList.toggle("hidden", passed.size === 0);
  } catch (e) {
    line.textContent = "";
    resetBtn.classList.add("hidden");
  }
}

const OPT_Q = `<label class="opt"><input type="checkbox" id="opt-shuffle-q" checked><span class="opt-text"><b>Losowa kolejność pytań</b></span></label>`;
const OPT_A = `<label class="opt"><input type="checkbox" id="opt-shuffle-a" checked><span class="opt-text"><b>Losowa kolejność odpowiedzi</b></span></label>`;
const OPT_C = `<label class="opt"><input type="checkbox" id="opt-shuffle-c" checked><span class="opt-text"><b>Losowa kolejność fiszek</b></span></label>`;
const OPT_REV = `<label class="opt"><input type="checkbox" id="opt-reverse"><span class="opt-text"><b>Odwróć strony</b><small>Pokazuj najpierw odpowiedź</small></span></label>`;

function renderReadyOptions() {
  const m = state.mode;
  const opts = $("#ready-options");
  if (m === "exam" || m === "classic") opts.innerHTML = OPT_Q + OPT_A;
  else if (m === "tflash") opts.innerHTML = OPT_Q;
  else opts.innerHTML = OPT_C + OPT_REV;
}

function plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  if (d >= 2 && d <= 4 && !(h >= 12 && h <= 14)) return few;
  return many;
}

$("#btn-ready-back").addEventListener("click", () => showScreen("screen-library"));

// ── Definicje trybów (jak w aplikacji mobilnej) ───────────────────────────────
const TEST_MODES = [
  { key: "classic", icon: "🎯", label: "Quiz klasyczny", desc: "ABCD, potem wpisywanie z pamięci. Powtarza, aż opanujesz." },
  { key: "exam", icon: "📝", label: "Sesja testowa", desc: "Tylko ABCD, wynik na końcu, kolejna sesja = błędne." },
  { key: "tflash", icon: "🃏", label: "Fiszki", desc: "Pytanie → odpowiedź, oceniasz: Powtórz / Trudne / Dobre / Łatwe." },
];
const FLASH_MODES = [
  { key: "nauka", icon: "📚", label: "Nauka", desc: "Przerabiasz całość; karta wraca, dopóki nie klikniesz „Łatwe”." },
  { key: "przeglad", icon: "🔁", label: "Przegląd", desc: "Szybka powtórka; „Dobre” lub „Łatwe” kończy kartę." },
];

const GRADE_CFG = {
  tflash: { title: "Fiszki", color: "var(--indigo)", grades: [
    { label: "Powtórz", hint: "zaraz", pos: 0, cls: "g-again" },
    { label: "Trudne", hint: "za ~2", pos: 2, cls: "g-hard" },
    { label: "Dobre", hint: "za ~5", pos: 5, cls: "g-good" },
    { label: "Łatwe", hint: "koniec", pos: null, cls: "g-easy" },
  ] },
  nauka: { title: "Nauka", color: "var(--amber)", grades: [
    { label: "Powtórz", hint: "za 1", pos: 1, cls: "g-again" },
    { label: "Trudne", hint: "za 3", pos: 3, cls: "g-hard" },
    { label: "Dobre", hint: "za 6", pos: 6, cls: "g-good" },
    { label: "Łatwe", hint: "koniec", pos: null, cls: "g-easy" },
  ] },
  przeglad: { title: "Przegląd", color: "var(--amber)", grades: [
    { label: "Powtórz", hint: "za 1", pos: 1, cls: "g-again" },
    { label: "Trudne", hint: "za 2", pos: 2, cls: "g-hard" },
    { label: "Dobre", hint: "koniec", pos: null, cls: "g-good" },
    { label: "Łatwe", hint: "koniec", pos: null, cls: "g-easy" },
  ] },
};

// ── Postęp: odcisk karty + zapis + reset ─────────────────────────────────────
function _norm(s) { return String(s == null ? "" : s).trim().replace(/\s+/g, " "); }
function _fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
function cardKey(front, back) { return _fnv1a(_norm(front) + "\u0001" + _norm(back)); }
function testKey(q) { return cardKey(q.question, q.answers[q.correctIndex]); }
function flashKey(c) { return cardKey(c.front, c.back); }

function persistProgress(mode, rows) {
  if (!DB.isConfigured() || typeof DB.upsertProgress !== "function" || !state.material || !state.material.id || !rows.length) return;
  const mid = state.material.id;
  DB.upsertProgress(rows.map((r) => ({ material_id: mid, card_key: r.card_key, mode, passed: r.passed !== false, difficulty: r.difficulty }))).catch(() => {});
}

function allDoneNotice() {
  const line = $("#ready-progress");
  line.textContent = "Wszystko już zaliczone w tym trybie — zresetuj, aby powtórzyć.";
  line.classList.add("done");
  $("#btn-reset-progress").classList.remove("hidden");
}

// ── Reset postępu (etykiety jak w aplikacji mobilnej) ─────────────────────────
const RESET_GROUPS = {
  test: [
    { label: "Quiz klasyczny", mode: "classic" },
    { label: "Sesja testowa", mode: "exam" },
    { label: "Fiszki", mode: "flash" },
    { label: "Wszystko", mode: null, danger: true },
  ],
  flashcards: [
    { label: "Nauka", mode: "nauka" },
    { label: "Przegląd", mode: "przeglad" },
    { label: "Wszystko", mode: null, danger: true },
  ],
};
function buildResetPanel() {
  const panel = $("#reset-panel");
  const groups = state.material.type === "test" ? RESET_GROUPS.test : RESET_GROUPS.flashcards;
  panel.innerHTML = `<p class="reset-head">Wyczyść zaliczenia:</p>`;
  groups.forEach((g) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-ghost reset-opt" + (g.danger ? " btn-danger-ghost" : "");
    b.textContent = g.label;
    b.addEventListener("click", () => doReset(g.mode, g.label));
    panel.appendChild(b);
  });
}
$("#btn-reset-progress").addEventListener("click", () => {
  const panel = $("#reset-panel");
  if (panel.classList.contains("hidden")) { buildResetPanel(); panel.classList.remove("hidden"); }
  else panel.classList.add("hidden");
});
async function doReset(mode, label) {
  const what = mode ? `tryb „${label}”` : "wszystkie tryby";
  if (!window.confirm(`Zresetować postęp — ${what}? Tej operacji nie można cofnąć.`)) return;
  try {
    await DB.resetProgress(state.material.id, mode);
    $("#reset-panel").classList.add("hidden");
    $("#ready-progress").classList.remove("done");
    loadModeProgress(state.mode);
  } catch (e) { alert("Nie udało się zresetować: " + e.message); }
}

// ── Start sesji — dyspozytor trybu (z pominięciem zaliczonych) ────────────────
$("#btn-start").addEventListener("click", () => {
  const mat = state.material;
  if (!mat) return;
  $("#ready-progress").classList.remove("done");
  const passed = (state.ready && state.ready.passed) || new Set();
  const sq = $("#opt-shuffle-q")?.checked, sa = $("#opt-shuffle-a")?.checked;
  const sc = $("#opt-shuffle-c")?.checked, rev = $("#opt-reverse")?.checked;

  if (state.mode === "exam" || state.mode === "classic") {
    const qs = mat.items.map((q) => ({ ...q, key: testKey(q) }));
    const remaining = qs.filter((q) => !passed.has(q.key));
    if (!remaining.length) return allDoneNotice();
    if (state.mode === "exam") startExam(remaining, { shuffleQ: sq, shuffleA: sa });
    else startClassic(remaining, { shuffleQ: sq, shuffleA: sa });
  } else if (state.mode === "tflash") {
    const cards = mat.items.map((q) => ({ front: q.question, back: q.answers[q.correctIndex], key: testKey(q) }));
    const remaining = cards.filter((c) => !passed.has(c.key));
    if (!remaining.length) return allDoneNotice();
    startGrade(remaining, GRADE_CFG.tflash, sq, "flash");
  } else {
    const cards = mat.items.map((c) => { const key = flashKey(c); return rev ? { front: c.back, back: c.front, key } : { front: c.front, back: c.back, key }; });
    const remaining = cards.filter((c) => !passed.has(c.key));
    if (!remaining.length) return allDoneNotice();
    startGrade(remaining, GRADE_CFG[state.mode], sc, state.mode);
  }
});

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function insertAt(arr, pos, item) { arr.splice(Math.min(pos, arr.length), 0, item); }

function prepareItems(items, shuffleA) {
  return items.map((q) => {
    let arr = q.answers.map((text, idx) => ({ text, correct: idx === q.correctIndex }));
    if (shuffleA) arr = shuffled(arr);
    return { question: q.question, answers: arr.map((a) => a.text), correctIndex: arr.findIndex((a) => a.correct), key: q.key };
  });
}
function buildAnswers(box, answers, handler) {
  const keys = ["A", "B", "C", "D"];
  box.innerHTML = "";
  answers.forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "answer"; b.type = "button";
    b.innerHTML = `<span class="answer-key">${keys[i] || i + 1}</span><span>${escapeHtml(text)}</span>`;
    b.addEventListener("click", () => handler(i));
    box.appendChild(b);
  });
}
function revealAnswerButtons(correctIndex, chosen) {
  $$("#test-answers .answer").forEach((b, idx) => {
    b.disabled = true;
    if (idx === correctIndex) b.classList.add("correct");
    else if (idx === chosen) b.classList.add("wrong");
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  TRYB: SESJA TESTOWA (EXAM) — ABCD, wynik na końcu
// ════════════════════════════════════════════════════════════════════════════
function startExam(items, { shuffleQ = true, shuffleA = true } = {}) {
  const prepared = prepareItems(items, shuffleA);
  state.test = { queue: shuffleQ ? shuffled(prepared) : prepared, pos: 0, total: prepared.length, correct: 0, locked: false, wrong: [] };
  state.restart = () => startExam(items, { shuffleQ, shuffleA });
  state.testScreenMode = "exam";
  showScreen("screen-test");
  renderExam();
}
function renderExam() {
  const t = state.test;
  if (t.pos >= t.queue.length) return finishExam();
  const q = t.queue[t.pos];
  t.locked = false;
  $("#test-controls").classList.remove("hidden");
  $("#test-rating").classList.add("hidden");
  $("#test-textwrap").classList.add("hidden");
  $("#test-answers").classList.remove("hidden");
  $("#test-question").textContent = q.question;
  $("#test-count").textContent = `${t.pos + 1} / ${t.total}`;
  $("#test-score").textContent = `✓ ${t.correct}`;
  $("#test-progress").style.width = `${(t.pos / t.total) * 100}%`;
  $("#btn-test-next").disabled = true;
  buildAnswers($("#test-answers"), q.answers, answerExam);
}
function answerExam(i) {
  const t = state.test;
  if (t.locked) return;
  t.locked = true;
  const q = t.queue[t.pos];
  revealAnswerButtons(q.correctIndex, i);
  if (i === q.correctIndex) { t.correct++; $("#test-score").textContent = `✓ ${t.correct}`; }
  else t.wrong.push(q);
  $("#btn-test-next").disabled = false;
  $("#btn-test-next").focus();
}
function nextExam() { const t = state.test; if (!t.locked && t.pos < t.queue.length) return; t.pos++; renderExam(); }
function skipExam() { const t = state.test; if (t.locked) return; t.wrong.push(t.queue[t.pos]); t.pos++; renderExam(); }
function deleteExam() { const t = state.test; t.queue.splice(t.pos, 1); t.total = t.queue.length; if (t.total === 0) return finishExam(); renderExam(); }
function finishExam() {
  const t = state.test;
  const wrongKeys = new Set(t.wrong.map((q) => testKey(q)));
  const passedRows = t.queue.filter((q) => !wrongKeys.has(testKey(q))).map((q) => ({ card_key: testKey(q), passed: true }));
  persistProgress("exam", passedRows);
  const pct = t.total ? Math.round((t.correct / t.total) * 100) : 0;
  const retry = t.wrong.slice();
  showResults({
    pct, title: "Sesja testowa — koniec", line: `${t.correct} / ${t.total} poprawnych odpowiedzi`, color: "var(--indigo)",
    wrong: retry.map((q) => ({ question: q.question, answer: q.answers[q.correctIndex] || "" })),
    onRetryWrong: retry.length ? () => startExam(retry.map((q) => ({ question: q.question, answers: q.answers, correctIndex: q.correctIndex })), { shuffleQ: true, shuffleA: true }) : null,
    onRetryAll: state.restart,
  });
}
$("#btn-test-next").addEventListener("click", nextExam);
$("#btn-test-skip").addEventListener("click", skipExam);
$("#btn-test-delete").addEventListener("click", deleteExam);
$("#btn-test-quit").addEventListener("click", () => showScreen("screen-library"));

// ════════════════════════════════════════════════════════════════════════════
//  TRYB: QUIZ KLASYCZNY (CLASSIC) — ABCD + wpisywanie z pamięci, aż opanujesz
// ════════════════════════════════════════════════════════════════════════════
function startClassic(items, { shuffleQ = true, shuffleA = true } = {}) {
  const prepared = prepareItems(items, shuffleA);
  const order = shuffleQ ? shuffled(prepared) : prepared;
  state.classic = { queue: order.map((it) => ({ item: it, mode: "abcd" })), total: prepared.length, passed: 0, locked: false };
  state.restart = () => startClassic(items, { shuffleQ, shuffleA });
  state.testScreenMode = "classic";
  showScreen("screen-test");
  renderClassic();
}
function renderClassic() {
  const c = state.classic;
  if (c.queue.length === 0 || c.passed >= c.total) return finishClassic();
  const e = c.queue[0];
  c.locked = false;
  $("#test-question").textContent = e.item.question;
  $("#test-count").textContent = `${c.passed} / ${c.total}`;
  $("#test-score").textContent = `✓ ${c.passed}`;
  $("#test-progress").style.width = `${(c.passed / c.total) * 100}%`;
  $("#test-controls").classList.add("hidden");
  $("#test-rating").classList.add("hidden");
  if (e.mode === "abcd") {
    $("#test-textwrap").classList.add("hidden");
    $("#test-answers").classList.remove("hidden");
    buildAnswers($("#test-answers"), e.item.answers, classicAnswer);
  } else {
    $("#test-answers").classList.add("hidden");
    $("#test-textwrap").classList.remove("hidden");
    $("#test-typed").value = "";
    $("#test-correct").textContent = "";
    $("#test-text-reveal").classList.add("hidden");
    $("#test-text-grade").classList.add("hidden");
    $("#test-text-show").classList.remove("hidden");
    setTimeout(() => $("#test-typed").focus(), 30);
  }
}
function classicAnswer(i) {
  const c = state.classic;
  if (c.locked) return;
  c.locked = true;
  revealAnswerButtons(c.queue[0].item.correctIndex, i);
  $("#test-rating").classList.remove("hidden");
}
function classicRate(easy) {
  const c = state.classic;
  const e = c.queue.shift();
  e.mode = easy ? "text" : "abcd";
  insertAt(c.queue, 3, e);
  renderClassic();
}
function classicTextShow() {
  const e = state.classic.queue[0];
  $("#test-correct").textContent = e.item.answers[e.item.correctIndex];
  $("#test-text-reveal").classList.remove("hidden");
  $("#test-text-show").classList.add("hidden");
  $("#test-text-grade").classList.remove("hidden");
}
function classicTextGrade(kind) {
  const c = state.classic;
  const e = c.queue.shift();
  if (kind === "pass") { c.passed++; persistProgress("classic", [{ card_key: testKey(e.item), passed: true }]); }
  else { e.mode = kind === "hard" ? "abcd" : "text"; insertAt(c.queue, 3, e); }
  renderClassic();
}
function finishClassic() {
  const c = state.classic;
  showResults({ pct: 100, title: "Quiz klasyczny — koniec", line: `Opanowano ${c.passed} z ${c.total}`, color: "var(--indigo)", wrong: [], onRetryWrong: null, onRetryAll: state.restart });
}
$("#btn-rate-hard").addEventListener("click", () => classicRate(false));
$("#btn-rate-easy").addEventListener("click", () => classicRate(true));
$("#btn-text-show").addEventListener("click", classicTextShow);
$("#btn-text-pass").addEventListener("click", () => classicTextGrade("pass"));
$("#btn-text-hard").addEventListener("click", () => classicTextGrade("hard"));
$("#btn-text-easy").addEventListener("click", () => classicTextGrade("easy"));

// ════════════════════════════════════════════════════════════════════════════
//  WSPÓLNY SILNIK OCEN (Fiszki / Nauka / Przegląd) — pokaż odpowiedź + 4 oceny
// ════════════════════════════════════════════════════════════════════════════
function startGrade(cards, cfg, shuffle, mode) {
  const list = shuffle ? shuffled(cards) : cards.slice();
  state.grade = { queue: list.map((c) => ({ front: c.front, back: c.back, key: c.key })), total: cards.length, done: 0, cfg, mode, revealed: false };
  state.restart = () => startGrade(cards, cfg, shuffle, mode);
  showScreen("screen-flash");
  renderGrade();
}
function renderGrade() {
  const g = state.grade;
  if (g.queue.length === 0) return finishGrade();
  const card = g.queue[0];
  g.revealed = false;
  $("#flash-card").classList.remove("flipped");
  $("#flash-front-text").textContent = card.front;
  $("#flash-back-text").textContent = card.back;
  $("#flash-count").textContent = `${g.done} / ${g.total}`;
  $("#flash-known").textContent = `✓ ${g.done}`;
  $("#flash-progress").style.width = `${(g.done / g.total) * 100}%`;
  $("#flash-controls-front").classList.remove("hidden");
  $("#flash-grades").classList.add("hidden");
}
function revealGrade() {
  const g = state.grade;
  if (!g || g.queue.length === 0 || g.revealed) return;
  g.revealed = true;
  $("#flash-card").classList.add("flipped");
  $("#flash-controls-front").classList.add("hidden");
  const box = $("#flash-grades");
  box.innerHTML = "";
  g.cfg.grades.forEach((gr) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-grade " + (gr.cls || "");
    b.innerHTML = `<span class="g-label">${gr.label}</span><span class="g-hint">${gr.hint}</span>`;
    b.addEventListener("click", () => applyGrade(gr));
    box.appendChild(b);
  });
  box.classList.remove("hidden");
}
function applyGrade(gr) {
  const g = state.grade;
  const card = g.queue.shift();
  if (gr.pos == null) {
    g.done++;
    if (g.mode && card.key) persistProgress(g.mode, [{ card_key: card.key, passed: true }]);
  } else insertAt(g.queue, gr.pos, card);
  renderGrade();
}
function skipGrade() { const g = state.grade; if (g.queue.length <= 1) return; g.queue.push(g.queue.shift()); renderGrade(); }
function deleteGradeCard() { const g = state.grade; g.queue.shift(); g.total = Math.max(g.done, g.total - 1); if (g.queue.length === 0) return finishGrade(); renderGrade(); }
function finishGrade() {
  const g = state.grade;
  const total = g.total || g.done;
  const pct = total ? Math.round((g.done / total) * 100) : 100;
  showResults({ pct, title: g.cfg.title + " — koniec", line: `Opanowano ${g.done} z ${total}`, color: g.cfg.color, wrong: [], onRetryWrong: null, onRetryAll: state.restart });
}
$("#btn-flash-flip").addEventListener("click", revealGrade);
$("#flash-card").addEventListener("click", revealGrade);
$("#flash-card").addEventListener("keydown", (e) => { if (e.key === "Enter") revealGrade(); });
$("#btn-flash-skip").addEventListener("click", skipGrade);
$("#btn-flash-delete").addEventListener("click", deleteGradeCard);
$("#btn-flash-quit").addEventListener("click", () => showScreen("screen-library"));

// ════════════════════════════════════════════════════════════════════════════
//  WYNIKI
// ════════════════════════════════════════════════════════════════════════════
function showResults({ pct, title, line, color, wrong, onRetryWrong, onRetryAll }) {
  $("#results-title").textContent = title;
  $("#results-line").textContent = line;
  $("#results-pct").textContent = `${pct}%`;
  const ring = $("#results-ring");
  ring.style.setProperty("--pct", `${pct}%`);
  ring.style.background = `radial-gradient(closest-side, var(--surface) 78%, transparent 79%), conic-gradient(${color} ${pct}%, var(--surface-2) 0)`;
  const wb = $("#results-wrong");
  wb.innerHTML = "";
  if (wrong && wrong.length) {
    const h = document.createElement("p");
    h.style.fontWeight = "600"; h.style.margin = "0 0 4px"; h.textContent = "Do powtórki:";
    wb.appendChild(h);
    wrong.forEach((w) => {
      const d = document.createElement("div");
      d.className = "wrong-item";
      d.innerHTML = `<p class="wrong-q">${escapeHtml(w.question)}</p><p class="wrong-a">✓ ${escapeHtml(w.answer)}</p>`;
      wb.appendChild(d);
    });
  }
  const rw = $("#btn-retry-wrong");
  if (onRetryWrong) { rw.classList.remove("hidden"); rw.onclick = onRetryWrong; }
  else rw.classList.add("hidden");
  $("#btn-retry-all").onclick = onRetryAll || (() => showScreen("screen-library"));
  showScreen("screen-results");
}
$("#btn-results-home").addEventListener("click", () => { showScreen("screen-library"); loadMy(); });

// ── Klawiatura ───────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  const active = $(".screen.is-active")?.id;
  if (active === "screen-test") {
    if (state.testScreenMode === "exam") {
      const t = state.test;
      if (["1", "2", "3", "4"].includes(e.key) && !t.locked) {
        const idx = Number(e.key) - 1;
        if (idx < $$("#test-answers .answer").length) { e.preventDefault(); answerExam(idx); }
      } else if (e.key === "Enter" && t.locked) { e.preventDefault(); nextExam(); }
      else if (e.key.toLowerCase() === "s" && !t.locked) { e.preventDefault(); skipExam(); }
    } else if (state.testScreenMode === "classic") {
      const c = state.classic;
      const e0 = c.queue[0];
      if (e0 && e0.mode === "abcd" && ["1", "2", "3", "4"].includes(e.key) && !c.locked) {
        const idx = Number(e.key) - 1;
        if (idx < $$("#test-answers .answer").length) { e.preventDefault(); classicAnswer(idx); }
      } else if (e0 && e0.mode === "text" && e.key === "Enter" && $("#test-text-grade").classList.contains("hidden")) {
        e.preventDefault(); classicTextShow();
      }
    }
  } else if (active === "screen-flash") {
    const g = state.grade;
    if (!g) return;
    if (e.key === " ") { e.preventDefault(); revealGrade(); }
    else if (g.revealed && ["1", "2", "3", "4"].includes(e.key)) {
      const idx = Number(e.key) - 1;
      if (idx < g.cfg.grades.length) { e.preventDefault(); applyGrade(g.cfg.grades[idx]); }
    }
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtDate(s) {
  if (!s) return "";
  try { return new Date(s).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" }); }
  catch (_) { return ""; }
}

const SAMPLE_TEST = `Q: Który obszar mózgu odpowiada za pamięć długotrwałą?
A: Móżdżek
B: Hipokamp
C: Ciało migdałowate
D: Most
CORRECT: B

Q: Zmienna, którą badacz celowo manipuluje, to zmienna:
A: zależna
B: zakłócająca
C: niezależna
D: pośrednicząca
CORRECT: C`;

const SAMPLE_CARDS = `bodziec warunkowy;bodziec, który po skojarzeniu wywołuje reakcję warunkową;warunkowanie
walidacja;stopień, w jakim test mierzy to, co ma mierzyć;psychometria
rzetelność;spójność i powtarzalność pomiaru;psychometria`;

// Start
initApp();
