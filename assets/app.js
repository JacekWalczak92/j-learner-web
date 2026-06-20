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
  my: { folders: [], stack: [{ id: null, name: "Moje materiały" }], _dirty: true },
  editing: null,
};

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

function enterApp() {
  const u = DB.getUser();
  $("#user-email").textContent = u ? u.email : "";
  $("#user-box").classList.remove("hidden");
  state.my.stack = [{ id: null, name: "Moje materiały" }];
  state.my._dirty = true;
  switchTab("mine");
  showScreen("screen-library");
}

async function doSignIn() {
  const email = $("#auth-email").value.trim();
  const pass = $("#auth-pass").value;
  if (!email || !pass) return setAuthStatus("Podaj e-mail i hasło.", "err");
  setAuthStatus("Logowanie…");
  try { await DB.signIn(email, pass); setAuthStatus(""); enterApp(); }
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
    else { setAuthStatus(""); enterApp(); }
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
    const parent = curFolderId();
    const subfolders = state.my.folders.filter((f) => (f.parent_id || null) === parent);
    const materials = (await DB.listMyMaterials(parent)) || [];
    renderMy(subfolders, materials);
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
    if (!last) b.addEventListener("click", () => { state.my.stack = state.my.stack.slice(0, i + 1); loadMy(); });
    nav.appendChild(b);
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
    row.querySelector(".lib-row").addEventListener("click", () => { state.my.stack.push({ id: f.id, name: f.name }); loadMy(); });
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
        try { await DB.copyToMine(m.id, null); setLibStatus(`Skopiowano „${m.title}" do moich.`, "ok"); }
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

$("#btn-new-folder").addEventListener("click", async () => {
  const name = (prompt("Nazwa folderu:") || "").trim();
  if (!name) return;
  try { await DB.createFolder(name, curFolderId()); state.my._dirty = true; loadMy(); }
  catch (e) { setLibStatus(e.message, "err"); }
});
$("#btn-new-material").addEventListener("click", () => editMaterial(null));

// ════════════════════════════════════════════════════════════════════════════
//  EDYTOR
// ════════════════════════════════════════════════════════════════════════════
function setEdStatus(msg, kind = "") {
  $("#ed-status").textContent = msg;
  $("#ed-status").className = "status" + (kind ? " " + kind : "");
}

async function editMaterial(id) {
  state.editing = { id: id, folderId: curFolderId() };
  setEdStatus("");
  if (id) {
    $("#editor-title").textContent = "Edytuj materiał";
    try {
      const m = await DB.getMaterial(id);
      if (!m) return setLibStatus("Nie znaleziono materiału.", "err");
      $("#ed-title").value = m.title;
      $("#ed-type").value = m.type;
      $("#ed-content").value = m.content;
    } catch (e) { return setLibStatus(e.message, "err"); }
  } else {
    $("#editor-title").textContent = "Nowy materiał";
    $("#ed-title").value = "";
    $("#ed-type").value = "auto";
    $("#ed-content").value = "";
  }
  showScreen("screen-editor");
}

async function saveMaterial() {
  const title = $("#ed-title").value.trim();
  const content = $("#ed-content").value;
  let type = $("#ed-type").value;
  if (!title) return setEdStatus("Podaj tytuł.", "err");
  if (!content.trim()) return setEdStatus("Treść jest pusta.", "err");
  if (content.length > MAX_CONTENT_BYTES) return setEdStatus("Treść jest za duża (limit 5 MB).", "err");
  if (type === "auto") type = JLP.detectMaterialType(content);
  if (type !== "test" && type !== "flashcards") {
    return setEdStatus("Nie rozpoznano formatu. Test: Q:/A:/B:/C:/D:/CORRECT: — Fiszki: przód;tył", "err");
  }
  const items = type === "test" ? JLP.parseTestText(content) : JLP.parseFlashcardText(content);
  if (!items.length) return setEdStatus("Nie udało się odczytać żadnej pozycji z treści.", "err");

  setEdStatus("Zapisuję…");
  try {
    if (state.editing.id) await DB.updateMaterial(state.editing.id, { title, type, content });
    else await DB.createMaterial({ title, type, content, folderId: state.editing.folderId });
    setEdStatus("");
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
    state.material = { type: m.type, name: m.title, items };
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
  const opts = $("#ready-options");
  if (isTest) {
    opts.innerHTML = `
      <label class="opt"><input type="checkbox" id="opt-shuffle-q" checked><span class="opt-text"><b>Losowa kolejność pytań</b></span></label>
      <label class="opt"><input type="checkbox" id="opt-shuffle-a" checked><span class="opt-text"><b>Losowa kolejność odpowiedzi</b></span></label>`;
  } else {
    opts.innerHTML = `
      <label class="opt"><input type="checkbox" id="opt-shuffle-c" checked><span class="opt-text"><b>Losowa kolejność fiszek</b></span></label>
      <label class="opt"><input type="checkbox" id="opt-reverse"><span class="opt-text"><b>Odwróć strony</b><small>Pokazuj najpierw odpowiedź</small></span></label>`;
  }
}

function plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  if (d >= 2 && d <= 4 && !(h >= 12 && h <= 14)) return few;
  return many;
}

$("#btn-ready-back").addEventListener("click", () => showScreen("screen-library"));

// ── Start sesji ────────────────────────────────────────────────────────────────
$("#btn-start").addEventListener("click", () => {
  if (!state.material) return;
  if (state.material.type === "test") {
    startTest(state.material.items, { shuffleQ: $("#opt-shuffle-q")?.checked, shuffleA: $("#opt-shuffle-a")?.checked });
  } else {
    startFlash(state.material.items, { shuffle: $("#opt-shuffle-c")?.checked, reverse: $("#opt-reverse")?.checked });
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

// ════════════════════════════════════════════════════════════════════════════
//  SESJA TESTOWA (ABCD)
// ════════════════════════════════════════════════════════════════════════════
function startTest(items, { shuffleQ = true, shuffleA = true } = {}) {
  const prepared = items.map((q) => {
    let answers = q.answers.map((text, idx) => ({ text, correct: idx === q.correctIndex }));
    if (shuffleA) answers = shuffled(answers);
    return { question: q.question, answers };
  });
  state.test = { queue: shuffleQ ? shuffled(prepared) : prepared, pos: 0, total: prepared.length, correct: 0, locked: false, wrong: [] };
  showScreen("screen-test");
  renderTestQuestion();
}

function renderTestQuestion() {
  const t = state.test;
  if (t.pos >= t.queue.length) return finishTest();
  const q = t.queue[t.pos];
  t.locked = false;
  $("#test-question").textContent = q.question;
  $("#test-count").textContent = `${t.pos + 1} / ${t.total}`;
  $("#test-score").textContent = `✓ ${t.correct}`;
  $("#test-progress").style.width = `${(t.pos / t.total) * 100}%`;
  $("#btn-test-next").disabled = true;
  const keys = ["A", "B", "C", "D"];
  const box = $("#test-answers");
  box.innerHTML = "";
  q.answers.forEach((ans, i) => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.type = "button";
    btn.innerHTML = `<span class="answer-key">${keys[i] || i + 1}</span><span>${escapeHtml(ans.text)}</span>`;
    btn.addEventListener("click", () => answerTest(i));
    box.appendChild(btn);
  });
}

function answerTest(index) {
  const t = state.test;
  if (t.locked) return;
  t.locked = true;
  const q = t.queue[t.pos];
  $$("#test-answers .answer").forEach((b, i) => {
    b.disabled = true;
    if (q.answers[i].correct) b.classList.add("correct");
    else if (i === index) b.classList.add("wrong");
  });
  if (q.answers[index].correct) { t.correct++; $("#test-score").textContent = `✓ ${t.correct}`; }
  else t.wrong.push(q);
  $("#btn-test-next").disabled = false;
  $("#btn-test-next").focus();
}

function nextTest() { const t = state.test; if (!t.locked && t.pos < t.queue.length) return; t.pos++; renderTestQuestion(); }
function skipTest() { const t = state.test; if (t.locked) return; t.wrong.push(t.queue[t.pos]); t.pos++; renderTestQuestion(); }
function deleteTestQuestion() { const t = state.test; t.queue.splice(t.pos, 1); t.total = t.queue.length; if (t.total === 0) return finishTest(); renderTestQuestion(); }

function finishTest() {
  const t = state.test;
  const pct = t.total ? Math.round((t.correct / t.total) * 100) : 0;
  const retry = t.wrong.slice();
  showResults({
    pct, title: "Test zakończony", line: `${t.correct} / ${t.total} poprawnych odpowiedzi`, color: "var(--indigo)",
    wrong: retry.map((q) => ({ question: q.question, answer: (q.answers.find((a) => a.correct) || {}).text || "" })),
    onRetryWrong: retry.length ? () => startTest(retry.map((q) => ({ question: q.question, answers: q.answers.map((a) => a.text), correctIndex: q.answers.findIndex((a) => a.correct) })), { shuffleQ: true, shuffleA: true }) : null,
    onRetryAll: () => startTest(state.material.items, { shuffleQ: true, shuffleA: true }),
  });
}

$("#btn-test-next").addEventListener("click", nextTest);
$("#btn-test-skip").addEventListener("click", skipTest);
$("#btn-test-delete").addEventListener("click", deleteTestQuestion);
$("#btn-test-quit").addEventListener("click", () => showScreen("screen-library"));

// ════════════════════════════════════════════════════════════════════════════
//  SESJA FISZEK
// ════════════════════════════════════════════════════════════════════════════
function startFlash(items, { shuffle = true, reverse = false } = {}) {
  const cards = items.map((c) => ({ front: reverse ? c.back : c.front, back: reverse ? c.front : c.back }));
  state.flash = { queue: shuffle ? shuffled(cards) : cards.slice(), total: cards.length, known: 0, flipped: false };
  showScreen("screen-flash");
  renderFlashCard();
}

function renderFlashCard() {
  const f = state.flash;
  if (f.queue.length === 0) return finishFlash();
  const card = f.queue[0];
  f.flipped = false;
  $("#flash-card").classList.remove("flipped");
  $("#flash-front-text").textContent = card.front;
  $("#flash-back-text").textContent = card.back;
  $("#flash-count").textContent = `${f.known} / ${f.total}`;
  $("#flash-known").textContent = `✓ ${f.known}`;
  $("#flash-progress").style.width = `${(f.known / f.total) * 100}%`;
  $("#flash-controls-front").classList.remove("hidden");
  $("#flash-controls-grade").classList.add("hidden");
}

function flipFlash() {
  const f = state.flash;
  if (f.queue.length === 0) return;
  f.flipped = !f.flipped;
  $("#flash-card").classList.toggle("flipped", f.flipped);
  $("#flash-controls-front").classList.toggle("hidden", f.flipped);
  $("#flash-controls-grade").classList.toggle("hidden", !f.flipped);
}

function gradeFlash(known) {
  const f = state.flash;
  if (f.queue.length === 0) return;
  const card = f.queue.shift();
  if (known) f.known++;
  else f.queue.push(card);
  renderFlashCard();
}
function skipFlash() { const f = state.flash; if (f.queue.length <= 1) return; f.queue.push(f.queue.shift()); renderFlashCard(); }
function deleteFlashCard() { const f = state.flash; f.queue.shift(); f.total = Math.max(f.known, f.total - 1); if (f.queue.length === 0) return finishFlash(); renderFlashCard(); }

function finishFlash() {
  const f = state.flash;
  const total = f.total || f.known;
  const pct = total ? Math.round((f.known / total) * 100) : 100;
  showResults({
    pct, title: "Fiszki zakończone", line: `Opanowano ${f.known} ${plural(f.known, "fiszkę", "fiszki", "fiszek")}`,
    color: "var(--amber)", wrong: [], onRetryWrong: null,
    onRetryAll: () => startFlash(state.material.items, { shuffle: true, reverse: false }),
  });
}

$("#btn-flash-flip").addEventListener("click", flipFlash);
$("#flash-card").addEventListener("click", flipFlash);
$("#flash-card").addEventListener("keydown", (e) => { if (e.key === "Enter") flipFlash(); });
$("#btn-flash-known").addEventListener("click", () => gradeFlash(true));
$("#btn-flash-again").addEventListener("click", () => gradeFlash(false));
$("#btn-flash-skip").addEventListener("click", skipFlash);
$("#btn-flash-delete").addEventListener("click", deleteFlashCard);
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
  $("#btn-retry-all").onclick = onRetryAll;
  showScreen("screen-results");
}
$("#btn-results-home").addEventListener("click", () => { showScreen("screen-library"); loadMy(); });

// ── Klawiatura ───────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  const active = $(".screen.is-active")?.id;
  if (active === "screen-test") {
    const t = state.test;
    if (["1", "2", "3", "4"].includes(e.key) && !t.locked) {
      const idx = Number(e.key) - 1;
      if (idx < $$("#test-answers .answer").length) { e.preventDefault(); answerTest(idx); }
    } else if (e.key === "Enter" && t.locked) { e.preventDefault(); nextTest(); }
    else if (e.key.toLowerCase() === "s" && !t.locked) { e.preventDefault(); skipTest(); }
  } else if (active === "screen-flash") {
    const f = state.flash;
    if (e.key === " ") { e.preventDefault(); flipFlash(); }
    else if (f.flipped && e.key === "1") { e.preventDefault(); gradeFlash(false); }
    else if (f.flipped && e.key === "2") { e.preventDefault(); gradeFlash(true); }
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
