// ============================================================================
//  stats.js (moduł ES) — „Statystyka": interaktywne zadania do wykładów 1–2
//  (zapis Σ, rozkład liczebności, przedziały, kształt rozkładu, estymatory,
//  średnia/mediana/dominanta, braki danych).
//
//  Każde zadanie to generator: make() losuje nowe dane i zwraca
//  { q, fig?, fields?, choices?, correct?, hint, why }. Dzięki temu zadanie
//  powtórzone po błędzie ma inne liczby — trzeba umieć metodę, nie wynik.
//   • fields  — pola liczbowe (kroki rozwiązania): { label, ans, d, traps? };
//               d = liczba miejsc po przecinku (0 = dokładnie, inaczej ±1 na ostatnim miejscu);
//               traps = typowe błędy [[wartość, komunikat]] → konkretna podpowiedź.
//   • choices — jednokrotny wybór (HTML), correct = indeks poprawnej.
// ============================================================================

// ── Losowanie i formatowanie ─────────────────────────────────────────────────
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const sum = (arr) => arr.reduce((s, x) => s + x, 0);
const sorted = (arr) => arr.slice().sort((a, b) => a - b);
function median(arr) {
  const s = sorted(arr), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
/** Liczba po polsku: przecinek dziesiętny, bez zbędnych zer. */
export function fmt(x, d = 2) {
  const r = Number((Math.round(x * 10 ** d) / 10 ** d).toFixed(d));
  return String(r).replace(".", ",").replace("-", "−");
}
/** Odpowiedź użytkownika → liczba (przecinek lub kropka, opcjonalnie %, ułamek a/b). */
export function parseNum(s) {
  let t = String(s == null ? "" : s).trim().replace(/\s+/g, "").replace(/%$/, "").replace(/−/g, "-").replace(",", ".");
  if (!t) return NaN;
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}
/** Czy liczba mieści się w tolerancji pola: całkowite dokładnie, ułamki ±1 na ostatnim wymaganym miejscu. */
export function numClose(v, target, d = 0) {
  return Math.abs(v - target) <= (d ? 10 ** -d : 0) + 1e-9;
}

// ── Notacja ──────────────────────────────────────────────────────────────────
const X = (i, j) => `<i>X</i><sub>${i}${j != null ? j : ""}</sub>`;
const XBAR = `<i>x̄</i>`;
function sig(lo, hi) {
  return `<span class="st-sig"><span class="st-sig-hi">${hi == null ? "&nbsp;" : hi}</span>` +
    `<span class="st-sig-op">Σ</span><span class="st-sig-lo">${lo == null ? "&nbsp;" : lo}</span></span>`;
}
const list = (arr) => `<span class="st-data">${arr.join(", ")}</span>`;
function table(head, rows, cls = "") {
  return `<div class="st-table-wrap"><table class="st-table ${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr${r.cls ? ` class="${r.cls}"` : ""}>${(r.cells || r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
const steps = (arr) => `<ol class="st-steps">${arr.map((s) => `<li>${s}</li>`).join("")}</ol>`;
const pct = (x, d = 1) => fmt(x, d) + "%";

/** Rozkład liczebności z surowych danych: [{ v, f, cf }] rosnąco. */
function freqTable(data) {
  const m = new Map();
  data.forEach((x) => m.set(x, (m.get(x) || 0) + 1));
  let cf = 0;
  return [...m.keys()].sort((a, b) => a - b).map((v) => ({ v, f: m.get(v), cf: (cf += m.get(v)) }));
}
/** Losowe dane: wartości lo..lo+k-1 z wagami (kształt „górki"). */
function bumpData(n, lo, k) {
  const w = Array.from({ length: k }, (_, i) => 1 + Math.round(3 * Math.sin(((i + 0.5) / k) * Math.PI)) + ri(0, 1));
  const tot = sum(w);
  const out = [];
  for (let t = 0; t < n; t++) {
    let r = Math.random() * tot, i = 0;
    while (r >= w[i]) r -= w[i++];
    out.push(lo + i);
  }
  return out;
}

// ── Wykresy SVG (kolory z CSS — działają w obu motywach) ─────────────────────
const W = 340, H = 190, PADL = 30, PADB = 26, PADT = 12;
function histSvg(labels, heights, { yLabel = "f", marks = [] } = {}) {
  const max = Math.max(...heights), n = heights.length;
  const iw = W - PADL - 8, ih = H - PADB - PADT, bw = iw / n;
  const y = (v) => PADT + ih - (v / max) * ih;
  let s = `<svg class="st-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Histogram">`;
  s += `<line class="st-axis" x1="${PADL}" y1="${PADT + ih}" x2="${W - 4}" y2="${PADT + ih}"/>`;
  s += `<line class="st-axis" x1="${PADL}" y1="${PADT}" x2="${PADL}" y2="${PADT + ih}"/>`;
  s += `<text class="st-lbl" x="${PADL - 6}" y="${PADT + 4}" text-anchor="end">${max}</text>`;
  s += `<text class="st-lbl" x="${PADL - 6}" y="${PADT + ih}" text-anchor="end">0</text>`;
  s += `<text class="st-lbl st-lbl-axis" x="6" y="${PADT + ih / 2}">${yLabel}</text>`;
  const every = n > 12 ? 2 : 1;
  heights.forEach((h, i) => {
    const x = PADL + i * bw;
    if (h > 0) s += `<rect class="st-bar" x="${x + 1.5}" y="${y(h)}" width="${bw - 3}" height="${PADT + ih - y(h)}" rx="2"/>`;
    if (i % every === 0) s += `<text class="st-lbl" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>`;
  });
  marks.forEach((m) => {
    const x = PADL + (m.pos + 0.5) * bw;
    s += `<line class="st-mark ${m.cls}" x1="${x}" y1="${PADT}" x2="${x}" y2="${PADT + ih}"/>`;
  });
  return s + `</svg>`;
}

/** Krzywe gęstości (ta sama wariancja): uogólniony rozkład normalny exp(-|x|^β). */
function densityPath(beta, x0, x1, toX, toY) {
  const N = 160, xs = [], ys = [];
  const raw = (x) => Math.exp(-Math.pow(Math.abs(x), beta));
  // Normalizacja numeryczna: pole = 1 i wariancja = 1.
  let area = 0, m2 = 0;
  const step = 0.01;
  for (let x = -12; x <= 12; x += step) { const f = raw(x); area += f * step; m2 += x * x * f * step; }
  const sd = Math.sqrt(m2 / area);
  for (let k = 0; k <= N; k++) {
    const x = x0 + ((x1 - x0) * k) / N;
    xs.push(x);
    ys.push((raw(x * sd) * sd) / area);
  }
  return xs.map((x, k) => `${k ? "L" : "M"} ${toX(x).toFixed(1)} ${toY(ys[k]).toFixed(1)}`).join(" ");
}
function kurtSvg(beta) {
  const toX = (x) => 20 + ((x + 3.6) / 7.2) * (W - 40);
  const toY = (f) => H - 22 - f * 200;
  return `<svg class="st-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kształt rozkładu na tle normalnego">` +
    `<line class="st-axis" x1="14" y1="${H - 22}" x2="${W - 14}" y2="${H - 22}"/>` +
    `<path class="st-curve-ref" d="${densityPath(2, -3.6, 3.6, toX, toY)}"/>` +
    `<path class="st-curve" d="${densityPath(beta, -3.6, 3.6, toX, toY)}"/>` +
    `<text class="st-lbl" x="${W - 16}" y="20" text-anchor="end"><tspan class="st-legend-ref">- - normalny</tspan>  <tspan class="st-legend-cur">— badany</tspan></text>` +
    `</svg>`;
}

/** Normalne „losowe" punkty, przeskalowane do dokładnej średniej i odchylenia. */
function exactNormals(m, mean, sd) {
  const z = Array.from({ length: m }, () => {
    const u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  });
  const mz = sum(z) / m, sz = Math.sqrt(sum(z.map((x) => (x - mz) ** 2)) / m) || 1;
  return z.map((x) => mean + ((x - mz) / sz) * sd);
}
/** Oszacowania z powtórzonych badań: rzędy kropek wokół μ. rows: [{ label, xs }]. */
function dotsSvg(rows) {
  const rh = 54, h = 26 + rows.length * rh, cx = W / 2 + 10, scale = 26;
  let s = `<svg class="st-svg" viewBox="0 0 ${W} ${h}" role="img" aria-label="Oszacowania z powtórzonych badań">`;
  s += `<line class="st-mu" x1="${cx}" y1="10" x2="${cx}" y2="${h - 6}"/><text class="st-lbl st-mu-lbl" x="${cx + 4}" y="12">μ</text>`;
  rows.forEach((r, k) => {
    const y0 = 24 + k * rh;
    s += `<line class="st-axis st-axis-soft" x1="44" y1="${y0 + rh / 2}" x2="${W - 6}" y2="${y0 + rh / 2}"/>`;
    s += `<text class="st-lbl st-row-lbl" x="6" y="${y0 + rh / 2 + 4}">${r.label}</text>`;
    r.xs.forEach((x) => {
      const px = Math.max(48, Math.min(W - 8, cx + x * scale));
      s += `<circle class="st-dot" cx="${px.toFixed(1)}" cy="${(y0 + rh / 2 + (Math.random() - 0.5) * (rh - 22)).toFixed(1)}" r="5"/>`;
    });
  });
  return s + `</svg>`;
}

// ── Pytania pojęciowe (losowane z banku, bez powtórzeń w jednej sesji) ───────
function bankGen(id, topic, title, bank) {
  return {
    id, topic, title,
    make(used) {
      const fresh = bank.filter((_, i) => !(used && used.has(id + "#" + i)));
      const idx = bank.indexOf(fresh.length ? pick(fresh) : pick(bank));
      if (used) used.add(id + "#" + idx);
      const b = typeof bank[idx] === "function" ? bank[idx]() : bank[idx];
      const order = shuffle(b.a.map((_, i) => i));
      return { q: b.q, choices: order.map((i) => b.a[i]), correct: order.indexOf(0), hint: b.hint, why: b.why };
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  1. ZAPIS I OPERATOR Σ
// ════════════════════════════════════════════════════════════════════════════
const sigRange = {
  id: "sig-range", topic: "sigma", title: "Suma fragmentu danych",
  make() {
    const n = ri(6, 9), d = Array.from({ length: n }, () => ri(3, 25));
    const all = Math.random() < 0.2;
    const a = all ? 1 : ri(1, n - 2), b = all ? n : ri(a + 2, n);
    const part = d.slice(a - 1, b), res = sum(part);
    const traps = [];
    if (b - a >= 2) {
      traps.push([sum(d.slice(a, b)), `Zacząłeś od ${X(a + 1)}, a dolna granica to i = ${a} — ${X(a)} też się liczy.`]);
      traps.push([sum(d.slice(a - 1, b - 1)), `Zabrakło ${X(b)} — górna granica też wchodzi do sumy.`]);
    }
    let idxSum = 0; for (let i = a; i <= b; i++) idxSum += i;
    traps.push([idxSum, "To suma numerów osób (indeksów), a sumujemy ich wyniki X<sub>i</sub>."]);
    return {
      q: `Wyniki ${n} osób: ${table(["i", ...d.map((_, i) => i + 1)], [[X("i"), ...d]], "st-table-wide")}` +
        `Oblicz ${all ? sig() : sig("i=" + a, b)}${X("i")}.`,
      fields: [{ label: "Suma", ans: res, d: 0, traps }],
      hint: all ? "Brak granic pod i nad Σ = sumujemy wszystkie obserwacje." : `Dodaj wyniki osób od nr ${a} do nr ${b} włącznie (${b - a + 1} składników).`,
      why: steps([
        all ? "Bez granic sumujemy wszystkie wyniki." : `Pod Σ start (i = ${a}), nad Σ koniec (${b}).`,
        `${part.join(" + ")} = <b>${res}</b>`,
      ]),
    };
  },
};

const sigIndex = {
  id: "sig-index", topic: "sigma", title: "Indeks a wynik",
  make() {
    const n = ri(6, 9);
    let d;
    do { d = Array.from({ length: n }, () => ri(1, 20)); } while (new Set(d).size < n);
    const k = ri(1, n);
    let j; do { j = ri(1, n); } while (j === k);
    const v = d[j - 1];
    return {
      q: `Dane: ${d.map((x, i) => `${X(i + 1)} = ${x}`).join(", ")}.<br>` +
        `a) Ile wynosi ${X(k)}?<br>b) Która osoba (podaj i) ma wynik ${v}?<br>c) Ile wynosi n?`,
      fields: [
        { label: `a) ${X(k)}`, ans: d[k - 1], d: 0, traps: [[k, "To numer osoby, a pytamy o jej wynik."]] },
        { label: "b) i", ans: j, d: 0, traps: [[v, "Podałeś wynik — pytamy o numer osoby (indeks i)."]] },
        { label: "c) n", ans: n, d: 0, traps: [[sum(d), "n to liczba osób w próbie, nie suma wyników."]] },
      ],
      hint: `Indeks dolny = numer osoby. ${X(3)} = 12 znaczy „osoba nr 3 ma wynik 12”.`,
      why: steps([`${X(k)} = ${d[k - 1]} (osoba nr ${k}).`, `Wynik ${v} ma osoba nr ${j}, czyli ${X(j)} = ${v}.`, `Osób jest ${n}, więc n = ${n}.`]),
    };
  },
};

const sigDouble = {
  id: "sig-double", topic: "sigma", title: "Podwójne sumowanie Xij",
  make() {
    const k = ri(2, 3);
    const sizes = Array.from({ length: k }, () => ri(2, 5));
    const g = sizes.map((s) => Array.from({ length: s }, () => ri(2, 20)));
    const maxN = Math.max(...sizes);
    const jj = ri(1, k), ii = ri(1, sizes[jj - 1]), gj = ri(1, k);
    const rows = g.map((grp, j) => [`j = ${j + 1}`, ...Array.from({ length: maxN }, (_, i) => (grp[i] != null ? grp[i] : "–")), "?"]);
    const total = sum(g.map(sum));
    // Typowy błąd: zamiana indeksów (X_ji zamiast X_ij).
    const swapped = ii !== jj && ii <= k && jj <= sizes[ii - 1] ? g[ii - 1][jj - 1] : null;
    const traps = swapped != null ? [[swapped, `To ${X(jj, ii)} — pierwszy indeks to osoba, drugi grupa.`]] : [];
    return {
      q: `Wyniki w ${k} grupach (${X("i", "j")}: osoba i w grupie j):` +
        table(["", ...Array.from({ length: maxN }, (_, i) => "i = " + (i + 1)), "Σ grupy"], rows) +
        `a) ${X(ii, jj)} = ?<br>b) ${sig("i=1", "n<sub>" + gj + "</sub>")}${X("i", gj)} = ?<br>c) ${sig("j=1", "k")}${sig("i=1", "n<sub>j</sub>")}${X("i", "j")} = ?`,
      fields: [
        { label: `a) ${X(ii, jj)}`, ans: g[jj - 1][ii - 1], d: 0, traps },
        { label: "b) suma grupy " + gj, ans: sum(g[gj - 1]), d: 0 },
        { label: "c) suma wszystkich", ans: total, d: 0 },
      ],
      hint: `${X("i", "j")}: najpierw numer osoby, potem numer grupy. Wewnętrzna Σ idzie po osobach w grupie, zewnętrzna po grupach.`,
      why: steps([
        `${X(ii, jj)} = osoba nr ${ii} w grupie ${jj} = <b>${g[jj - 1][ii - 1]}</b>.`,
        `Grupa ${gj}: ${g[gj - 1].join(" + ")} = <b>${sum(g[gj - 1])}</b>.`,
        `Najpierw sumy grup, potem razem: ${g.map(sum).join(" + ")} = <b>${total}</b>.`,
      ]),
    };
  },
};

const sigFreq = {
  id: "sig-freq", topic: "sigma", title: "Suma z rozkładu liczebności",
  make() {
    const k = ri(4, 5), lo = ri(5, 15);
    const vals = Array.from({ length: k }, (_, i) => lo + i);
    const f = vals.map(() => ri(1, 6));
    const n = sum(f), s = sum(vals.map((v, i) => v * f[i]));
    return {
      q: `Dane w formie rozkładu liczebności:` + table(["Wynik X<sub>i</sub>", "Liczba osób f<sub>i</sub>"], vals.map((v, i) => [v, f[i]])) +
        `Ile osób zbadano (n) i ile wynosi suma wszystkich wyników?`,
      fields: [
        { label: "n", ans: n, d: 0, traps: [[k, "To liczba różnych wyników (wierszy), a n = Σ f."]] },
        { label: "Σ f·X", ans: s, d: 0, traps: [[sum(vals), "Każdy wynik trzeba pomnożyć przez liczbę osób, która go uzyskała."]] },
      ],
      hint: "Jak paragon: „3 × bułka” = cena × ilość. Suma wyników = Σ (f · X), n = Σ f.",
      why: steps([`n = ${f.join(" + ")} = <b>${n}</b>`, `Σ f·X = ${vals.map((v, i) => `${f[i]}·${v}`).join(" + ")} = ${vals.map((v, i) => f[i] * v).join(" + ")} = <b>${s}</b>`]),
    };
  },
};

const sigRead = {
  id: "sig-read", topic: "sigma", title: "Czytanie zapisu Σ",
  make() {
    const a = ri(1, 3), b = a + ri(2, 3);
    const terms = (p, q) => Array.from({ length: q - p + 1 }, (_, i) => X(p + i)).join(" + ");
    const nums = Array.from({ length: b - a + 1 }, (_, i) => a + i).join(" + ");
    const opts = [terms(a, b), terms(a + 1, b), terms(a, b - 1), nums];
    const order = shuffle([0, 1, 2, 3]);
    return {
      q: `Co oznacza zapis ${sig("i=" + a, b)}${X("i")}?`,
      choices: order.map((i) => opts[i]), correct: order.indexOf(0),
      hint: "Pod Σ — od której obserwacji, nad Σ — na której kończymy (obie włącznie). Za Σ — co dodajemy.",
      why: `Sumujemy wyniki X<sub>i</sub> od i = ${a} do i = ${b} włącznie: ${terms(a, b)}. „${nums}” to suma samych numerów osób, nie ich wyników.`,
    };
  },
};

const sigConcept = bankGen("sig-concept", "sigma", "Pojęcia: zmienna, n i N", [
  { q: "Badasz 120 studentów, żeby wnioskować o wszystkich studentach psychologii w Polsce. Co jest czym?",
    a: ["n = 120 (próba), N = wszyscy studenci psychologii (populacja)", "N = 120, n = wszyscy studenci psychologii", "n = N = 120", "n to liczba zmiennych w badaniu"],
    hint: "Małe n — ci, których zbadaliśmy. Duże N — ci, o których wnioskujemy.", why: "n (małe) = liczebność próby, N (duże) = liczebność populacji — zwykle ogromna." },
  { q: "Co oznacza zapis X<sub>5</sub> = 9?", a: ["Piąta osoba ma wynik 9", "Dziewiąta osoba ma wynik 5", "5 osób ma wynik 9", "Suma pięciu wyników wynosi 9"],
    hint: "Indeks dolny = numer osoby.", why: "Indeks dolny mówi, której obserwacji dotyczy wartość: osoba nr 5 ma wynik 9." },
  { q: "Co oznacza X<sub>32</sub> (osoby w grupach, zapis X<sub>ij</sub>)?", a: ["Trzecia osoba w drugiej grupie", "Druga osoba w trzeciej grupie", "Wynik równy 32", "32. osoba w badaniu"],
    hint: "Pierwszy indeks — osoba (i), drugi — grupa (j).", why: "X<sub>ij</sub>: i = osoba, j = grupa. X<sub>32</sub> = osoba 3 w grupie 2 (a nie „trzydzieści dwa”)." },
  { q: "Badasz kobiety i mężczyzn, każdą osobę w dwóch dawkach leku. Ile indeksów (i ile znaków Σ) potrzeba do zsumowania wszystkich wyników?",
    a: ["Trzy (potrójne sumowanie)", "Dwa", "Jeden", "Cztery"],
    hint: "Każdy dodatkowy podział = dodatkowy indeks i dodatkowa Σ.", why: "Osoba (i) × płeć (j) × dawka (l): X<sub>ijl</sub> i trzy znaki Σ." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  2. ROZKŁAD LICZEBNOŚCI
// ════════════════════════════════════════════════════════════════════════════
const freqBuild = {
  id: "freq-build", topic: "freq", title: "Rozkład liczebności z surowych danych",
  make() {
    const n = ri(12, 20), lo = ri(10, 30);
    const data = bumpData(n, lo, 6);
    const t = freqTable(data);
    const row = pick(t.slice(0, -1).length ? t.slice(0, -1) : t);
    const cp = (row.cf / n) * 100;
    return {
      q: `Wyniki ${n} osób: ${list(shuffle(data))}<br>Dla wyniku <b>${row.v}</b> podaj liczebność, liczebność skumulowaną i procent skumulowany (do 0,1%).`,
      fields: [
        { label: "f", ans: row.f, d: 0, traps: [[row.cf, "To liczebność skumulowana — f to liczba osób z dokładnie tym wynikiem."]] },
        { label: "f skumulowana", ans: row.cf, d: 0, traps: [[row.f, "Skumulowana = ten wynik lub niższy — dodaj liczebności wszystkich niższych wyników."], [n - row.cf + row.f, "Kumulujemy od najniższego wyniku w górę."]] },
        { label: "% skumulowany", ans: cp, d: 1, traps: [[row.cf / n, "To proporcja — procent = proporcja × 100."], [(row.f / n) * 100, "To procent samego wyniku, a nie skumulowany."]] },
      ],
      hint: "Uporządkuj wyniki rosnąco i policz, ile razy występuje każdy. Skumulowana = suma liczebności „od góry” tabeli do tego wiersza.",
      why: table(["Wynik", "f", "f skum.", "% skum."], t.map((r) => ({ cells: [r.v, r.f, r.cf, pct((r.cf / n) * 100)], cls: r === row ? "is-hl" : "" }))) +
        steps([`f(${row.v}) = <b>${row.f}</b>`, `f skum. = ${t.filter((r) => r.v <= row.v).map((r) => r.f).join(" + ")} = <b>${row.cf}</b>`, `${row.cf} / ${n} × 100 = <b>${pct(cp)}</b>`]),
    };
  },
};

const freqPct = {
  id: "freq-pct", topic: "freq", title: "Proporcja i procent",
  make() {
    const n = pick([16, 17, 20, 24, 25, 40, 48, 50, 96]), f = ri(1, Math.round(n / 3));
    return {
      q: `Wynik 17 uzyskało ${f} z ${n} osób. Podaj proporcję (do 0,001) i procent (do 0,1%).`,
      fields: [
        { label: "proporcja", ans: f / n, d: 3, traps: [[(f / n) * 100, "To procent — proporcja to liczba od 0 do 1 (f / n)."]] },
        { label: "procent", ans: (f / n) * 100, d: 1, traps: [[f / n, "To proporcja — pomnóż przez 100."]] },
      ],
      hint: "proporcja = f / n, procent = proporcja × 100.",
      why: steps([`${f} / ${n} = <b>${fmt(f / n, 3)}</b>`, `${fmt(f / n, 4)} × 100 = <b>${pct((f / n) * 100)}</b>`]),
    };
  },
};

const freqCumInterp = {
  id: "freq-cum", topic: "freq", title: "Co mówi procent skumulowany",
  make() {
    const n = pick([20, 25, 40, 50, 80, 96, 120]);
    const c = ri(Math.round(n * 0.2), Math.round(n * 0.85));
    const cp = (c / n) * 100, v = ri(20, 45);
    if (Math.random() < 0.5) {
      return {
        q: `W grupie n = ${n} procent skumulowany przy wyniku ${v} wynosi ${pct(cp, 2)}. Ile osób ma wynik <b>wyższy</b> niż ${v}?`,
        fields: [{ label: "liczba osób", ans: n - c, d: 0, traps: [[c, `Tyle osób ma wynik ${v} lub niższy — pytamy o wyższe.`]] }],
        hint: `Procent skumulowany = jaki % osób ma ten wynik lub niższy.`,
        why: steps([`${pct(cp, 2)} z ${n} = ${c} osób ma wynik ≤ ${v}.`, `Wyżej: ${n} − ${c} = <b>${n - c}</b>.`]),
      };
    }
    const opts = [
      `${pct(cp, 2)} osób uzyskało wynik ${v} lub niższy`,
      `${pct(cp, 2)} osób uzyskało dokładnie wynik ${v}`,
      `${pct(cp, 2)} osób uzyskało wynik wyższy niż ${v}`,
      `wynik ${v} jest ${pct(cp, 2)} wyższy od średniej`,
    ];
    const order = shuffle([0, 1, 2, 3]);
    return {
      q: `W tabeli rozkładu liczebności przy wyniku ${v} procent skumulowany wynosi ${pct(cp, 2)}. Co to znaczy?`,
      choices: order.map((i) => opts[i]), correct: order.indexOf(0),
      hint: "Skumulowana = „ten wynik lub niższy”.",
      why: `Procent skumulowany = jaki odsetek osób ma ten wynik lub niższy. Ktoś z wynikiem ${v} jest wyżej niż ok. ${fmt(cp, 0)}% grupy.`,
    };
  },
};

const freqError = {
  id: "freq-error", topic: "freq", title: "Znajdź błąd w tabeli",
  make() {
    const k = ri(5, 6), lo = ri(10, 30);
    const f = Array.from({ length: k }, () => ri(1, 6));
    const n = sum(f);
    const bad = ri(1, k - 1);
    const good = f.map((_, i) => sum(f.slice(0, i + 1)));
    // Jeden błąd (pominięty poprzedni wiersz albo pomyłka w dodawaniu), dalej liczone poprawnie od złej wartości.
    let wrong = Math.random() < 0.4 ? f[bad] : good[bad] + pick([-2, -1, 1, 2]);
    if (wrong === good[bad] || wrong < 1) wrong = good[bad] + 1;
    const cf = good.slice();
    cf[bad] = wrong;
    for (let i = bad + 1; i < k; i++) cf[i] = cf[i - 1] + f[i];
    const vals = f.map((_, i) => lo + i);
    return {
      q: `Ktoś policzył liczebność skumulowaną (n = ${n}). W którym wierszu pojawił się <b>pierwszy</b> błąd?` +
        table(["Wynik", "f", "f skum."], vals.map((v, i) => [v, f[i], cf[i]])),
      choices: vals.map((v) => `wiersz „${v}”`), correct: bad,
      hint: `Sprawdź od góry: każdy wiersz = poprzedni skumulowany + f. Ostatni wiersz musi dać n = ${n}.`,
      why: `Ostatni wiersz daje ${cf[k - 1]}, a powinien ${n} — więc gdzieś jest błąd. Poprawnie: ${good.join(", ")}. ` +
        `W wierszu „${vals[bad]}” powinno być ${good[bad - 1]} + ${f[bad]} = <b>${good[bad]}</b>, a jest ${cf[bad]}; dalsze wiersze tylko przenoszą ten błąd.`,
    };
  },
};

const freqConcept = bankGen("freq-concept", "freq", "Pojęcia: rozkład liczebności", [
  { q: "Jaką informację tracimy, zamieniając surowe wyniki w rozkład liczebności?",
    a: ["Kto uzyskał jaki wynik", "Ile osób uzyskało każdy wynik", "Jaki był najniższy i najwyższy wynik", "Jaka jest liczebność próby"],
    hint: "Monety ułożone w stosiki: wiesz ile jest każdej, ale nie wiesz, która leżała gdzie.", why: "Tabela mówi, ile osób ma każdy wynik — tracimy tylko przypisanie wyniku do konkretnej osoby (w badaniach zwykle niepotrzebne)." },
  { q: "Wyniki testu zmieniają się co 1 punkt, ale nikt nie uzyskał wyniku 23. Jaka jest jednostka pomiaru?",
    a: ["1 punkt", "2 punkty", "0,5 punktu", "Nie da się określić"],
    hint: "Jednostka = najmniejszy możliwy krok wyniku, nie to, co faktycznie wypadło.", why: "Linijka ma podziałkę co 1 mm, nawet jeśli żaden pomiar nie wypadł na 23 mm. Jednostka = 1." },
  { q: "Ostatni wiersz kolumny „liczebność skumulowana” to 95, a n = 96. Co z tego wynika?",
    a: ["Jest błąd w rachunkach — powinno wyjść n", "Jedna osoba ma wynik wyższy niż maksimum", "Wszystko w porządku — skumulowana nie musi dojść do n", "Brakuje jednego wiersza procentów"],
    hint: "Skumulowana kończy się zawsze na…", why: "Liczebność skumulowana zawsze kończy się na n (procent skumulowany na 100%). Jeśli nie — jest błąd." },
  { q: "Proporcja wynosi 0,25. Ile to procent?", a: ["25%", "0,25%", "2,5%", "250%"],
    hint: "procent = proporcja × 100", why: "0,25 × 100 = 25% — ta sama „ćwiartka pizzy”, powiedziana „na sto”." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  3. PRZEDZIAŁY KLASOWE I HISTOGRAM
// ════════════════════════════════════════════════════════════════════════════
const clsBounds = {
  id: "cls-bounds", topic: "classes", title: "Granice dokładne i środek przedziału",
  make() {
    const dec = Math.random() < 0.3;
    const u = dec ? 0.1 : 1;
    const w = ri(2, 5);
    const a = dec ? ri(10, 60) / 10 : ri(5, 60), b = a + (w - 1) * u;
    const D = dec ? 2 : 1;
    const lo = a - u / 2, hi = b + u / 2, mid = (a + b) / 2;
    return {
      q: `Przedział klasowy <b>${fmt(a, D)}–${fmt(b, D)}</b>, jednostka pomiaru ${fmt(u, 1)}. Podaj granice dokładne i środek przedziału.`,
      fields: [
        { label: "dolna granica dokładna", ans: lo, d: D, traps: [[a - u, "Odejmujemy pół jednostki, nie całą."], [a, "Granica dokładna jest o ½ jednostki niżej niż nominalna."]] },
        { label: "górna granica dokładna", ans: hi, d: D, traps: [[b + u, "Dodajemy pół jednostki, nie całą."], [b, "Granica dokładna jest o ½ jednostki wyżej niż nominalna."]] },
        { label: "środek przedziału", ans: mid, d: D },
      ],
      hint: `Granice dokładne: dolna − ½ jednostki (${fmt(u / 2, 2)}), górna + ½ jednostki. Środek = (dolna + górna) / 2.`,
      why: steps([`${fmt(a, D)} − ${fmt(u / 2, 2)} = <b>${fmt(lo, D)}</b>`, `${fmt(b, D)} + ${fmt(u / 2, 2)} = <b>${fmt(hi, D)}</b>`, `(${fmt(a, D)} + ${fmt(b, D)}) / 2 = <b>${fmt(mid, D)}</b> — tu stoi słupek histogramu.`]),
    };
  },
};

const clsCount = {
  id: "cls-count", topic: "classes", title: "Liczebność w przedziale",
  make() {
    const w = ri(2, 3), k = 5, lo = ri(10, 40);
    const n = ri(15, 22);
    const data = bumpData(n, lo, w * k);
    const cls = Array.from({ length: k }, (_, i) => {
      const a = lo + i * w, b = a + w - 1;
      return { a, b, f: data.filter((x) => x >= a && x <= b).length };
    });
    let cf = 0; cls.forEach((c) => { c.cf = cf += c.f; });
    const c = pick(cls.slice(0, -1));
    return {
      q: `Wyniki ${n} osób: ${list(shuffle(data))}<br>Przedziały o szerokości ${w}: ${cls.map((x) => `${x.a}–${x.b}`).join(", ")}.<br>` +
        `Dla przedziału <b>${c.a}–${c.b}</b> podaj liczebność, liczebność relatywną (do 0,001) i skumulowaną.`,
      fields: [
        { label: "f", ans: c.f, d: 0 },
        { label: "f relatywna", ans: c.f / n, d: 3, traps: [[(c.f / n) * 100, "To procent — liczebność relatywna (proporcja) to f / n."]] },
        { label: "f skumulowana", ans: c.cf, d: 0, traps: [[c.f, "Skumulowana = ten przedział i wszystkie niższe."]] },
      ],
      hint: `Policz wyniki od ${c.a} do ${c.b} włącznie.`,
      why: table(["Przedział", "Środek", "f", "f rel.", "f skum."], cls.map((x) => ({ cells: [`${x.a}–${x.b}`, fmt((x.a + x.b) / 2, 1), x.f, fmt(x.f / n, 3), x.cf], cls: x === c ? "is-hl" : "" }))) +
        `Teraz wiemy, że ${c.f} ${c.f === 1 ? "osoba ma" : "osób ma"} wynik w przedziale ${c.a}–${c.b}, ale już nie, ile dokładnie ma każdy wynik — to cena łączenia w przedziały.`,
    };
  },
};

const clsHist = {
  id: "cls-hist", topic: "classes", title: "Odczyt z histogramu",
  make() {
    const w = 2, k = 6, a0 = ri(10, 40);
    const f = [ri(1, 3), ri(3, 6), ri(4, 8), ri(3, 6), ri(1, 4), ri(1, 2)];
    const n = sum(f);
    const mids = f.map((_, i) => a0 + i * w + 0.5);
    const q = ri(1, k - 2);
    const cum = sum(f.slice(0, q + 1));
    return {
      q: `Histogram (przedziały o szerokości 2, jednostka 1; pod słupkami środki przedziałów). Ile osób zbadano i jaki procent ma wynik ≤ ${a0 + q * w + 1}? (do 0,1%)`,
      fig: histSvg(mids.map((m) => fmt(m, 1)), f),
      fields: [
        { label: "n", ans: n, d: 0, traps: [[k, "To liczba słupków — n to suma ich wysokości."]] },
        { label: "% skumulowany", ans: (cum / n) * 100, d: 1, traps: [[(f[q] / n) * 100, "To tylko jeden słupek — skumulowany sumuje wszystkie do tego miejsca."]] },
      ],
      hint: "Wysokość słupka = liczebność. Środek przedziału 24,5 ↔ przedział 24–25.",
      why: steps([`n = ${f.join(" + ")} = <b>${n}</b>`, `Przedziały do ${a0 + q * w}–${a0 + q * w + 1}: ${f.slice(0, q + 1).join(" + ")} = ${cum}`, `${cum} / ${n} × 100 = <b>${pct((cum / n) * 100)}</b>`]),
    };
  },
};

const clsConcept = bankGen("cls-concept", "classes", "Pojęcia: przedziały i histogram", [
  () => {
    const a = ri(10, 40), f = ri(3, 8);
    return { q: `Po połączeniu wyników w przedziały: przedział ${a}–${a + 1} ma f = ${f}. Co wiemy?`,
      a: [`${f} osób ma wynik ${a} albo ${a + 1}, ale nie wiemy, ile dokładnie ma ${a}`, `${f} osób ma wynik ${a} i ${f} osób wynik ${a + 1}`, `Każdy z wyników ${a} i ${a + 1} uzyskało po ${fmt(f / 2, 1)} osoby`, `${f} osób ma wynik ${a}–${a + 1} lub niższy`],
      hint: "Łączenie w „koszyki” = utrata informacji o wynikach wewnątrz koszyka.", why: "Przedział mówi tylko, ile osób wpadło do koszyka. Rozkład wewnątrz przedziału jest tracony." };
  },
  { q: "Nad jakim punktem osi X stoi słupek histogramu dla przedziału 24–25?", a: ["24,5 (środek przedziału)", "24", "25", "23,5"],
    hint: "Według wykładowcy to najważniejsza kolumna tabeli przedziałów.", why: "Słupki stoją na środkach przedziałów: (24 + 25) / 2 = 24,5." },
  { q: "Ten sam rozkład narysowano raz w procentach, raz w proporcjach. Czym różnią się histogramy?",
    a: ["Tylko skalą osi Y (do 100 vs do 1)", "Kształtem słupków", "Liczbą słupków", "Histogram w proporcjach jest bardziej płaski"],
    hint: "proporcja × 100 = procent — to ta sama informacja.", why: "Kształt jest identyczny, zmienia się tylko opis osi Y." },
  { q: "Co pokazuje histogram, czego nie widać łatwo w tabeli?", a: ["Kształt rozkładu i odchylenie od normalnego", "Dokładne wyniki poszczególnych osób", "Kto uzyskał najwyższy wynik", "Liczbę braków danych"],
    hint: "Miasto widziane z daleka.", why: "Histogram daje obraz kształtu rozkładu: symetria, skupienie, długie ogony." },
  { q: "Jak wygląda wykres skumulowany (procent skumulowany) dla rozkładu normalnego?",
    a: ["Gładka krzywa w kształcie litery S, kończąca się na 100%", "Dzwon", "Linia pozioma", "Krzywa, która rośnie, a potem maleje"],
    hint: "Skumulowana nigdy nie maleje.", why: "Skumulowana tylko rośnie i kończy się na 100%; dla rozkładu normalnego tworzy literę S." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  4. KSZTAŁT ROZKŁADU: SKOŚNOŚĆ I KURTOZA
// ════════════════════════════════════════════════════════════════════════════
const SKEW = {
  right: { name: "prawostronna (dodatnia)", order: "Mo < Me < M" },
  left: { name: "lewostronna (ujemna)", order: "M < Me < Mo" },
  sym: { name: "brak — rozkład symetryczny", order: "M = Me = Mo" },
};
function skewHeights(kind) {
  const j = (x) => Math.max(1, x + ri(-1, 1));
  if (kind === "sym") {
    const half = [ri(1, 2), ri(3, 4), ri(5, 7), ri(8, 9)];
    const top = ri(10, 11);
    return [...half, top, ...half.slice().reverse()];
  }
  const base = [3, 9, 11, 8, 6, 4, 3, 2, 1, 1].map(j);
  base[2] = Math.max(...base) + 1;
  return kind === "right" ? base : base.reverse();
}
const shapeHist = {
  id: "shape-hist", topic: "shape", title: "Skośność z histogramu",
  make() {
    const kind = pick(["right", "right", "left", "left", "sym"]);
    const h = skewHeights(kind), x0 = ri(5, 40);
    const variant = Math.random() < 0.6 ? "name" : "mean";
    const fig = histSvg(h.map((_, i) => x0 + i), h);
    if (variant === "name") {
      const keys = ["right", "left", "sym"];
      return {
        q: "Jaka jest skośność tego rozkładu?", fig,
        choices: keys.map((k) => SKEW[k].name), correct: keys.indexOf(kind),
        hint: "„Ciągniemy rozkład za ogonek” — nazwę skośności daje długi ogon, nie górka.",
        why: kind === "sym" ? "Lewa połowa jest lustrem prawej — rozkład symetryczny." :
          `Długi ogon jest po ${kind === "right" ? "prawej (w stronę wysokich wyników)" : "lewej (w stronę niskich wyników)"}, więc skośność ${SKEW[kind].name}. ` +
          `Szczyt jest po ${kind === "right" ? "lewej" : "prawej"} — to pułapka, nazwę daje ogon.`,
      };
    }
    const opts = ["średnia większa od mediany (M > Me)", "średnia mniejsza od mediany (M < Me)", "średnia ≈ mediana"];
    const corr = { right: 0, left: 1, sym: 2 }[kind];
    return {
      q: "Jak położona jest średnia względem mediany w tym rozkładzie?", fig,
      choices: opts, correct: corr,
      hint: "Średnia „ucieka” w stronę ogona, bo bierze pod uwagę każdy (także skrajny) wynik.",
      why: kind === "sym" ? "W rozkładzie symetrycznym M = Me = Mo." :
        `Ogon jest po ${kind === "right" ? "prawej" : "lewej"}, średnia przesuwa się w jego stronę: ${SKEW[kind].order}.`,
    };
  },
};

const shapeStats = {
  id: "shape-stats", topic: "shape", title: "Skośność z miar tendencji centralnej",
  make() {
    const kind = pick(["right", "left", "sym"]);
    const me = ri(20, 60);
    const m = kind === "right" ? me + ri(3, 9) : kind === "left" ? me - ri(3, 9) : me;
    const ctx = pick([
      { t: "czas reakcji (ms)", s: 10 }, { t: "wynik testu wiedzy", s: 1 }, { t: "dochód (w setkach zł)", s: 10 }, { t: "liczba objawów", s: 1 },
    ]);
    const keys = ["right", "left", "sym"];
    return {
      q: `Zmienna: ${ctx.t}. Średnia M = ${m * ctx.s}, mediana Me = ${me * ctx.s}. Jaka jest skośność rozkładu?`,
      choices: keys.map((k) => SKEW[k].name), correct: keys.indexOf(kind),
      hint: "Średnia jest „ciągnięta” w stronę długiego ogona.",
      why: kind === "sym" ? "M = Me — brak oznak asymetrii." :
        `M ${kind === "right" ? ">" : "<"} Me: średnią ${kind === "right" ? "zawyżają nieliczne wysokie" : "zaniżają nieliczne niskie"} wyniki, więc ogon jest po ${kind === "right" ? "prawej" : "lewej"} → ${SKEW[kind].name}. Kolejność: ${SKEW[kind].order}.`,
    };
  },
};

const shapeKurt = {
  id: "shape-kurt", topic: "shape", title: "Kurtoza: lepto / mezo / platy",
  make() {
    const kind = pick(["lepto", "platy", "lepto", "platy", "mezo"]);
    const beta = { lepto: 1, mezo: 2, platy: 7 }[kind];
    const opts = ["leptokurtyczny, kurtoza > 0", "platykurtyczny, kurtoza < 0", "mezokurtyczny, kurtoza ≈ 0", "leptokurtyczny, kurtoza < 0"];
    const corr = { lepto: 0, platy: 1, mezo: 2 }[kind];
    const order = shuffle([0, 1, 2, 3]);
    return {
      q: "Linia ciągła to badany rozkład, przerywana — rozkład normalny (ta sama wariancja). Jaki to rozkład?",
      fig: kurtSvg(beta),
      choices: order.map((i) => opts[i]), correct: order.indexOf(corr),
      hint: "Lepto = „lepi się do środka”, skacze w górę. Platy = płaski jak dziobak (platypus). Mezo = jak normalny.",
      why: { lepto: "Wyższy, węższy szczyt (i grubsze ogony) niż w normalnym → leptokurtyczny, kurtoza dodatnia.",
        platy: "Płaski, szeroki wierzchołek w porównaniu z normalnym → platykurtyczny, kurtoza ujemna.",
        mezo: "Kształt pokrywa się z normalnym → mezokurtyczny, kurtoza ≈ 0." }[kind] +
        " Kurtoza jest cechą względną — zawsze w porównaniu z rozkładem normalnym.",
    };
  },
};

const shapeConcept = bankGen("shape-concept", "shape", "Pojęcia: cechy rozkładu", [
  { q: "Szczyt rozkładu jest po lewej stronie, a długi ogon ciągnie się w prawo. Jaka to skośność?",
    a: ["Prawostronna (dodatnia)", "Lewostronna (ujemna)", "Brak skośności", "Leptokurtyczna"],
    hint: "Nazwę daje ogon!", why: "Szczyt po lewej = ogon po prawej = skośność prawostronna. Częsty błąd to patrzenie na górkę." },
  { q: "Bardzo łatwy egzamin: prawie wszyscy dostali dużo punktów, kilka osób bardzo mało. Jaki rozkład wyników?",
    a: ["Skośny lewostronnie (ujemnie)", "Skośny prawostronnie (dodatnio)", "Symetryczny", "Platykurtyczny"],
    hint: "Gdzie jest ogon — po stronie niskich czy wysokich wyników?", why: "Ogon po stronie niskich wyników (w lewo) → skośność lewostronna. Średnia < mediana." },
  { q: "Która cecha rozkładu jest względna (zawsze opisywana w porównaniu z rozkładem normalnym)?",
    a: ["Kurtoza", "Skośność", "Tendencja centralna", "Liczebność"],
    hint: "Mezo-, lepto-, platy- … względem czego?", why: "Kurtoza jest względna (vs normalny). Skośność to cecha bezwzględna — rozkład jest symetryczny albo nie." },
  { q: "Które zdanie o rozkładzie normalnym jest prawdziwe?",
    a: ["Jest symetryczny i M = Me = Mo", "Średnia jest zawsze większa od mediany", "Ma dwie dominanty", "Jest skośny prawostronnie"],
    hint: "Dzwon Gaussa — lewa połowa to lustro prawej.", why: "Rozkład normalny jest symetryczny, więc średnia, mediana i dominanta leżą w środku." },
  { q: "Grupa A ma wyniki rozrzucone od 10 do 90, grupa B od 40 do 60, obie mają kształt dzwonu Gaussa. Czym się różnią?",
    a: ["Zmiennością (rozproszeniem), nie kurtozą", "Kurtozą — B jest leptokurtyczna", "Skośnością", "Tendencją centralną"],
    hint: "Nie myl kurtozy ze zmiennością.", why: "Oba rozkłady mają kształt normalny (mezokurtyczny); różnią się szerokością rozrzutu, czyli zmiennością." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  5. ESTYMATORY I ICH CECHY
// ════════════════════════════════════════════════════════════════════════════
const estTarget = {
  id: "est-target", topic: "estim", title: "Obciążenie i skuteczność z wykresu",
  make() {
    const biased = Math.random() < 0.5, eff = Math.random() < 0.5;
    const bias = biased ? pick([-1, 1]) * (1.6 + Math.random() * 0.6) : 0;
    const xs = exactNormals(18, bias, eff ? 0.28 : 1.25);
    const opts = ["nieobciążony i skuteczny", "nieobciążony, mało skuteczny", "obciążony, ale skuteczny", "obciążony i mało skuteczny"];
    const corr = (biased ? 2 : 0) + (eff ? 0 : 1);
    return {
      q: "Badanie powtórzono 18 razy w tych samych warunkach; kropki to oszacowania z kolejnych powtórzeń, pionowa linia to prawdziwy parametr μ. Jaki to estymator?",
      fig: dotsSvg([{ label: "", xs }]),
      choices: opts, correct: corr,
      hint: "Obciążenie = czy kropki są systematycznie przesunięte względem μ. Skuteczność = jak ciasno są skupione.",
      why: `Środek chmury kropek ${biased ? `jest przesunięty ${bias > 0 ? "w prawo (przeszacowuje)" : "w lewo (niedoszacowuje)"} — błąd systematyczny, czyli obciążenie` : "leży na μ — błędy są losowe, estymator nieobciążony"}. ` +
        `Rozrzut jest ${eff ? "mały → skuteczny" : "duży → mało skuteczny"}. Jak rzutki: ${biased && eff ? "ciasna grupka obok celu (C)" : biased ? "rozrzucone i obok celu (A)" : eff ? "ciasna grupka w środku (D — ideał)" : "wokół środka, ale szeroko (B)"}.`,
    };
  },
};

const estConsist = {
  id: "est-consist", topic: "estim", title: "Zgodność: mała i duża próba",
  make() {
    const bigFirst = Math.random() < 0.5;
    const small = exactNormals(16, 0, 1.6), big = exactNormals(16, 0, 1.6 / Math.sqrt(10));
    const rows = bigFirst ? [{ label: "A", xs: big }, { label: "B", xs: small }] : [{ label: "A", xs: small }, { label: "B", xs: big }];
    const ans = bigFirst ? "A" : "B", other = bigFirst ? "B" : "A";
    const opts = [`${ans} — to pokazuje zgodność estymatora`, `${other} — to pokazuje zgodność estymatora`, `${ans} — to pokazuje obciążenie estymatora`, `${other} — to pokazuje odporność estymatora`];
    const order = shuffle([0, 1, 2, 3]);
    return {
      q: "Dwa badania tą samą metodą (średnia z próby), każde powtórzone 16 razy. W jednym n = 100, w drugim n = 1000. Które to n = 1000 i jaką cechę estymatora to ilustruje?",
      fig: dotsSvg(rows),
      choices: order.map((i) => opts[i]), correct: order.indexOf(0),
      hint: "Im większa próba, tym oszacowania bliżej μ…",
      why: `W ${ans} oszacowania są dużo ciaśniej wokół μ — to większa próba. Estymator zgodny: im większe n, tym oszacowania bardziej skupione wokół parametru („nie ma darmowej kawki”).`,
    };
  },
};

const estScenario = bankGen("est-scenario", "estim", "Która cecha estymatora?", [
  () => { const a = ri(24, 30), b = a + ri(8, 15);
    return { q: `Do 17 pacjentów dopisano osiemnastego z wynikiem 150. Estymator zmienił się z ${a} na ${b}. Której cechy mu brakuje?`,
      a: ["Odporności", "Nieobciążoności", "Zgodności", "Wyczerpującości"], hint: "Jak estymator znosi wartości skrajne?",
      why: "Jeden skrajny wynik mocno przesunął oszacowanie — estymator jest nieodporny (tak zachowuje się średnia)." }; },
  () => { const e = ri(2, 6);
    return { q: `W tysiącu symulowanych badań estymator daje średnio o ${e} pkt więcej niż prawdziwe μ — zawsze w tę samą stronę. Co to znaczy?`,
      a: ["Jest obciążony", "Jest mało skuteczny", "Jest niezgodny", "Jest nieodporny"], hint: "Błąd losowy czy systematyczny?",
      why: "Systematyczne przeszacowanie = obciążenie. Nieobciążony estymator myli się losowo — raz w górę, raz w dół." }; },
  () => { const s = ri(6, 12);
    return { q: `Przy n = 30 oszacowania z powtórzeń wahają się ±${s} pkt wokół μ, a przy n = 3000 tylko ±${fmt(s / 10, 1)} pkt. Jaka cecha?`,
      a: ["Zgodność", "Skuteczność", "Odporność", "Wyczerpującość"], hint: "Co się zmienia — estymator czy wielkość próby?",
      why: "Ten sam estymator, większa próba → oszacowania bliżej μ. To zgodność." }; },
  { q: "Estymatory A i B są nieobciążone. Oszacowania A z powtórzeń są skupione ciaśniej niż B (przy tym samym n). Co powiesz?",
    a: ["A jest skuteczniejszy od B", "A jest zgodny, B nie", "B jest obciążony", "A jest odporniejszy"], hint: "Rozrzut przy tym samym n — to porównanie…",
    why: "Mniejszy rozrzut = większa skuteczność (efektywność). To cecha względna: A jest skuteczniejszy niż B." },
  { q: "Estymator patrzy tylko na jedną lub dwie środkowe wartości uporządkowanych danych. Której cechy nie ma?",
    a: ["Wyczerpującości", "Nieobciążoności", "Zgodności", "Odporności"], hint: "Czy wykorzystuje całą informację z danych?",
    why: "Tak działa mediana: ignoruje resztę wartości, więc nie jest wyczerpująca — ale dzięki temu jest odporna." },
]);

const estMeasure = bankGen("est-measure", "estim", "Średnia, mediana czy dominanta?", [
  { q: "Która miara jest wyczerpująca i najbardziej skuteczna, ale nieodporna?", a: ["Średnia", "Mediana", "Dominanta", "Rozstęp"],
    hint: "Bierze pod uwagę każdy wynik — także skrajne.", why: "Średnia: nieobciążona, skuteczna, zgodna, wyczerpująca, ale nieodporna." },
  { q: "Która miara jest odporna, ale niewyczerpująca i mniej skuteczna od średniej?", a: ["Mediana", "Średnia", "Dominanta", "Suma"],
    hint: "Wartość środkowa w kolejce.", why: "Mediana: odporna na skrajne wyniki, bo patrzy tylko na środek — przez to niewyczerpująca i mniej skuteczna." },
  { q: "Która miara istnieje tylko w rozkładzie jednomodalnym i jest stosowana bardzo rzadko?", a: ["Dominanta", "Mediana", "Średnia", "Rozstęp"],
    hint: "Wartość najczęstsza.", why: "Dominanta — gdy kilka wartości występuje równie często (rozkład wielomodalny), nie ma dominanty." },
  { q: "Dlaczego średnia jest nieodporna?", a: ["Bo jest wyczerpująca — uwzględnia każdy wynik, także skrajne", "Bo jest obciążona", "Bo jest mało skuteczna", "Bo wymaga uporządkowania danych"],
    hint: "Demokracja bezpośrednia: każdy głos się liczy…", why: "Skoro używa każdego wyniku, kilka skrajnych może ją mocno przesunąć. Wyczerpujący estymator często jest nieodporny." },
  { q: "Co to jest x̄, a co μ?", a: ["x̄ — statystyka z próby (oszacowanie), μ — parametr populacji (zwykle nieznany)", "x̄ — parametr populacji, μ — statystyka z próby", "Oba to średnie z próby", "μ to mediana, x̄ to średnia"],
    hint: "Zupa: łyżka (próba) vs cały garnek (populacja).", why: "μ = prawdziwa wartość w populacji; x̄ = wartość policzona z próby, którą szacujemy μ." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  6. ŚREDNIA, MEDIANA, DOMINANTA, ROZSTĘP
// ════════════════════════════════════════════════════════════════════════════
const ctMean = {
  id: "ct-mean", topic: "central", title: "Średnia krok po kroku",
  make() {
    const n = ri(5, 9), d = Array.from({ length: n }, () => ri(5, 40));
    const s = sum(d), m = s / n;
    return {
      q: `Wyniki: ${list(d)}. Policz sumę, n i średnią (do 0,01).`,
      fields: [
        { label: "Σ X", ans: s, d: 0 },
        { label: "n", ans: n, d: 0 },
        { label: XBAR, ans: m, d: 2, traps: [[median(d), "To mediana — średnia to Σ X / n."]] },
      ],
      hint: `${XBAR} = Σ X<sub>i</sub> / n`,
      why: steps([`Σ X = ${d.join(" + ")} = <b>${s}</b>`, `n = <b>${n}</b>`, `${XBAR} = ${s} / ${n} = <b>${fmt(m, 2)}</b>`]),
    };
  },
};

const ctMedian = {
  id: "ct-median", topic: "central", title: "Mediana krok po kroku",
  make() {
    const n = ri(6, 11);
    let d;
    do { d = Array.from({ length: n }, () => ri(1, 50)); } while (median(d) === d[Math.floor((n - 1) / 2)]);
    const pos = (n + 1) / 2, me = median(d), s = sorted(d);
    const unsortedMid = n % 2 ? d[(n - 1) / 2] : (d[n / 2 - 1] + d[n / 2]) / 2;
    return {
      q: `Wyniki: ${list(d)}. Podaj pozycję mediany i medianę.`,
      fields: [
        { label: "pozycja (n+1)/2", ans: pos, d: 1, traps: [[n / 2, "Pozycja mediany to (n + 1) / 2, nie n / 2."]] },
        { label: "Me", ans: me, d: 1, traps: [[unsortedMid, "To środek nieuporządkowanej listy — najpierw uporządkuj dane rosnąco!"], [sum(d) / n, "To średnia — mediana to wartość środkowa."]] },
      ],
      hint: "1) Uporządkuj rosnąco. 2) Pozycja = (n + 1) / 2. 3) Jeśli wyjdzie „,5” — średnia dwóch sąsiednich wartości.",
      why: steps([
        `Uporządkowane: ${list(s.map((x, i) => (n % 2 ? i === (n - 1) / 2 : i === n / 2 - 1 || i === n / 2) ? `<b>${x}</b>` : x))}`,
        `n = ${n} → pozycja (${n} + 1) / 2 = <b>${fmt(pos, 1)}</b>`,
        n % 2 ? `${pos}. wartość = <b>${me}</b>` : `średnia ${n / 2}. i ${n / 2 + 1}. wartości: (${s[n / 2 - 1]} + ${s[n / 2]}) / 2 = <b>${fmt(me, 1)}</b>`,
      ]),
    };
  },
};

const ctMode = {
  id: "ct-mode", topic: "central", title: "Dominanta (czy w ogóle jest?)",
  make() {
    const tie = Math.random() < 0.4;
    const vals = shuffle(Array.from({ length: 20 }, (_, i) => 10 + i)).slice(0, ri(4, 5));
    const counts = vals.map(() => ri(1, 2));
    counts[0] = 3 + ri(0, 1);
    if (tie) counts[1] = counts[0];
    const data = shuffle(vals.flatMap((v, i) => Array(counts[i]).fill(v)));
    const cands = shuffle(vals.slice(0, 3));
    const opts = [...cands.map((v) => `Mo = ${v}`), "brak dominanty (rozkład wielomodalny)"];
    return {
      q: `Wyniki: ${list(data)}. Ile wynosi dominanta?`,
      choices: opts, correct: tie ? 3 : cands.indexOf(vals[0]),
      hint: "Dominanta = wartość najczęstsza. Istnieje tylko, gdy jedna wartość wyraźnie przoduje (rozkład jednomodalny).",
      why: table(["Wynik", "Ile razy"], sorted(vals).map((v) => ({ cells: [v, counts[vals.indexOf(v)]], cls: counts[vals.indexOf(v)] === counts[0] ? "is-hl" : "" }))) +
        (tie ? `Wartości ${sorted(vals.slice(0, 2)).join(" i ")} występują po ${counts[0]} razy → rozkład wielomodalny, <b>brak dominanty</b> (jak 24, 25 i 26 u 17 pacjentów z wykładu).`
          : `Najczęściej (${counts[0]} razy) występuje ${vals[0]} → <b>Mo = ${vals[0]}</b>.`),
    };
  },
};

const ctOutlier = {
  id: "ct-outlier", topic: "central", title: "Wynik skrajny: średnia vs mediana",
  make() {
    const n = pick([5, 7, 9]);
    const d = Array.from({ length: n }, () => ri(10, 30));
    const out = ri(80, 150);
    const d2 = [...d, out];
    const m1 = sum(d) / n, me1 = median(d), m2 = sum(d2) / (n + 1), me2 = median(d2);
    return {
      q: `Wyniki: ${list(d)} (M = ${fmt(m1, 2)}, Me = ${fmt(me1, 1)}).<br>Dopisujemy osobę z wynikiem <b>${out}</b>. Podaj nową średnią (do 0,01) i nową medianę.`,
      fields: [
        { label: "nowa M", ans: m2, d: 2, traps: [[(sum(d) + out) / n, `Po dopisaniu jest ${n + 1} osób — podziel przez ${n + 1}.`]] },
        { label: "nowa Me", ans: me2, d: 1, traps: [[(me1 + out) / 2, "Mediana to wartość środkowa uporządkowanych danych — nie uśredniamy jej z nowym wynikiem."]] },
      ],
      hint: `Nowe n = ${n + 1} (parzyste) → pozycja mediany ${fmt((n + 2) / 2, 1)}.`,
      why: steps([
        `M = (${sum(d)} + ${out}) / ${n + 1} = <b>${fmt(m2, 2)}</b> — zmiana o ${fmt(m2 - m1, 2)}.`,
        `Uporządkowane: ${list(sorted(d2))}; pozycja ${fmt((n + 2) / 2, 1)} → Me = <b>${fmt(me2, 1)}</b> — zmiana tylko o ${fmt(me2 - me1, 1)}.`,
        "Średnia (wyczerpująca) jest nieodporna, mediana — odporna na wartości skrajne.",
      ]),
    };
  },
};

const ctFreqMean = {
  id: "ct-freqmean", topic: "central", title: "Średnia z tabeli liczebności",
  make() {
    const k = 4, lo = ri(1, 10);
    const vals = Array.from({ length: k }, (_, i) => lo + i * ri(1, 2));
    const f = vals.map(() => ri(1, 7));
    const n = sum(f), s = sum(vals.map((v, i) => v * f[i]));
    return {
      q: `Rozkład liczebności:` + table(["Wynik X", "f"], vals.map((v, i) => [v, f[i]])) + `Policz średnią (do 0,01).`,
      fields: [{ label: XBAR, ans: s / n, d: 2, traps: [[sum(vals) / k, "To średnia z samych wartości — każdą trzeba „zważyć” liczbą osób f."]] }],
      hint: `${XBAR} = Σ (f · X) / Σ f`,
      why: steps([`Σ f·X = ${vals.map((v, i) => `${f[i]}·${v}`).join(" + ")} = ${s}`, `n = Σ f = ${n}`, `${XBAR} = ${s} / ${n} = <b>${fmt(s / n, 2)}</b>`]),
    };
  },
};

const ctError = {
  id: "ct-error", topic: "central", title: "Znajdź błąd w rozwiązaniu",
  make() {
    const v = pick(["unsorted", "round", "freq"]);
    const errs = {
      unsorted: "Nie uporządkowała danych przed szukaniem środka",
      round: "Przy pozycji z „,5” wzięła jedną wartość zamiast średniej dwóch sąsiednich",
      freq: "Nie uwzględniła liczebności — policzyła średnią z samych wartości",
      posn: "Pozycję mediany liczyła jako n / 2",
    };
    let q, ans, why, d;
    if (v === "unsorted") {
      const n = pick([5, 7, 9]);
      do { d = Array.from({ length: n }, () => ri(1, 40)); } while (d[(n - 1) / 2] === median(d));
      q = `Ola szuka mediany danych ${list(d)}: „n = ${n}, pozycja ${(n + 1) / 2}, więc Me = ${d[(n - 1) / 2]}”.`;
      ans = median(d);
      why = `Uporządkowane: ${list(sorted(d))} → ${(n + 1) / 2}. wartość = <b>${ans}</b>.`;
    } else if (v === "round") {
      const n = pick([6, 8]);
      do { d = sorted(Array.from({ length: n }, () => ri(1, 40))); } while (d[n / 2 - 1] === d[n / 2]);
      q = `Ola szuka mediany danych ${list(d)}: „n = ${n}, pozycja ${fmt((n + 1) / 2, 1)}, zaokrąglam do ${n / 2 + 1}, więc Me = ${d[n / 2]}”.`;
      ans = median(d);
      why = `Pozycja ${fmt((n + 1) / 2, 1)} → średnia ${n / 2}. i ${n / 2 + 1}. wartości: (${d[n / 2 - 1]} + ${d[n / 2]}) / 2 = <b>${fmt(ans, 1)}</b>.`;
    } else {
      const vals = [ri(2, 5), 0, 0].map((x, i, a) => (i ? a[0] + i * 2 : x));
      const f = [ri(4, 8), ri(1, 3), 1];
      const n = sum(f), s = sum(vals.map((x, i) => x * f[i]));
      q = `Ola liczy średnią z tabeli: ${vals.map((x, i) => `wynik ${x} — ${f[i]} os.`).join("; ")}. „(${vals.join(" + ")}) / 3 = ${fmt(sum(vals) / 3, 2)}”.`;
      ans = s / n;
      why = `Każdy wynik mnożymy przez liczbę osób: (${vals.map((x, i) => `${f[i]}·${x}`).join(" + ")}) / ${n} = ${s} / ${n} = <b>${fmt(ans, 2)}</b>.`;
    }
    const keys = shuffle(Object.keys(errs).filter((k) => k !== v)).slice(0, 2);
    const order = shuffle([v, ...keys]);
    return {
      q: q + "<br>Na czym polega błąd i jaki jest poprawny wynik?",
      choices: order.map((k) => errs[k]), correct: order.indexOf(v),
      fields: [{ label: "poprawny wynik", ans, d: 2 }],
      hint: "Przejdź samodzielnie wszystkie kroki: uporządkuj → pozycja (n + 1)/2 → odczyt; a dla tabeli Σ f·X / Σ f.",
      why,
    };
  },
};

const ctRange = {
  id: "ct-range", topic: "central", title: "Rozstęp",
  make() {
    const n = ri(6, 10), d = Array.from({ length: n }, () => ri(5, 60));
    const mx = Math.max(...d), mn = Math.min(...d);
    return {
      q: `Wyniki: ${list(d)}. Ile wynosi rozstęp?`,
      fields: [{ label: "rozstęp", ans: mx - mn, d: 0, traps: [[d[d.length - 1] - d[0], "To różnica ostatniej i pierwszej liczby z listy — potrzebne są największa i najmniejsza wartość."]] }],
      hint: "rozstęp = max − min",
      why: `max = ${mx}, min = ${mn} → rozstęp = ${mx} − ${mn} = <b>${mx - mn}</b>. Ta sama średnia może iść w parze z bardzo różnym rozrzutem — dlatego potrzebne są miary rozproszenia.`,
    };
  },
};

const ctChoose = bankGen("ct-choose", "central", "Którą miarę wybrać?", [
  { q: "GUS podaje „średni dochód”, a większość ludzi zarabia mniej. Jaką miarę lepiej podać, by opisać typowego człowieka?",
    a: ["Medianę", "Średnią", "Dominantę", "Rozstęp"], hint: "Dochody mają długi prawy ogon.",
    why: "Dochody są skośne prawostronnie — nieliczne bardzo wysokie zawyżają średnią. Mediana (połowa zarabia mniej, połowa więcej) jest odporna." },
  { q: "Czasy reakcji: większość 300–500 ms, ale kilka prób trwało ponad 3000 ms (ktoś się zamyślił). Która miara tendencji centralnej jest bezpieczniejsza?",
    a: ["Mediana", "Średnia", "Dominanta", "Suma czasów"], hint: "Wartości skrajne…", why: "Kilka skrajnie długich prób przesunie średnią; mediana je „wytrzyma”." },
  { q: "Wyniki testu mają symetryczny, jednomodalny rozkład bez wartości odstających. Jaką miarę wybierasz?",
    a: ["Średnią — wtedy wykorzystuje całą informację i jest najskuteczniejsza", "Medianę — zawsze jest lepsza", "Dominantę", "Żadną — trzeba podać rozstęp"],
    hint: "Kiedy wady średniej nie mają znaczenia?", why: "Bez skośności i odstających średnia jest najlepsza formalnie: nieobciążona, najbardziej skuteczna, wyczerpująca." },
  { q: "W rozkładzie skośnym prawostronnie, jak ułożą się średnia (M), mediana (Me) i dominanta (Mo)?",
    a: ["Mo < Me < M", "M < Me < Mo", "M = Me = Mo", "Me < Mo < M"], hint: "Średnia ucieka w stronę ogona.", why: "Ogon w prawo ciągnie średnią najdalej w prawo: Mo < Me < M." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  7. BRAKI DANYCH
// ════════════════════════════════════════════════════════════════════════════
const missConcept = bankGen("miss-concept", "missing", "Braki danych i imputacja", [
  { q: "W ankiecie o dochodach osoby najbogatsze częściej odmawiają odpowiedzi. Braki uzupełniono dominantą. Skutek?",
    a: ["Zaniżony obraz zamożności i sztucznie zawężona zmienność", "Dane są teraz kompletne i bezstronne", "Zawyżony obraz zamożności", "Brak wpływu — dominanta jest odporna"],
    hint: "Czy braki są losowe?", why: "Proces powstawania braków jest nielosowy. Wpisanie typowej wartości bogatym zaniża dochody i zmniejsza wariancję." },
  { q: "Kiedy imputacja (uzupełnianie braków) może działać dobrze?",
    a: ["Gdy braki powstają losowo (np. ktoś przeoczył pytanie)", "Zawsze, jeśli używamy dominanty", "Gdy braków jest dużo", "Gdy braki dotyczą głównie osób z wysokimi wynikami"],
    hint: "Proces losowy vs nielosowy.", why: "Imputacja działa tylko przy losowym procesie powstawania braków — a zwykle nie jest on losowy." },
  { q: "Jaka jest według twórców metod imputacji najlepsza metoda radzenia sobie z brakami danych?",
    a: ["Zrobić wszystko, żeby braków nie było", "Uzupełnić dominantą", "Uzupełnić medianą", "Usunąć osoby z najwyższymi wynikami"],
    hint: "Najlepszy brak to…", why: "Nawet dobre metody zawężają wariancję, złe psują dane. Najlepiej zapobiegać brakom." },
  { q: "Kolega: „Uzupełniam braki dominantą, bo wszyscy tak robią”. Co odpowiesz?",
    a: ["„Wszyscy tak robią” to nie argument — to jedna z najgorszych metod, bo braki zwykle nie są losowe", "Słusznie — dominanta jest odporna", "Lepsza byłaby średnia i wtedy wszystko jest w porządku", "To dobra metoda, jeśli braków jest mało"],
    hint: "Co wykładowca sądził o tej metodzie?", why: "Wykładowca: uzupełnianie dominantą to jedna z najgorszych metod; „wszyscy tak robią” nie jest argumentem naukowym." },
  { q: "Nieobecni na sprawdzianie to głównie nieprzygotowani uczniowie. Wpisujemy im najczęstszą ocenę klasy. Co się stanie ze średnią klasy?",
    a: ["Zostanie zawyżona", "Zostanie zaniżona", "Nie zmieni się", "Będzie dokładniejsza"],
    hint: "Jakie oceny dostaliby naprawdę?", why: "Braki są nielosowe (dotyczą słabszych). Wpisanie typowej oceny zawyża wynik klasy." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  TEMATY I SESJE
// ════════════════════════════════════════════════════════════════════════════
export const STAT_TOPICS = [
  { id: "sigma", title: "Zapis i operator Σ", sub: "Xᵢ, Xᵢⱼ, sumowanie, n i N", icon: "Σ",
    gens: [sigIndex, sigRead, sigRange, sigRange, sigDouble, sigFreq, sigConcept, sigConcept] },
  { id: "freq", title: "Rozkład liczebności", sub: "f, procent, skumulowane, błędy w tabeli", icon: "▤",
    gens: [freqBuild, freqPct, freqCumInterp, freqCumInterp, freqError, freqBuild, freqConcept, freqConcept] },
  { id: "classes", title: "Przedziały klasowe i histogram", sub: "granice dokładne, środek, odczyt z wykresu", icon: "▥",
    gens: [clsBounds, clsBounds, clsCount, clsHist, clsConcept, clsConcept, clsConcept] },
  { id: "shape", title: "Skośność i kurtoza", sub: "kształt rozkładu z wykresu i z liczb", icon: "◠",
    gens: [shapeHist, shapeHist, shapeHist, shapeStats, shapeStats, shapeKurt, shapeKurt, shapeConcept, shapeConcept] },
  { id: "estim", title: "Estymatory i ich cechy", sub: "obciążenie, skuteczność, zgodność, odporność", icon: "◎",
    gens: [estTarget, estTarget, estConsist, estScenario, estScenario, estScenario, estMeasure, estMeasure] },
  { id: "central", title: "Średnia, mediana, dominanta", sub: "liczenie krok po kroku, błędy, wybór miary", icon: "x̄",
    gens: [ctMean, ctMedian, ctMedian, ctMode, ctOutlier, ctFreqMean, ctError, ctRange, ctChoose, ctChoose] },
  { id: "missing", title: "Braki danych", sub: "imputacja i jej pułapki", icon: "?",
    gens: [missConcept, missConcept, missConcept, missConcept] },
];
const ALL_GENS = [...new Map(STAT_TOPICS.flatMap((t) => t.gens).map((g) => [g.id, g])).values()];
export function genById(id) { return ALL_GENS.find((g) => g.id === id) || null; }
export function topicById(id) { return STAT_TOPICS.find((t) => t.id === id) || null; }
export const STAT_EXAM_SIZE = 14;
/** Test mieszany: po jednym zadaniu z losowych generatorów, przemieszane. */
export function examGens() { return shuffle(ALL_GENS).slice(0, STAT_EXAM_SIZE); }
export { shuffle as shuffleStats };
