// ============================================================================
//  stats-lab.js (moduł ES) — „Statystyka → Laboratorium": interaktywne,
//  wizualne wyjaśnienia pojęć z wykładów 1–2. Każde laboratorium to
//  { id, title, sub, icon, mount(host) } — mount buduje DOM w podanym elemencie
//  (suwaki, przyciski, wykresy SVG) i dokłada krótkie wyjaśnienie + wyzwania.
//  Kolory wykresów pochodzą z CSS (klasy st-* / lab-*), więc działają w obu motywach.
// ============================================================================

// ── Drobne helpery DOM ───────────────────────────────────────────────────────
function h(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function btn(label, onClick, cls = "btn btn-ghost btn-sm") {
  const b = h("button", cls, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}
function row(...kids) { const r = h("div", "lab-row"); kids.forEach((k) => r.appendChild(k)); return r; }
function box(kind, html) { return h("div", "lab-box lab-" + kind, html); }
/** Suwak z etykietą i odczytem. fmtVal(v) → tekst odczytu. */
function slider(label, { min, max, step = 1, value }, onInput, fmtVal = (v) => String(v)) {
  const wrap = h("label", "lab-slider");
  const top = h("span", "lab-slider-top", `<span>${label}</span>`);
  const out = h("b", "lab-slider-val", fmtVal(value));
  top.appendChild(out);
  const input = h("input");
  Object.assign(input, { type: "range", min, max, step, value });
  input.addEventListener("input", () => { out.textContent = fmtVal(Number(input.value)); onInput(Number(input.value)); });
  wrap.append(top, input);
  return { wrap, input, set(v) { input.value = v; out.textContent = fmtVal(Number(v)); } };
}
/** Grupa przycisków-chipów (jeden wybrany). */
function chips(options, value, onChange) {
  const wrap = h("div", "nb-dir lab-chips");
  options.forEach((o) => {
    const c = h("button", "nb-chip" + (o.v === value ? " is-sel" : ""), o.label);
    c.type = "button";
    c.addEventListener("click", () => {
      wrap.querySelectorAll(".nb-chip").forEach((x) => x.classList.toggle("is-sel", x === c));
      onChange(o.v);
    });
    wrap.appendChild(c);
  });
  return wrap;
}
/** Wyzwania: lista { text, test(), after? }; update() po każdej zmianie sprawdza bieżące,
 *  refresh() losuje treść od nowa (gdy text jest getterem zależnym od danych). */
function challenges(host, items) {
  let i = 0, done = false, text = "";
  const el = h("div", "lab-box lab-goal");
  host.appendChild(el);
  const render = () => {
    el.innerHTML = `<span class="lab-goal-label">🎯 Wyzwanie ${i + 1}/${items.length}</span><p>${text}</p>` +
      `<p class="lab-goal-status${done ? " is-ok" : ""}">${done ? "✓ Udało się! " + (items[i].after || "") : "Spróbuj — wynik sprawdza się sam."}</p>`;
    if (done) el.appendChild(btn(i + 1 < items.length ? "Następne wyzwanie →" : "Od początku ↺", () => { i = (i + 1) % items.length; refresh(); }, "btn btn-secondary btn-sm"));
  };
  const update = () => { if (!done && items[i].test()) { done = true; render(); } };
  const refresh = () => { done = false; text = items[i].text; render(); update(); };
  text = items[0].text;
  render();
  return { update, refresh };
}
/** Pozycja kursora w jednostkach viewBox SVG. */
function svgPoint(svg, ev) {
  const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  return { x: ((ev.clientX - r.left) / r.width) * vb.width, y: ((ev.clientY - r.top) / r.height) * vb.height };
}
const SVGNS = "http://www.w3.org/2000/svg";
function svgEl(w, hgt, label) {
  const s = document.createElementNS(SVGNS, "svg");
  s.setAttribute("viewBox", `0 0 ${w} ${hgt}`);
  s.setAttribute("class", "st-svg lab-svg");
  s.setAttribute("role", "img");
  s.setAttribute("aria-label", label);
  return s;
}

// ── Liczby ───────────────────────────────────────────────────────────────────
const fmt = (x, d = 1) => String(Number((Math.round(x * 10 ** d) / 10 ** d).toFixed(d))).replace(".", ",").replace("-", "−");
const sum = (a) => a.reduce((s, x) => s + x, 0);
const mean = (a) => (a.length ? sum(a) / a.length : NaN);
function median(a) {
  if (!a.length) return NaN;
  const s = a.slice().sort((x, y) => x - y), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
const sd = (a) => { const m = mean(a); return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / a.length); };
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function randn() { const u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function erf(x) { // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const phi = (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
const sig = (lo, hi) => `<span class="st-sig"><span class="st-sig-hi">${hi}</span><span class="st-sig-op">Σ</span><span class="st-sig-lo">${lo}</span></span>`;

/** Histogram (słupki) w istniejącym SVG; bins: [{ label, f, sub? }]. */
function drawBars(svg, bins, { W = 360, H = 190, yMax } = {}) {
  const PL = 26, PB = bins.some((b) => b.sub) ? 34 : 22, PT = 10;
  const max = yMax || Math.max(1, ...bins.map((b) => b.f));
  const iw = W - PL - 6, ih = H - PB - PT, bw = iw / Math.max(1, bins.length);
  let s = `<line class="st-axis" x1="${PL}" y1="${PT + ih}" x2="${W - 4}" y2="${PT + ih}"/>` +
    `<line class="st-axis" x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT + ih}"/>` +
    `<text class="st-lbl" x="${PL - 5}" y="${PT + 6}" text-anchor="end">${max}</text>` +
    `<text class="st-lbl" x="${PL - 5}" y="${PT + ih}" text-anchor="end">0</text>`;
  const every = bins.length > 14 ? 2 : 1;
  bins.forEach((b, i) => {
    const x = PL + i * bw, bh = (b.f / max) * ih;
    if (b.f) s += `<rect class="st-bar" x="${x + 1.5}" y="${PT + ih - bh}" width="${Math.max(1, bw - 3)}" height="${bh}" rx="2"/>` +
      `<text class="st-lbl lab-bar-f" x="${x + bw / 2}" y="${PT + ih - bh - 3}" text-anchor="middle">${b.f}</text>`;
    if (i % every === 0) s += `<text class="st-lbl" x="${x + bw / 2}" y="${PT + ih + 13}" text-anchor="middle">${b.label}</text>`;
    if (b.sub) s += `<text class="st-lbl lab-sub-lbl" x="${x + bw / 2}" y="${PT + ih + 26}" text-anchor="middle">${b.sub}</text>`;
  });
  svg.innerHTML = s;
}

// ════════════════════════════════════════════════════════════════════════════
//  1. Σ JAKO PĘTLA
// ════════════════════════════════════════════════════════════════════════════
function labSigma(host) {
  let data = [21, 18, 12, 19, 9, 11, 12, 6], lo = 3, hi = 7, timer = null, step = -1;
  host.appendChild(box("info", `Σ to pętla „for”: <b>dolny indeks</b> = start, <b>górny</b> = koniec (oba włącznie), a za Σ stoi to, co dodajemy.
    Przesuń suwaki i obserwuj, które wyniki wpadają do sumy. Przykład z wykładu: 8 osób, suma od 3. do 7. = 63.`));
  const cells = h("div", "lab-cells");
  const formula = h("div", "lab-formula");
  const sLo = slider("Od osoby i =", { min: 1, max: 8, value: lo }, (v) => { lo = v; if (hi < lo) { hi = lo; sHi.set(hi); } stop(); render(); });
  const sHi = slider("Do osoby (górny indeks)", { min: 1, max: 8, value: hi }, (v) => { hi = v; if (lo > hi) { lo = hi; sLo.set(lo); } stop(); render(); });
  const play = btn("▶ Policz krok po kroku", () => {
    stop(); step = lo;
    const tick = () => { render(); if (step < hi) { step++; timer = setTimeout(tick, 650); } else { timer = null; } };
    tick();
  }, "btn btn-secondary btn-sm");
  const fresh = btn("🎲 Nowe dane", () => { data = data.map(() => ri(2, 25)); stop(); goals.refresh(); render(); });
  host.append(cells, row(sLo.wrap, sHi.wrap), formula, row(play, fresh));
  const target = () => { const a = ri(1, 5), b = ri(a + 1, 8); return { a, b, t: sum(data.slice(a - 1, b)) }; };
  let tg = target();
  const goals = challenges(host, [
    { get text() { tg = target(); return `Ustaw granice tak, żeby suma wyniosła <b>${tg.t}</b>.`; }, test: () => sum(data.slice(lo - 1, hi)) === tg.t, after: "Liczba składników = górny − dolny + 1." },
    { text: "Ustaw sumowanie <b>wszystkich</b> obserwacji (to samo co Σ bez granic).", test: () => lo === 1 && hi === 8, after: "Gdy pod i nad Σ nic nie ma — sumujemy wszystko." },
    { text: "Ustaw sumę składającą się z dokładnie <b>jednego</b> wyniku. Co wtedy oznacza Σ?", test: () => lo === hi, after: "Σ od k do k = po prostu X<sub>k</sub>." },
  ]);
  function stop() { if (timer) clearTimeout(timer); timer = null; step = -1; }
  function render() {
    cells.innerHTML = "";
    data.forEach((x, k) => {
      const i = k + 1, inside = i >= lo && i <= hi, counted = step < 0 ? inside : inside && i <= step;
      const c = h("div", "lab-cell" + (inside ? " is-in" : "") + (counted ? " is-on" : "") + (i === step ? " is-now" : ""),
        `<span class="lab-cell-i">i = ${i}</span><span class="lab-cell-x">${x}</span>`);
      cells.appendChild(c);
    });
    const upto = step < 0 ? hi : step;
    const terms = data.slice(lo - 1, upto);
    formula.innerHTML = `${sig("i=" + lo, hi)}<i>X</i><sub>i</sub> = ` +
      data.slice(lo - 1, hi).map((x, k) => `<span class="${lo + k <= upto ? "" : "lab-dim"}">${x}</span>`).join(" + ") +
      ` = <b>${sum(terms)}</b>${step >= 0 && step < hi ? " …" : ""}` +
      `<div class="lab-small">${hi - lo + 1} ${hi - lo + 1 === 1 ? "składnik" : hi - lo + 1 < 5 ? "składniki" : "składników"} · n = ${data.length} · Σ wszystkich = ${sum(data)}</div>`;
    goals.update();
  }
  render();
}

// ════════════════════════════════════════════════════════════════════════════
//  2. ROZKŁAD LICZEBNOŚCI NA ŻYWO
// ════════════════════════════════════════════════════════════════════════════
function labFreq(host) {
  const LO = 20, K = 12;
  let obs = [], width = 1;
  host.appendChild(box("info", `Klikaj wyniki, żeby „zbadać” kolejne osoby. Tabela i histogram liczą się same.
    Zmień <b>szerokość przedziału</b>, żeby zobaczyć granice dokładne (± ½ jednostki) i środki przedziałów — na nich stoją słupki.`));
  const pad = h("div", "lab-pad");
  for (let v = LO; v < LO + K; v++) pad.appendChild(btn(String(v), () => { obs.push(v); render(); }, "nb-chip lab-val"));
  const svg = svgEl(360, 200, "Histogram");
  const tbl = h("div", "lab-table");
  const info = h("p", "lab-small");
  host.append(pad, row(
    btn("🎲 Losuj 20 osób", () => { obs = Array.from({ length: 20 }, () => Math.max(LO, Math.min(LO + K - 1, Math.round(LO + 4 + randn() * 2.2)))); render(); }),
    btn("↶ Cofnij", () => { obs.pop(); render(); }),
    btn("Wyczyść", () => { obs = []; render(); }),
  ), row(h("span", "lab-small", "Szerokość przedziału:"), chips([{ v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" }], 1, (v) => { width = v; render(); })),
  h("div", "st-fig lab-fig"), tbl, info);
  host.querySelector(".lab-fig").appendChild(svg);
  const skew = () => { if (obs.length < 3) return 0; const m = mean(obs), s = sd(obs) || 1; return mean(obs.map((x) => ((x - m) / s) ** 3)); };
  const goals = challenges(host, [
    { text: "Zbadaj co najmniej <b>15 osób</b> tak, żeby rozkład był <b>skośny prawostronnie</b> (długi ogon w prawo).", test: () => obs.length >= 15 && skew() > 0.6, after: "Szczyt po lewej, ogon po prawej — nazwę daje ogon." },
    { text: "Teraz zbuduj (≥ 15 osób) rozkład <b>lewostronnie skośny</b>. „Wyczyść” i zacznij od nowa.", test: () => obs.length >= 15 && skew() < -0.6 },
    { text: "Zbuduj (≥ 12 osób) rozkład, w którym wynik 25 ma <b>procent skumulowany równo 50%</b>.", test: () => obs.length >= 12 && obs.filter((x) => x <= 25).length * 2 === obs.length, after: "Połowa osób ma 25 lub mniej — to też podpowiedź, gdzie leży mediana." },
  ]);
  function render() {
    const n = obs.length;
    const bins = [];
    for (let a = LO; a < LO + K; a += width) {
      const b = Math.min(a + width - 1, LO + K - 1);
      bins.push({ a, b, f: obs.filter((x) => x >= a && x <= b).length });
    }
    drawBars(svg, bins.map((x) => ({ label: width === 1 ? x.a : fmt((x.a + x.b) / 2, 1), f: x.f, sub: width === 1 ? "" : `${fmt(x.a - 0.5)}–${fmt(x.b + 0.5)}` })), { W: 360, H: 200 });
    let cf = 0;
    const rowsHtml = bins.map((x) => {
      cf += x.f;
      const lbl = width === 1 ? x.a : `${x.a}–${x.b}`;
      return `<tr class="${x.f ? "" : "lab-dim"}"><td>${lbl}</td>${width > 1 ? `<td>${fmt((x.a + x.b) / 2, 1)}</td>` : ""}<td>${x.f}</td><td>${n ? fmt((x.f / n) * 100) + "%" : "–"}</td><td>${cf}</td><td>${n ? fmt((cf / n) * 100) + "%" : "–"}</td></tr>`;
    }).join("");
    tbl.innerHTML = `<div class="st-table-wrap"><table class="st-table"><thead><tr><th>${width === 1 ? "Wynik" : "Przedział"}</th>${width > 1 ? "<th>Środek</th>" : ""}<th>f</th><th>%</th><th>f skum.</th><th>% skum.</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
    info.innerHTML = n
      ? `n = <b>${n}</b> · ostatnia f skum. = ${cf} ${cf === n ? "✓ równa n" : ""} · ostatni % skum. = 100% ✓` +
        (width > 1 ? " · tracimy informację, ile osób miało który wynik w przedziale" : "")
      : "Kliknij wynik albo „Losuj 20 osób”.";
    goals.update();
  }
  render();
}

// ════════════════════════════════════════════════════════════════════════════
//  3. HUŚTAWKA: ŚREDNIA vs MEDIANA
// ════════════════════════════════════════════════════════════════════════════
function labSeesaw(host) {
  const W = 360, H = 170, X0 = 18, X1 = W - 18, Y = 100;
  const toX = (v) => X0 + (v / 100) * (X1 - X0), toV = (x) => Math.max(0, Math.min(100, ((x - X0) / (X1 - X0)) * 100));
  const START = [32, 38, 41, 45, 47, 52, 58];
  let pts = START.slice();
  host.appendChild(box("info", `Średnia to <b>punkt podparcia huśtawki</b> — miejsce, w którym wyniki się równoważą. Mediana to <b>osoba ze środka kolejki</b>.
    <b>Przeciągaj kropki</b> (palcem lub myszą). Odciągnij jedną daleko w prawo: średnia ucieka, mediana prawie stoi — to <b>odporność</b>.`));
  const svg = svgEl(W, H, "Wyniki na osi liczbowej, średnia i mediana");
  svg.classList.add("lab-svg-drag");
  const fig = h("div", "st-fig lab-fig"); fig.appendChild(svg);
  const read = h("div", "lab-readout");
  host.append(fig, read, row(
    btn("+ wynik skrajny (98)", () => { pts.push(98); render(); }),
    btn("+ kropka", () => { pts.push(ri(30, 60)); render(); }),
    btn("− kropka", () => { if (pts.length > 2) pts.pop(); render(); }),
    btn("Reset", () => { pts = START.slice(); render(); }),
  ));
  const goals = challenges(host, [
    { text: "Przesuń kropki tak, żeby <b>średnia była większa od mediany o co najmniej 10</b>.", test: () => mean(pts) - median(pts) >= 10, after: "Tak wygląda skośność prawostronna: Me < M." },
    { text: "Teraz odwrotnie: <b>średnia mniejsza od mediany o co najmniej 10</b>.", test: () => median(pts) - mean(pts) >= 10, after: "Skośność lewostronna: M < Me." },
    { text: "Ustaw kropki tak, żeby <b>średnia = mediana</b> (różnica &lt; 0,5), a wyniki były rozrzucone na co najmniej 40 punktów.", test: () => Math.abs(mean(pts) - median(pts)) < 0.5 && Math.max(...pts) - Math.min(...pts) >= 40, after: "Symetria → M = Me." },
  ]);
  let drag = -1;
  svg.addEventListener("pointerdown", (e) => {
    const t = e.target.closest("[data-k]");
    if (!t) return;
    drag = Number(t.dataset.k);
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  svg.addEventListener("pointermove", (e) => { if (drag < 0) return; pts[drag] = Math.round(toV(svgPoint(svg, e).x)); render(); });
  const end = () => { drag = -1; };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  function render() {
    const m = mean(pts), me = median(pts);
    // Kropki o tej samej wartości układamy w stosik.
    const seen = {};
    let s = `<line class="st-axis" x1="${X0}" y1="${Y}" x2="${X1}" y2="${Y}"/>`;
    for (let v = 0; v <= 100; v += 10) s += `<line class="st-axis" x1="${toX(v)}" y1="${Y}" x2="${toX(v)}" y2="${Y + 4}"/><text class="st-lbl" x="${toX(v)}" y="${Y + 15}" text-anchor="middle">${v}</text>`;
    s += `<line class="lab-me" x1="${toX(me)}" y1="18" x2="${toX(me)}" y2="${Y}"/><text class="st-lbl lab-me-lbl" x="${toX(me)}" y="14" text-anchor="middle">Me</text>`;
    s += `<polygon class="lab-fulcrum" points="${toX(m)},${Y + 20} ${toX(m) - 11},${Y + 40} ${toX(m) + 11},${Y + 40}"/><text class="st-lbl lab-m-lbl" x="${toX(m)}" y="${Y + 54}" text-anchor="middle">M</text>`;
    pts.forEach((v, k) => {
      const lvl = (seen[v] = (seen[v] || 0) + 1) - 1;
      s += `<g class="lab-drag" data-k="${k}"><circle class="lab-hit" cx="${toX(v)}" cy="${Y - 12 - lvl * 16}" r="16"/><circle class="lab-pt${k === drag ? " is-drag" : ""}" cx="${toX(v)}" cy="${Y - 12 - lvl * 16}" r="7"/></g>`;
    });
    svg.innerHTML = s;
    read.innerHTML = `<span class="lab-chip-m">M = ${fmt(m)}</span><span class="lab-chip-me">Me = ${fmt(me)}</span><span>M − Me = <b>${fmt(m - me)}</b></span><span>n = ${pts.length}</span>`;
    goals.update();
  }
  render();
}

// ════════════════════════════════════════════════════════════════════════════
//  4. KSZTAŁT ROZKŁADU: SKOŚNOŚĆ I KURTOZA
// ════════════════════════════════════════════════════════════════════════════
function labShape(host) {
  let alpha = 4, beta = 2;
  const W = 360, H = 190;
  host.appendChild(box("info", `<b>Skośność</b>: przesuń suwak i „ciągnij rozkład za ogonek”. Nazwę daje <b>ogon</b>, nie górka. Patrz, jak rozjeżdżają się
    <span class="lab-c-mo">dominanta</span>, <span class="lab-c-me">mediana</span> i <span class="lab-c-m">średnia</span>.
    <b>Kurtoza</b> to szpiczastość <b>w porównaniu z normalnym</b> (linia przerywana, ta sama wariancja).`));
  const svgS = svgEl(W, H, "Rozkład skośny z liniami średniej, mediany i dominanty");
  const svgK = svgEl(W, H, "Kurtoza na tle rozkładu normalnego");
  const labS = h("p", "lab-verdict"), labK = h("p", "lab-verdict");
  const sS = slider("Skośność (ciągnij ogon)", { min: -8, max: 8, step: 0.5, value: alpha }, (v) => { alpha = v; render(); }, (v) => (v > 0 ? "ogon → w prawo" : v < 0 ? "← ogon w lewo" : "symetria"));
  const sK = slider("Szpiczastość", { min: 1, max: 8, step: 0.25, value: beta }, (v) => { beta = v; render(); }, (v) => (v < 1.8 ? "szpiczasty" : v > 2.3 ? "płaski" : "jak normalny"));
  const f1 = h("div", "st-fig lab-fig"); f1.appendChild(svgS);
  const f2 = h("div", "st-fig lab-fig"); f2.appendChild(svgK);
  host.append(h("h3", "lab-h", "Skośność"), f1, sS.wrap, labS, h("h3", "lab-h", "Kurtoza"), f2, sK.wrap, labK);
  const goals = challenges(host, [
    { text: "Ustaw rozkład <b>skośny lewostronnie</b>, w którym średnia jest wyraźnie na lewo od dominanty.", test: () => alpha <= -2 },
    { text: "Ustaw rozkład <b>platykurtyczny</b> (kurtoza ujemna).", test: () => beta >= 3 },
    { text: "Ustaw rozkład <b>leptokurtyczny</b> i <b>prawoskośny</b> naraz.", test: () => beta <= 1.4 && alpha >= 2, after: "Skośność i kurtoza to dwie niezależne cechy kształtu." },
  ]);
  const xs = Array.from({ length: 241 }, (_, k) => -4 + k / 30);
  function curve(ys, toX, toY) { return xs.map((x, k) => `${k ? "L" : "M"}${toX(x).toFixed(1)} ${toY(ys[k]).toFixed(1)}`).join(" "); }
  function render() {
    // Skośność: rozkład skośno-normalny 2φ(x)Φ(αx), przesunięty tak, by dominanta była mniej więcej w środku.
    const dens = xs.map((x) => 2 * phi(x) * Phi(alpha * x));
    const dx = 1 / 30;
    const mode = xs[dens.indexOf(Math.max(...dens))];
    const mu = sum(xs.map((x, k) => x * dens[k] * dx));
    let acc = 0, med = 0;
    for (let k = 0; k < xs.length; k++) { acc += dens[k] * dx; if (acc >= 0.5) { med = xs[k]; break; } }
    const toX = (x) => 20 + ((x + 3.2 + mode * 0.6) / 6.4) * (W - 40);
    const maxY = Math.max(...dens), toY = (y) => H - 24 - (y / maxY) * (H - 50);
    const vline = (x, cls, lbl, dy) => `<line class="${cls}" x1="${toX(x)}" y1="18" x2="${toX(x)}" y2="${H - 24}"/><text class="st-lbl ${cls}-lbl" x="${toX(x)}" y="${12 + dy}" text-anchor="middle">${lbl}</text>`;
    svgS.innerHTML = `<line class="st-axis" x1="10" y1="${H - 24}" x2="${W - 10}" y2="${H - 24}"/>` +
      `<path class="lab-area" d="${curve(dens, toX, toY)} L${toX(4)} ${H - 24} L${toX(-4)} ${H - 24} Z"/><path class="st-curve" d="${curve(dens, toX, toY)}"/>` +
      vline(mode, "lab-mo", "Mo", 0) + vline(med, "lab-me", "Me", 11) + vline(mu, "lab-m", "M", 22) +
      (Math.abs(alpha) >= 1 ? `<text class="st-lbl lab-tail" x="${alpha > 0 ? W - 60 : 60}" y="${H - 32}" text-anchor="middle">${alpha > 0 ? "ogon →" : "← ogon"}</text>` : "");
    const kind = Math.abs(alpha) < 0.5 ? "sym" : alpha > 0 ? "right" : "left";
    labS.innerHTML = kind === "sym" ? "Rozkład <b>symetryczny</b>: M = Me = Mo." :
      kind === "right" ? `Skośność <b>prawostronna (dodatnia)</b>: Mo &lt; Me &lt; M (${fmt(mode, 2)} &lt; ${fmt(med, 2)} &lt; ${fmt(mu, 2)}). Średnia ucieka w stronę ogona.` :
      `Skośność <b>lewostronna (ujemna)</b>: M &lt; Me &lt; Mo (${fmt(mu, 2)} &lt; ${fmt(med, 2)} &lt; ${fmt(mode, 2)}). Średnia ucieka w stronę ogona.`;
    // Kurtoza: uogólniony rozkład normalny exp(-|x|^β), znormalizowany do wariancji 1.
    const gen = (b) => {
      const raw = xs.map((x) => Math.exp(-Math.pow(Math.abs(x), b)));
      const area = sum(raw) * dx, v = sum(xs.map((x, k) => x * x * raw[k])) * dx / area, s = Math.sqrt(v);
      const ys = xs.map((x) => (Math.exp(-Math.pow(Math.abs(x * s), b)) * s) / area);
      const m4 = sum(xs.map((x, k) => x ** 4 * ys[k])) * dx;
      return { ys, kurt: m4 - 3 };
    };
    const g = gen(beta), n = gen(2);
    const toXk = (x) => 16 + ((x + 3.6) / 7.2) * (W - 32), toYk = (y) => H - 22 - y * 200;
    svgK.innerHTML = `<line class="st-axis" x1="10" y1="${H - 22}" x2="${W - 10}" y2="${H - 22}"/>` +
      `<path class="st-curve-ref" d="${curve(n.ys, toXk, toYk)}"/><path class="st-curve" d="${curve(g.ys, toXk, toYk)}"/>` +
      `<text class="st-lbl" x="${W - 14}" y="16" text-anchor="end"><tspan class="st-legend-ref">- - normalny</tspan>  <tspan class="st-legend-cur">— badany</tspan></text>`;
    const k = g.kurt;
    labK.innerHTML = Math.abs(k) < 0.15 ? `<b>Mezokurtyczny</b> — jak normalny, kurtoza ≈ 0.` :
      k > 0 ? `<b>Leptokurtyczny</b> — wyższy, węższy szczyt (i grubsze ogony), kurtoza <b>dodatnia</b> (≈ ${fmt(k, 2)}). „Lepi się do środka”.` :
      `<b>Platykurtyczny</b> — płaski jak dziobak (platypus), kurtoza <b>ujemna</b> (≈ ${fmt(k, 2)}).`;
    goals.update();
  }
  render();
}

// ════════════════════════════════════════════════════════════════════════════
//  5. STRZELNICA ESTYMATORÓW
// ════════════════════════════════════════════════════════════════════════════
function labEstim(host) {
  const MU = 50, SD = 10, W = 360;
  const EST = [
    { k: "mean", label: "Średnia", f: (s) => mean(s) },
    { k: "med", label: "Mediana", f: (s) => median(s) },
    { k: "bias", label: "Średnia + 3", f: (s) => mean(s) + 3 },
    { k: "first", label: "Tylko X₁", f: (s) => s[0] },
  ];
  const NS = [5, 10, 25, 50, 100, 400];
  let nIdx = 1, est = {};
  const reset = () => { est = Object.fromEntries(EST.map((e) => [e.k, []])); };
  reset();
  host.appendChild(box("info", `Populacja ma prawdziwą średnią <b>μ = ${MU}</b> (pomarańczowa linia). „Zbadaj próby” = powtórz to samo badanie wiele razy.
    Każda kropka to jedno oszacowanie. Patrz: czy chmura <b>trafia średnio w μ</b> (nieobciążoność), jak jest <b>wąska</b> (skuteczność)
    i co się dzieje, gdy <b>zwiększysz n</b> (zgodność).`));
  const sN = slider("Wielkość próby n", { min: 0, max: NS.length - 1, value: nIdx }, (v) => { nIdx = v; reset(); render(); }, (v) => String(NS[v]));
  const svg = svgEl(W, 50 + EST.length * 52, "Oszacowania z powtórzonych badań");
  const fig = h("div", "st-fig lab-fig"); fig.appendChild(svg);
  const read = h("div", "lab-table");
  const run = (times) => {
    for (let t = 0; t < times; t++) {
      const s = Array.from({ length: NS[nIdx] }, () => MU + randn() * SD);
      EST.forEach((e) => est[e.k].push(e.f(s)));
    }
    render();
  };
  host.append(sN.wrap, row(btn("Zbadaj 1 próbę", () => run(1), "btn btn-secondary btn-sm"), btn("Zbadaj 50 prób", () => run(50), "btn btn-primary btn-sm"), btn("Wyczyść", () => { reset(); render(); })), fig, read);
  const goals = challenges(host, [
    { text: "Zbierz co najmniej 100 oszacowań i sprawdź w tabeli: który estymator jest <b>obciążony</b>?", test: () => est.mean.length >= 100, after: "„Średnia + 3” systematycznie przeszacowuje μ — chmura jest przesunięta. Pozostałe trafiają średnio w 50." },
    { text: "Porównaj rozrzut średniej i mediany przy tym samym n (≥ 100 oszacowań). Który jest <b>skuteczniejszy</b>?", test: () => est.mean.length >= 100, after: "Średnia ma mniejszy rozrzut niż mediana → jest skuteczniejsza. „Tylko X₁” jest nieobciążony, ale bardzo nieskuteczny." },
    { text: "Ustaw <b>n = 400</b> i zbadaj co najmniej 50 prób. Porównaj rozrzut z n = 10.", test: () => NS[nIdx] === 400 && est.mean.length >= 50, after: "Im większe n, tym ciaśniej wokół μ — to zgodność („nie ma darmowej kawki”). Uwaga: „Tylko X₁” się nie poprawia, bo ignoruje resztę próby!" },
  ]);
  function render() {
    const lo = 20, hi = 80, toX = (v) => 92 + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (W - 100);
    let s = `<line class="st-mu" x1="${toX(MU)}" y1="14" x2="${toX(MU)}" y2="${40 + EST.length * 52}"/><text class="st-lbl st-mu-lbl" x="${toX(MU) + 4}" y="12">μ = ${MU}</text>`;
    for (let v = lo; v <= hi; v += 10) s += `<text class="st-lbl" x="${toX(v)}" y="${46 + EST.length * 52}" text-anchor="middle">${v}</text>`;
    EST.forEach((e, r) => {
      const y0 = 24 + r * 52, list = est[e.k];
      s += `<text class="st-lbl st-row-lbl" x="4" y="${y0 + 26}">${e.label}</text><line class="st-axis st-axis-soft" x1="92" y1="${y0 + 26}" x2="${W - 6}" y2="${y0 + 26}"/>`;
      // Ostatnie 300 kropek; pionowe rozrzucenie deterministyczne (stabilny obraz przy dorysowywaniu).
      list.slice(-300).forEach((v, k) => { s += `<circle class="st-dot lab-dot" cx="${toX(v).toFixed(1)}" cy="${(y0 + 10 + ((k * 37) % 33)).toFixed(1)}" r="3.2"/>`; });
      if (list.length) s += `<line class="lab-m" x1="${toX(mean(list))}" y1="${y0 + 6}" x2="${toX(mean(list))}" y2="${y0 + 46}"/>`;
    });
    svg.innerHTML = s;
    read.innerHTML = `<div class="st-table-wrap"><table class="st-table"><thead><tr><th>Estymator</th><th>średnia</th><th>obciąż.</th><th>SD</th></tr></thead><tbody>` +
      EST.map((e) => {
        const l = est[e.k];
        return `<tr><td>${e.label}</td><td>${l.length ? fmt(mean(l), 2) : "–"}</td><td>${l.length ? fmt(mean(l) - MU, 2) : "–"}</td><td>${l.length > 1 ? fmt(sd(l), 2) : "–"}</td></tr>`;
      }).join("") + `</tbody></table></div><p class="lab-small">n = ${NS[nIdx]} · oszacowań: ${est.mean.length}. „Średnia” = średnia oszacowań, „obciąż.” = średnia − μ, SD = rozrzut. Czerwona kreska w rzędzie = średnia oszacowań.</p>`;
    goals.update();
  }
  render();
}

// ════════════════════════════════════════════════════════════════════════════
//  6. BRAKI DANYCH I IMPUTACJA
// ════════════════════════════════════════════════════════════════════════════
function labMissing(host) {
  let mech = "rich", method = "mode", rate = 30;
  // Dochody (tys. zł): rozkład skośny prawostronnie, zaokrąglone do 0,5 tys.
  const gen = () => Array.from({ length: 300 }, () => Math.round(Math.exp(1.6 + 0.45 * randn()) * 2) / 2);
  let pop = gen();
  host.appendChild(box("info", `Ankieta o dochodach (300 osób, tys. zł). Część osób nie odpowiada. Zobacz, co robi z danymi <b>imputacja</b>
    (wpisywanie „zgadniętych” wartości), gdy braki są <b>losowe</b>, a co — gdy <b>bogaci częściej odmawiają</b>.`));
  const W = 360, H = 170;
  const svgT = svgEl(W, H, "Prawdziwe dochody"), svgO = svgEl(W, H, "Dochody po uzupełnieniu braków");
  const f1 = h("div", "st-fig lab-fig"); f1.appendChild(svgT);
  const f2 = h("div", "st-fig lab-fig"); f2.appendChild(svgO);
  const read = h("div", "lab-table"), verdict = h("p", "lab-verdict");
  host.append(
    row(h("span", "lab-small", "Kto nie odpowiada:"), chips([{ v: "random", label: "losowe osoby" }, { v: "rich", label: "bogaci częściej" }], mech, (v) => { mech = v; render(); })),
    row(h("span", "lab-small", "Co robimy z brakami:"), chips([{ v: "drop", label: "pomijamy" }, { v: "mode", label: "dominanta" }, { v: "median", label: "mediana" }], method, (v) => { method = v; render(); })),
    slider("Odsetek braków", { min: 10, max: 50, step: 5, value: rate }, (v) => { rate = v; render(); }, (v) => v + "%").wrap,
    h("h3", "lab-h", "Prawda (wszyscy)"), f1, h("h3", "lab-h", "To, co mamy po uzupełnieniu"), f2, read, verdict,
    row(btn("🎲 Nowa populacja", () => { pop = gen(); render(); })),
  );
  const goals = challenges(host, [
    { text: "Ustaw braki <b>losowe</b> i metodę „pomijamy”. Czy średnia mocno się zmienia?", test: () => mech === "random" && method === "drop", after: "Przy losowych brakach obraz zostaje prawie ten sam (tylko mniej danych)." },
    { text: "Ustaw „<b>bogaci częściej</b>” i „<b>dominanta</b>” przy 40% braków. Co się dzieje ze średnią i z rozrzutem?", test: () => mech === "rich" && method === "mode" && rate >= 40, after: "Średnia zaniżona, rozrzut (SD) sztucznie zawężony — słupek dominanty rośnie. Wg wykładowcy to jedna z najgorszych metod." },
  ]);
  function binsOf(a) {
    const B = 16, lo = 0, step = 1.5;
    const bins = Array.from({ length: B }, (_, i) => ({ label: i % 2 ? "" : fmt(lo + i * step, 0), f: 0 }));
    a.forEach((x) => { bins[Math.min(B - 1, Math.floor((x - lo) / step))].f++; });
    return bins;
  }
  function render() {
    const n = pop.length, k = Math.round((n * rate) / 100);
    // Kto odpada: losowo albo z prawdopodobieństwem rosnącym z dochodem.
    const order = pop.map((x, i) => ({ i, key: mech === "random" ? Math.random() : x * (0.6 + Math.random() * 0.8) }));
    order.sort((a, b) => b.key - a.key);
    const missing = new Set(order.slice(0, k).map((o) => o.i));
    const known = pop.filter((_, i) => !missing.has(i));
    const counts = {}; known.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
    const mo = Number(Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]);
    const fill = method === "mode" ? mo : median(known);
    const after = method === "drop" ? known : pop.map((x, i) => (missing.has(i) ? fill : x));
    const yMax = Math.max(...binsOf(pop).map((b) => b.f), ...binsOf(after).map((b) => b.f));
    drawBars(svgT, binsOf(pop), { W, H, yMax });
    drawBars(svgO, binsOf(after), { W, H, yMax });
    read.innerHTML = `<div class="st-table-wrap"><table class="st-table"><thead><tr><th></th><th>n</th><th>średnia</th><th>mediana</th><th>SD</th></tr></thead><tbody>` +
      `<tr><td>Prawda</td><td>${n}</td><td>${fmt(mean(pop), 2)}</td><td>${fmt(median(pop), 2)}</td><td>${fmt(sd(pop), 2)}</td></tr>` +
      `<tr class="is-hl"><td>Po ${method === "drop" ? "pominięciu" : "imputacji"}</td><td>${after.length}</td><td>${fmt(mean(after), 2)}</td><td>${fmt(median(after), 2)}</td><td>${fmt(sd(after), 2)}</td></tr></tbody></table></div>`;
    const dm = mean(after) - mean(pop), ds = sd(after) / sd(pop) - 1;
    verdict.innerHTML = `Średnia ${Math.abs(dm) < 0.15 ? "prawie bez zmian" : dm < 0 ? `zaniżona o ${fmt(-dm, 2)} tys.` : `zawyżona o ${fmt(dm, 2)} tys.`}; ` +
      `rozrzut ${Math.abs(ds) < 0.05 ? "podobny" : ds < 0 ? `węższy o ${fmt(-ds * 100, 0)}%` : `szerszy o ${fmt(ds * 100, 0)}%`}.` +
      (mech === "rich" ? " Braki są <b>nielosowe</b> — żadna prosta metoda tego nie naprawi. Najlepiej: nie dopuścić do braków." : "");
    goals.update();
  }
  render();
}

export const STAT_LABS = [
  { id: "sigma", title: "Σ jako pętla", sub: "suwaki granic sumowania, liczenie krok po kroku", icon: "Σ", mount: labSigma },
  { id: "freq", title: "Rozkład liczebności na żywo", sub: "klikasz wyniki → tabela, histogram, przedziały", icon: "▤", mount: labFreq },
  { id: "seesaw", title: "Huśtawka: średnia vs mediana", sub: "przeciągasz kropki, wynik skrajny, odporność", icon: "⚖", mount: labSeesaw },
  { id: "shape", title: "Kształt: skośność i kurtoza", sub: "ciągniesz ogon, M / Me / Mo, lepto / platy", icon: "◠", mount: labShape },
  { id: "estim", title: "Strzelnica estymatorów", sub: "powtarzasz badanie: obciążenie, skuteczność, zgodność", icon: "◎", mount: labEstim },
  { id: "missing", title: "Braki danych", sub: "losowe vs nielosowe braki, imputacja dominantą", icon: "?", mount: labMissing },
];
export function labById(id) { return STAT_LABS.find((l) => l.id === id) || null; }
