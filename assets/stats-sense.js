// ============================================================================
//  stats-sense.js (moduł ES) — „Statystyka → Ćwiczenia": czy wynik jest w ogóle
//  realny? Zadania do prezentacji „Podstawy statystyki psychologicznej 2”
//  (rozkłady liczebności, miary tendencji centralnej i zmienności, rozkład
//  normalny, wyniki z, korelacja, regresja) + zagadnienia z listy na kolokwium.
//
//  Każde zagadnienie ma 3 generatory. Generator losuje dane i „wynik z raportu”
//  — czasem poprawny, częściej absurdalny — a student ocenia, czy da się go
//  obronić i DLACZEGO. Format jak w stats.js ({ q, fig?, choices, correct, hint, why })
//  + explain[i]: wyjaśnienie dla każdej odpowiedzi (dlaczego dobra / zła),
//  pokazywane po wyborze.
// ============================================================================
import { statsKit, fmt } from "./stats.js?v=33";

const { ri, pick, shuffle, sum, sorted, median, list, table, histSvg } = statsKit;
const f2 = (x) => fmt(x, 2), f1 = (x) => fmt(x, 1);
const mean = (a) => sum(a) / a.length;
const varN = (a) => { const m = mean(a); return sum(a.map((x) => (x - m) ** 2)) / a.length; };
const sdN = (a) => Math.sqrt(varN(a));
const nums = (n, lo, hi) => Array.from({ length: n }, () => ri(lo, hi));
const chance = (p) => Math.random() < p;
const countIf = (a, fn) => a.filter(fn).length;
const OK_P = 0.35; // jak często pokazany wynik jest poprawny
const G = (id, topic, title, make) => ({ id, topic, title, make });

/** Rozkład normalny: dystrybuanta Φ(z) (Abramowitz–Stegun 26.2.17, błąd < 1e-7). */
function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const p = 0.3989423 * Math.exp(-z * z / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
function gauss() { return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()); }
function pearson(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  const sxy = sum(xs.map((x, i) => (x - mx) * (ys[i] - my)));
  const sxx = sum(xs.map((x) => (x - mx) ** 2)), syy = sum(ys.map((y) => (y - my) ** 2));
  return sxy / Math.sqrt(sxx * syy || 1);
}
function fit(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  const b = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / (sum(xs.map((x) => (x - mx) ** 2)) || 1);
  return { b, a: my - b * mx, mx, my };
}
/** Kwartyle „z połówek”: Q1 = mediana dolnej połowy, Q3 = mediana górnej. */
function quart(a) {
  const s = sorted(a), n = s.length, h = Math.floor(n / 2);
  return { q1: median(s.slice(0, h)), q3: median(s.slice(n - h)), me: median(s) };
}
const eq = (b, a) => `<i>Y′</i> = ${f2(b)}·<i>X</i> ${a < 0 ? "−" : "+"} ${f2(Math.abs(a))}`;

/** Wykres rozrzutu (kolory z CSS — działa w obu motywach). */
function scatterSvg(pts, { xl = "X", yl = "Y" } = {}) {
  const W = 340, H = 220, PL = 34, PB = 26, PT = 12, PR = 10;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const X = (x) => PL + 6 + ((x - x0) / (x1 - x0 || 1)) * (W - PL - PR - 12);
  const Y = (y) => H - PB - 6 - ((y - y0) / (y1 - y0 || 1)) * (H - PB - PT - 12);
  let s = `<svg class="st-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres rozrzutu">`;
  s += `<line class="st-axis" x1="${PL}" y1="${H - PB}" x2="${W - 4}" y2="${H - PB}"/>`;
  s += `<line class="st-axis" x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}"/>`;
  s += `<text class="st-lbl" x="${X(x0)}" y="${H - 8}" text-anchor="middle">${f1(x0)}</text>`;
  s += `<text class="st-lbl" x="${X(x1)}" y="${H - 8}" text-anchor="middle">${f1(x1)}</text>`;
  s += `<text class="st-lbl" x="${PL - 4}" y="${Y(y0) + 4}" text-anchor="end">${f1(y0)}</text>`;
  s += `<text class="st-lbl" x="${PL - 4}" y="${Y(y1) + 4}" text-anchor="end">${f1(y1)}</text>`;
  s += `<text class="st-lbl st-lbl-axis" x="${(W + PL) / 2}" y="${H - 8}" text-anchor="middle">${xl}</text>`;
  s += `<text class="st-lbl st-lbl-axis" x="6" y="${PT + 10}">${yl}</text>`;
  pts.forEach(([x, y]) => { s += `<circle class="st-dot" cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="5"/>`; });
  return s + `</svg>`;
}

// ── Budowa pytań ─────────────────────────────────────────────────────────────
/**
 * Pytanie „czy wynik jest realny?”. Każda odpowiedź = [tekst, wyjaśnienie].
 *  ok    — czy pokazany wynik jest poprawny/realny,
 *  yes   — uzasadnienie „Tak” (gdy ok), no — prawdziwy powód odrzucenia (gdy !ok),
 *  wrong — fałszywe powody odrzucenia (zawsze błędne odpowiedzi).
 */
function judge(o) {
  const wrong = shuffle(o.wrong);
  const opts = o.ok
    ? [[...(o.yes || ["Tak — wynik jest realny", "Wynik zgadza się z danymi."]), true],
       ...wrong.slice(0, 3).map(([t, e]) => [t, e + " A sam wynik jest tu w porządku.", false])]
    : [[...o.no, true],
       [o.yesWrong || "Tak — wynik jest realny", "To się nie zgadza. " + o.no[1], false],
       ...wrong.slice(0, 2).map(([t, e]) => [t, e + " Wynik rzeczywiście jest błędny, ale z innego powodu.", false])];
  return mc(o, opts);
}
/** Zwykły wybór: opts[0] = poprawna, każda [tekst, wyjaśnienie]. */
function choice(o) { return mc(o, o.opts.map(([t, e], i) => [t, e, i === 0])); }
function mc(o, opts) {
  const sh = shuffle(opts);
  return { q: o.q, fig: o.fig, choices: sh.map((x) => x[0]), explain: sh.map((x) => x[1]),
    correct: sh.findIndex((x) => x[2]), hint: o.hint, why: o.why };
}
/** Bank pytań bez powtórzeń w sesji (jak bankGen w stats.js). item: { q, a: [[t, e], …] (a[0] poprawna), hint, why }. */
function bank(id, topic, title, items) {
  return G(id, topic, title, function (used) {
    const fresh = items.filter((_, i) => !(used && used.has(id + "#" + i)));
    const idx = items.indexOf(fresh.length ? pick(fresh) : pick(items));
    if (used) used.add(id + "#" + idx);
    const it = typeof items[idx] === "function" ? items[idx]() : items[idx];
    return it.ok !== undefined ? judge(it) : choice({ ...it, opts: it.a });
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  1. BADANIE: PRÓBA, POPULACJA, ZMIENNE
// ════════════════════════════════════════════════════════════════════════════
const badVar = bank("c-bad-var", "study", "Zmienna zależna czy niezależna?", [
  { q: "Badacz losowo dzieli studentów na grupy, które śpią 4, 6 albo 8 godzin, a potem mierzy wynik testu pamięci. W raporcie: „zmienna niezależna = wynik testu pamięci”. Czy to poprawne?",
    a: [["Nie — niezależna jest długość snu (ustala ją badacz), a wynik testu to zmienna zależna", "Badacz sam ustala długość snu, więc to zmienna niezależna; mierzony skutek (wynik testu) jest zmienną zależną."],
      ["Tak — to poprawne", "Role są zamienione: wynik testu jest mierzony i ma zależeć od snu — to zmienna zależna."],
      ["Nie — obie zmienne są zależne", "W eksperymencie jest zmienna, którą badacz ustala — tu długość snu — i ona jest niezależna."],
      ["Nie — wynik testu to zmienna uwikłana", "Zmienna uwikłana to trzecia zmienna zakłócająca związek, a nie mierzony wynik."]],
    hint: "Którą zmienną badacz ustala sam, a którą mierzy?", why: "Niezależna = ta, którą badacz manipuluje (długość snu). Zależna = ta, którą mierzy jako skutek (wynik testu pamięci)." },
  { q: "Sprawdzamy, czy głośna muzyka w tle obniża liczbę rozwiązanych zadań. Która zmienna jest zależna?",
    a: [["Liczba rozwiązanych zadań", "To mierzony efekt, który ma zależeć od warunków badania."],
      ["Głośność muzyki", "Głośność ustala badacz — to zmienna niezależna."],
      ["Wiek uczestników", "Wieku tu nie mierzymy jako efektu; mógłby co najwyżej być zmienną uwikłaną."],
      ["Obie naraz", "Zależna jest tylko zmienna mierzona jako skutek; głośność to przyczyna ustalana przez badacza."]],
    hint: "Co jest skutkiem, który mierzymy?", why: "Zależna = mierzony skutek (liczba zadań). Niezależna = głośność muzyki." },
  { q: "Grupa A pije kawę, grupa B wodę; potem mierzy się czas reakcji w ms. Student pisze: „zmienna zależna: rodzaj napoju, niezależna: czas reakcji”. Ocena?",
    a: [["Źle — odwrotnie: rodzaj napoju jest niezależny, czas reakcji zależny", "Badacz przydziela napój (przyczyna), a mierzy czas reakcji (skutek)."],
      ["Dobrze", "Role są odwrócone — mierzony wynik (czas reakcji) to zmienna zależna."],
      ["Źle — obie to zmienne uwikłane", "Uwikłana byłaby np. pora dnia albo zmęczenie — coś trzeciego, czego nie kontrolujemy."],
      ["Źle — czas reakcji to zmienna jakościowa", "Czas w ms to zmienna ilościowa (ciągła), ale to i tak nie zmienia ról zmiennych."]],
    hint: "Co przydziela badacz?", why: "Rodzaj napoju = zmienna niezależna (przydzielana). Czas reakcji = zmienna zależna (mierzona)." },
  { q: "Sprawdzamy, czy liczba godzin nauki wpływa na ocenę z kolokwium. Która zmienna jest niezależna?",
    a: [["Liczba godzin nauki", "To ją traktujemy jako przyczynę (predyktor) oceny."],
      ["Ocena z kolokwium", "Ocena to efekt, który mierzymy — zmienna zależna."],
      ["Numer indeksu studenta", "To tylko identyfikator osoby, nie badana zmienna."],
      ["Data kolokwium", "Jest taka sama dla wszystkich, więc w tym badaniu w ogóle nie jest zmienną."]],
    hint: "Co ma wpływać na co?", why: "Godziny nauki → ocena. Przyczyna (niezależna) to godziny nauki, skutek (zależna) to ocena." },
]);

const badConf = bank("c-bad-conf", "study", "Zmienna uwikłana", [
  { q: "W miesiącach, gdy sprzedaje się więcej lodów, więcej osób tonie. Która zmienna może być uwikłana?",
    a: [["Temperatura (pora roku)", "Upał zwiększa i sprzedaż lodów, i liczbę kąpieli — to on łączy obie zmienne."],
      ["Sprzedaż lodów", "To jedna z dwóch skorelowanych zmiennych, nie trzecia zmienna."],
      ["Liczba utonięć", "To druga ze skorelowanych zmiennych."],
      ["Cena lodów", "Cena nie wpływa na liczbę utonięć — nie wyjaśnia związku."]],
    hint: "Szukaj trzeciej zmiennej, która wpływa na obie.", why: "Zmienna uwikłana wpływa na obie badane zmienne i tworzy między nimi związek: lato/upał → lody i kąpiele." },
  { q: "U dzieci w wieku 6–12 lat większy rozmiar buta idzie w parze z lepszym czytaniem. Co jest zmienną uwikłaną?",
    a: [["Wiek dziecka", "Starsze dzieci mają większe stopy i dłużej uczą się czytać — wiek wpływa na obie zmienne."],
      ["Rozmiar buta", "To jedna z badanych zmiennych."],
      ["Umiejętność czytania", "To druga z badanych zmiennych."],
      ["Kolor butów", "Kolor nie jest związany ani z czytaniem, ani z rozmiarem."]],
    hint: "Co rośnie razem z dzieckiem?", why: "Wiek jest wspólną przyczyną: rosną stopy i rośnie umiejętność czytania." },
  { q: "Porównano wyniki testu w dwóch szkołach z różnymi metodami nauczania. Szkoła A jest w zamożnej dzielnicy, B w biednej. Wniosek: metoda A jest lepsza. Co może być zmienną uwikłaną?",
    a: [["Status materialny rodzin", "Lepsze wyniki w A mogą wynikać z warunków domowych, a nie z metody — oba czynniki idą w parze."],
      ["Metoda nauczania", "To zmienna niezależna, której wpływ badamy."],
      ["Wynik testu", "To zmienna zależna."],
      ["Liczba pytań w teście", "Test był ten sam w obu szkołach, więc nie różnicuje grup."]],
    hint: "Czym jeszcze różnią się szkoły?", why: "Metoda i zamożność rodzin zmieniają się razem — nie wiemy, który czynnik daje wynik. To zmienna uwikłana." },
  { q: "Osoby pijące dużo kawy częściej chorują na serce. Okazuje się, że częściej też palą papierosy. Jaką rolę gra palenie?",
    a: [["Zmiennej uwikłanej — może tłumaczyć związek kawy z chorobą", "Palenie idzie w parze z kawą i samo szkodzi sercu, więc może tworzyć pozorny związek."],
      ["Zmiennej zależnej", "Zależna jest tu choroba serca."],
      ["Żadnej — nie ma wpływu na wnioski", "Ma: bez kontroli palenia nie wiemy, czy szkodzi kawa, czy papierosy."],
      ["Zmiennej niezależnej, którą ustala badacz", "Badacz niczego tu nie ustala — to badanie korelacyjne, a palenie jest trzecią zmienną."]],
    hint: "Czy palenie łączy się z obiema zmiennymi?", why: "Palenie wiąże się i z kawą, i z chorobą serca — zakłóca badany związek (zmienna uwikłana)." },
]);

const badPop = bank("c-bad-pop", "study", "Próba a populacja", [
  { q: "Zbadano 40 studentów psychologii jednej uczelni: śpią średnio 6,2 h. Wniosek: „Polacy śpią średnio 6,2 h”. Czy wniosek jest uprawniony?",
    a: [["Nie — próba reprezentuje tylko studentów tej uczelni, nie wszystkich Polaków", "Wnioski uogólniamy tylko na populację, z której pobrano próbę."],
      ["Tak — 40 osób to wystarczająca próba", "Liczebność to nie wszystko — liczy się, z jakiej populacji pochodzi próba."],
      ["Tak — średnia z próby zawsze równa się średniej populacji", "Średnia z próby to tylko oszacowanie; zmienia się z badania na badanie."],
      ["Nie — ze średniej z próby nie wolno wnioskować o żadnej populacji", "Wolno — o populacji, z której losowano próbę (z uwzględnieniem błędu)."]],
    hint: "Kogo reprezentuje ta próba?", why: "Populacja = wszyscy, o których chcemy wnioskować. Tu próba pochodzi z wąskiej grupy, więc nie reprezentuje Polaków." },
  { q: "Średnia w losowej próbie 100 osób wynosi 52,3. Ktoś pisze: „średnia w populacji wynosi dokładnie 52,3”. Ocena?",
    a: [["Źle — to tylko oszacowanie; średnia populacji jest pewnie blisko, ale nie dokładnie 52,3", "Inna losowa próba dałaby trochę inną średnią — wynik z próby obarczony jest błędem."],
      ["Dobrze — próba była losowa", "Losowość chroni przed systematycznym błędem, ale nie usuwa zmienności próby."],
      ["Źle — średnia populacji musi być większa niż w próbie", "Może być większa albo mniejsza — nie znamy kierunku różnicy."],
      ["Źle — z próby nie da się nic powiedzieć o populacji", "Da się — właśnie po to losujemy próby, tylko z marginesem błędu."]],
    hint: "Czy druga próba dałaby to samo?", why: "Statystyka z próby szacuje parametr populacji, ale się od niego różni (zmienność próby)." },
  { q: "Wychowawczyni chce opisać tylko swoją klasę i bada wszystkich 25 uczniów. Ma próbę czy populację?",
    a: [["Populację — bada wszystkich, o których chce wnioskować", "Populacja to cała grupa, która nas interesuje; tu to dokładnie ta klasa."],
      ["Próbę, bo 25 osób to mało", "O tym, czy to populacja, decyduje cel wnioskowania, nie liczebność."],
      ["Próbę, bo zawsze badamy próbę", "Gdy badamy całą interesującą nas grupę, mamy populację."],
      ["Ani to, ani to", "To populacja — wszyscy, o których chce mówić."]],
    hint: "O kim chce wnioskować?", why: "Populacja zależy od pytania badawczego. Jeśli interesuje nas tylko ta klasa, 25 uczniów to cała populacja." },
  { q: "Ankietę o czytaniu książek rozesłano przez stronę klubu miłośników książek. 92% odpowiadających czyta co tydzień. Wniosek: „92% dorosłych czyta co tydzień”. Ocena?",
    a: [["Źle — próba jest stronnicza: odpowiadali głównie miłośnicy książek", "Sposób doboru próby zawyżył wynik — to nie jest próba z populacji dorosłych."],
      ["Dobrze — 92% to bardzo wyraźny wynik", "Wyraźny wynik w złej próbie nadal nic nie mówi o całej populacji."],
      ["Dobrze, jeśli odpowiedziało ponad 1000 osób", "Duża stronnicza próba to nadal stronnicza próba."],
      ["Źle — procentów nie wolno uogólniać", "Wolno, jeśli próba jest reprezentatywna."]],
    hint: "Kto odpowiadał na ankietę?", why: "Do uogólniania potrzebna jest próba reprezentatywna (najlepiej losowa) z populacji, o której mówimy." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  2. SKALE I RODZAJE ZMIENNYCH
// ════════════════════════════════════════════════════════════════════════════
const NOMINAL = [
  { v: "kolor oczu", c: ["niebieskie", "zielone", "piwne", "szare"] },
  { v: "kierunek studiów", c: ["psychologia", "pedagogika", "socjologia", "filologia"] },
  { v: "ulubiony gatunek muzyki", c: ["pop", "rock", "hip-hop", "jazz"] },
  { v: "województwo", c: ["pomorskie", "mazowieckie", "śląskie", "małopolskie"] },
];
const scNom = G("c-sc-nom", "scales", "Liczby jako etykiety", () => {
  const V = pick(NOMINAL);
  const counts = shuffle([ri(5, 7), ri(1, 3), ri(2, 4), ri(1, 2)]);
  const data = shuffle(counts.flatMap((c, i) => Array(c).fill(i + 1)));
  const mo = counts.indexOf(Math.max(...counts)), m = mean(data), ok = chance(0.4);
  return judge({ ok,
    q: `Zakodowano ${V.v}: ${V.c.map((c, i) => `${i + 1} = ${c}`).join(", ")}. Odpowiedzi ${data.length} osób: ${list(data)}.<br>Raport: ` +
      (ok ? `„najczęstszy ${V.v} (dominanta) to <b>${V.c[mo]}</b>”.` : `„średni ${V.v} wynosi <b>${f2(m)}</b>”.`) + " Czy to sensowny wynik?",
    yes: ["Tak — dla skali nominalnej sens ma dominanta, a ta kategoria występuje najczęściej", `Kod ${mo + 1} występuje ${counts[mo]} razy — najczęściej. W skali nominalnej to jedyna sensowna miara tendencji centralnej.`],
    no: ["Nie — to skala nominalna: liczby są tylko etykietami, więc średnia nic nie znaczy", `Kody można by nadać w innej kolejności i „średnia” wyszłaby inna. ${f2(m)} nie odpowiada żadnej kategorii — sens ma tylko dominanta (${V.c[mo]}).`],
    wrong: [
      ["Nie — średnia powinna wyjść liczbą całkowitą", "Średnia może być ułamkiem; kłopot leży gdzie indziej — w rodzaju skali."],
      ["Nie — przy danych zakodowanych liczbami trzeba podać medianę", "Mediana wymaga uporządkowania kategorii, a takich kategorii nie da się ułożyć od „mniejszej” do „większej”."],
      ["Nie — w skali nominalnej nie da się podać żadnej miary tendencji centralnej", "Da się — dominantę (najczęstszą kategorię)."],
      ["Nie — dominanta to liczba wystąpień, a nie kategoria", "Dominanta to wartość (kategoria), która występuje najczęściej; liczba wystąpień to jej liczebność f."],
    ],
    hint: "Co oznaczają liczby 1–4 w tych danych?",
    why: `Kody to tylko nazwy kategorii (skala nominalna). Liczebności: ${V.c.map((c, i) => `${c} ${counts[i]}`).join(", ")}. Sens ma tylko dominanta: <b>${V.c[mo]}</b>. Średnia z kodów (${f2(m)}) nie ma interpretacji.`,
  });
});

const RATIO = [
  { s: "ilorazowa", t: (a) => `Czas reakcji Ani: ${a * 10} ms, Bartka: ${a * 20} ms. „Bartek reagował dwa razy dłużej.”`, a: [20, 40] },
  { s: "ilorazowa", t: (a) => `Kasia rozwiązała ${a} zadań, Tomek ${2 * a}. „Tomek rozwiązał dwa razy więcej zadań.”`, a: [4, 15] },
  { s: "ilorazowa", t: (a) => `Paczka A waży ${a} kg, paczka B ${2 * a} kg. „Paczka B jest dwa razy cięższa.”`, a: [2, 12] },
  { s: "interwałowa", t: (a) => `Rano było ${a} °C, w południe ${2 * a} °C. „W południe było dwa razy cieplej.”`, a: [6, 14],
    no: "Nie — skala Celsjusza jest interwałowa: 0 °C to umowny punkt, a nie „brak temperatury”, więc ilorazy nie mają sensu",
    e: "W skali interwałowej sensowne są różnice (o 10 °C cieplej), ale nie ilorazy. W kelwinach te temperatury różnią się tylko o kilka procent." },
  { s: "interwałowa", t: (a) => `Ola ma IQ ${a * 10}, Piotr ${a * 20}. „Piotr jest dwa razy inteligentniejszy.”`, a: [5, 7],
    no: "Nie — IQ to skala interwałowa bez zera absolutnego: można porównywać różnice, ale nie ilorazy",
    e: "IQ = 0 nie oznacza „braku inteligencji”, więc „dwa razy więcej” nie ma sensu. Sensowne jest: Piotr ma wynik o X punktów wyższy." },
  { s: "porządkowa", t: (a) => `W rankingu Ola zajęła ${a}. miejsce, a Piotr ${2 * a}. „Piotr wypadł dwa razy gorzej.”`, a: [2, 8],
    no: "Nie — miejsce w rankingu to skala porządkowa: wiemy tylko, kto był wyżej, odległości między miejscami nie są równe",
    e: "Między 2. a 4. miejscem może być różnica 1 punktu albo 50 punktów — ranga mówi tylko o kolejności." },
  { s: "porządkowa", t: () => `Wykształcenie zakodowano: 1 = podstawowe, 2 = średnie, 3 = licencjat, 4 = magister. „Osoba z kodem 4 jest dwa razy bardziej wykształcona niż osoba z kodem 2.”`, a: [1, 1],
    no: "Nie — to skala porządkowa: kody tylko porządkują poziomy, nie mierzą „ilości wykształcenia”",
    e: "Kody 1–4 można by zastąpić dowolnymi rosnącymi liczbami (np. 1, 5, 6, 20) — iloraz zmieniłby się, a sens danych nie." },
];
const scRatio = G("c-sc-ratio", "scales", "„Dwa razy więcej” — czy wolno?", () => {
  const ok = chance(0.4);
  const V = pick(RATIO.filter((r) => (r.s === "ilorazowa") === ok)), a = ri(V.a[0], V.a[1]);
  return judge({ ok,
    q: `${V.t(a)}<br>Czy takie stwierdzenie ma sens?`,
    yesWrong: "Tak — stwierdzenie jest poprawne",
    yes: ["Tak — to skala ilorazowa (ma zero absolutne), więc stosunek wartości ma sens", "Zero oznacza tu brak cechy (0 ms, 0 zadań, 0 kg), więc wartość 2 razy większa naprawdę oznacza 2 razy więcej."],
    no: [V.no, V.e],
    wrong: [
      ["Nie — ilorazy mają sens tylko w skali nominalnej", "W skali nominalnej nie mają sensu nawet różnice. Ilorazy wymagają skali ilorazowej."],
      ["Nie — o „dwa razy więcej” można mówić tylko przy różnicy co najmniej 100 jednostek", "Iloraz nie zależy od wielkości różnicy, tylko od rodzaju skali."],
      ["Nie — porównywać wolno tylko wyniki tej samej osoby", "Porównywanie osób jest w porządku; pytanie dotyczy tego, czy skala pozwala liczyć ilorazy."],
      ...(ok ? [["Nie — zero na tej skali jest umowne", "Tu zero jest absolutne: 0 oznacza brak cechy."]] : []),
    ],
    hint: "Czy zero na tej skali oznacza brak cechy?",
    why: `Skala tej zmiennej: <b>${V.s}</b>. Ilorazy („dwa razy więcej”) mają sens tylko w skali ilorazowej — z zerem absolutnym. W interwałowej sensowne są różnice, w porządkowej tylko kolejność.`,
  });
});

const DISCRETE = [["liczba rodzeństwa", 0, 4], ["liczba błędów w teście", 0, 9], ["liczba wizyt w bibliotece w miesiącu", 0, 6]];
const scDiscrete = G("c-sc-disc", "scales", "Zmienna dyskretna i ciągła", () => {
  const [v, lo, hi] = pick(DISCRETE), n = ri(8, 12);
  let d; do { d = nums(n, lo, hi); } while (Number.isInteger(mean(d) * 10) && Number.isInteger(mean(d)));
  const kind = pick(["raw", "mean", "cont"]);
  if (kind === "raw") {
    const bad = ri(lo, hi - 1) + 0.5, i = ri(0, n - 1), shown = d.slice(); shown[i] = bad;
    return judge({ ok: false,
      q: `Arkusz z danymi surowymi — ${v} u ${n} osób: ${list(shown.map((x) => fmt(x, 1)))}. Czy taki zbiór danych może być poprawny?`,
      yesWrong: "Tak — dane mogą być poprawne",
      no: ["Nie — to zmienna dyskretna: pojedynczy wynik musi być liczbą całkowitą, a jest " + fmt(bad, 1), `${v[0].toUpperCase() + v.slice(1)} to liczenie (0, 1, 2…) — nie da się mieć ${fmt(bad, 1)}. To literówka albo błąd kodowania.`],
      wrong: [["Nie — w danych nie może być zer", "Zero jest tu zupełnie możliwe (np. brak rodzeństwa)."],
        ["Nie — dane muszą być ułożone rosnąco", "Dane surowe mogą być w dowolnej kolejności."],
        ["Nie — w danych nie mogą się powtarzać te same wartości", "Powtórzenia są normalne — z nich buduje się rozkład liczebności."]],
      hint: "Czy ta zmienna może przyjąć wartość ułamkową dla jednej osoby?",
      why: `Zmienna dyskretna przyjmuje tylko wartości oddzielone (tu całkowite). Wynik ${fmt(bad, 1)} u jednej osoby jest niemożliwy. Średnia z takiej zmiennej może być ułamkiem — pojedynczy wynik nie.`,
    });
  }
  if (kind === "mean") {
    return judge({ ok: true,
      q: `${v[0].toUpperCase() + v.slice(1)} u ${n} osób: ${list(d)}. Raport: „średnia = <b>${f2(mean(d))}</b>”. Czy to realny wynik?`,
      yes: ["Tak — pojedyncze wyniki są całkowite, ale średnia zmiennej dyskretnej może być ułamkiem", `Σ = ${sum(d)}, n = ${n} → ${f2(mean(d))}. Średnia „${f2(mean(d))}” nie musi być wartością możliwą u jednej osoby.`],
      wrong: [["Nie — średnia zmiennej dyskretnej musi być liczbą całkowitą", "Średnia to suma podzielona przez n — prawie nigdy nie wychodzi całkowita."],
        ["Nie — dla zmiennej dyskretnej nie wolno liczyć średniej", "To zmienna ilościowa (liczenie), więc średnia jest dozwolona."],
        ["Nie — średnia powinna być równa najczęstszej wartości", "To dominanta; średnia nie musi jej się równać."]],
      hint: "Czy średnia musi być jedną z możliwych wartości?",
      why: `Średnia = ${sum(d)} / ${n} = <b>${f2(mean(d))}</b>. Zmienna jest dyskretna (liczymy), ale jej średnia może być ułamkiem — „średnio 1,6 rodzeństwa” to poprawny opis grupy.`,
    });
  }
  const t = Array.from({ length: n }, () => ri(2800, 5200) / 10);
  return judge({ ok: true,
    q: `Czasy reakcji (ms) ${n} osób: ${list(t.map((x) => fmt(x, 1)))}. Czy wyniki z ułamkami są tu poprawne?`,
    yes: ["Tak — czas to zmienna ciągła: między dwiema wartościami zawsze może być kolejna", "Dokładność zależy tylko od przyrządu (tu 0,1 ms) — ułamki są naturalne."],
    wrong: [["Nie — wyniki pomiaru muszą być całkowite", "Dotyczy to tylko zmiennych dyskretnych (liczenie). Czas mierzymy, nie liczymy."],
      ["Nie — czas reakcji to zmienna jakościowa", "Czas to zmienna ilościowa, ciągła, na skali ilorazowej."],
      ["Nie — przy ułamkach nie da się policzyć średniej", "Średnią liczy się tak samo dla ułamków."]],
    hint: "Liczymy czy mierzymy?", why: "Czas reakcji jest zmienną ciągłą (skala ilorazowa). Zapisujemy go z dokładnością przyrządu, więc ułamki są poprawne.",
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  3. ROZKŁAD LICZEBNOŚCI: F skumulowane, % skumulowany, granice realne, rangi
// ════════════════════════════════════════════════════════════════════════════
const frCum = G("c-fr-cum", "freq", "Czy tabela liczebności się zgadza?", () => {
  const k = ri(5, 7), lo = ri(1, 5);
  const fs = Array.from({ length: k }, () => ri(2, 8));
  let F = 0; const Fs = fs.map((f) => (F += f)), N = F;
  const pc = Fs.map((x) => Math.round((x / N) * 1000) / 10);
  const err = chance(OK_P) ? "none" : pick(["drop", "end", "pct"]);
  const sF = Fs.slice(), sP = pc.slice();
  let row = -1;
  if (err === "drop") { row = ri(1, k - 2); sF[row] = fs[row]; if (sF[row] >= sF[row - 1]) sF[row] = sF[row - 1] - ri(1, 2); }
  if (err === "end") sF[k - 1] = N + ri(2, 4);
  if (err === "pct") sP[k - 1] = ri(84, 95);
  const rows = fs.map((f, i) => [lo + i, f, sF[i], fmt(sP[i], 1) + "%"]);
  const NO = {
    drop: ["Nie — liczebność skumulowana nie może maleć", `W wierszu ${lo + row} F spada z ${sF[row - 1]} do ${sF[row]}. F to „ile wyników do tej wartości włącznie” — może tylko rosnąć (tu ktoś wpisał f zamiast F).`],
    end: ["Nie — ostatnia liczebność skumulowana musi równać się N", `Suma f = ${N}, a ostatnie F = ${sF[k - 1]}. Do najwyższej wartości włącznie są wszystkie wyniki, więc F musi wynosić N.`],
    pct: ["Nie — ostatni procent skumulowany musi wynosić 100%", `Do najwyższej wartości włącznie są wszystkie wyniki, czyli 100%, a tabela podaje ${sP[k - 1]}%.`],
  };
  const WRONG = [
    ["Nie — liczebności f muszą rosnąć w dół tabeli", "f może rosnąć i maleć; rosnąć zawsze musi tylko F skumulowane."],
    ["Nie — procent skumulowany powinien maleć w dół tabeli", "Procent skumulowany rośnie aż do 100%."],
    ["Nie — F skumulowane powinno być w każdym wierszu równe f", "F = suma f do danego wiersza włącznie; równe f jest tylko w pierwszym wierszu."],
    ...Object.entries(NO).filter(([key]) => key !== err).map(([, [t]]) => [t, "W tej tabeli akurat ten warunek jest spełniony."]),
  ];
  return judge({ ok: err === "none",
    q: `Rozkład liczebności wyników (N podano tylko w tabeli). Czy tabela jest poprawna?`,
    fig: table(["X", "f", "F skum.", "% skum."], rows),
    yesWrong: "Tak — tabela jest poprawna",
    yes: ["Tak — F rośnie aż do N = suma f, a % skumulowany kończy się na 100%", `Suma f = ${N} = ostatnie F, a ${N}/${N} = 100%.`],
    no: NO[err] || ["", ""], wrong: WRONG,
    hint: "Sprawdź: czy F tylko rośnie? Czy ostatnie F = suma f? Czy ostatni % = 100?",
    why: `Poprawnie: f = ${fs.join(", ")}, F = ${Fs.join(", ")} (N = ${N}), % skum. = ${pc.map((x) => fmt(x, 1)).join(", ")}. Szybka kontrola każdej tabeli: F nie maleje, ostatnie F = N, ostatni % = 100%.`,
  });
});

const frLimits = G("c-fr-lim", "freq", "Granice realne przedziału", () => {
  const h = pick([3, 5, 10]), a = pick([10, 15, 20, 30, 40]) + ri(0, 3) * h, b = a + h - 1;
  const err = chance(OK_P) ? "none" : pick(["h", "same", "wide"]);
  const claim = { none: `granice realne ${fmt(a - 0.5, 1)}–${fmt(b + 0.5, 1)}, szerokość h = ${h}`,
    h: `granice realne ${fmt(a - 0.5, 1)}–${fmt(b + 0.5, 1)}, szerokość h = ${h - 1}`,
    same: `granice realne ${a}–${b}, szerokość h = ${h - 1}`,
    wide: `granice realne ${a - 1}–${b + 1}, szerokość h = ${h + 2}` }[err];
  const NO = {
    h: ["Nie — przedział obejmuje " + h + " wartości, więc h = " + h + ", nie " + (h - 1), `Wyniki ${a}, ${a + 1}, …, ${b} to ${h} liczb. Realna szerokość = (${fmt(b + 0.5, 1)}) − (${fmt(a - 0.5, 1)}) = ${h}; ${b} − ${a} = ${h - 1} to typowy błąd.`],
    same: ["Nie — granice realne leżą pół jednostki poza zapisanymi: " + fmt(a - 0.5, 1) + "–" + fmt(b + 0.5, 1), `Wynik ${b} to w rzeczywistości „od ${fmt(b - 0.5, 1)} do ${fmt(b + 0.5, 1)}”, więc przedział sięga ${fmt(b + 0.5, 1)}.`],
    wide: ["Nie — granice realne to ±0,5 jednostki, a nie ±1", `Przy wynikach całkowitych granica leży w połowie między sąsiednimi wartościami: ${fmt(a - 0.5, 1)} i ${fmt(b + 0.5, 1)}. Przy ±1 przedziały by na siebie nachodziły.`],
  };
  return judge({ ok: err === "none",
    q: `Wyniki są liczbami całkowitymi. W tabeli jest przedział <b>${a}–${b}</b>. W rozwiązaniu: „${claim}”. Czy to poprawne?`,
    yesWrong: "Tak — to poprawne",
    yes: ["Tak — granice realne są pół jednostki poza zapisanymi, a h = liczba wartości w przedziale", `${fmt(a - 0.5, 1)}–${fmt(b + 0.5, 1)}: przedział zawiera ${h} wartości (${a}…${b}), więc h = ${h}.`],
    no: NO[err] || ["", ""],
    wrong: [["Nie — granice realne są zawsze takie same jak zapisane", "Zapisane granice to tylko etykiety; realne leżą pół jednostki dalej."],
      ["Nie — szerokość przedziału to liczba wyników w przedziale (f)", "f to liczebność; szerokość h dotyczy skali, a nie liczby osób."],
      ["Nie — realna dolna granica jest o 1 mniejsza od zapisanej", "Różnica wynosi pół jednostki pomiaru (0,5), nie 1."]],
    hint: "Ile różnych wyników całkowitych mieści się w przedziale? Gdzie „kończy się” wynik " + b + "?",
    why: `Granice realne: <b>${fmt(a - 0.5, 1)} – ${fmt(b + 0.5, 1)}</b>, h = ${fmt(b + 0.5, 1)} − ${fmt(a - 0.5, 1)} = <b>${h}</b>. Granice realne są potrzebne np. do mediany z rozkładu liczebności (Lm i h ze wzoru).`,
  });
});

const frRank = G("c-fr-rank", "freq", "Ranga centylowa i punkt centylowy", () => {
  const n = 20, d = nums(n, 1, 10), s = sorted(d);
  if (chance(0.3)) {
    const mx = s[n - 1], ok = chance(0.4), claim = ok ? mx : s[ri(n - 6, n - 3)] < mx ? s[ri(n - 6, n - 3)] : mx - 1;
    return judge({ ok: ok || claim === mx,
      q: `Wyniki ${n} osób: ${list(d)}. Raport: „P<sub>100</sub> = <b>${claim}</b>”. Czy to możliwe?`,
      yes: ["Tak — P100 to zawsze najwyższa obserwacja", `Największy wynik w danych to ${mx}.`],
      no: ["Nie — P100 to zawsze najwyższa obserwacja, a tu najwyższy wynik to " + mx, `Poniżej P100 jest 100% wyników, więc musi to być największa wartość (${mx}), a nie ${claim}.`],
      wrong: [["Nie — P100 zawsze wynosi 100", "P100 to punkt na skali pomiaru (tu wynik), a nie procent."],
        ["Nie — P100 nie istnieje, centyle kończą się na P99", "W definicji z zajęć P100 to najwyższa obserwacja."],
        ["Nie — P100 to liczba osób w badaniu", "Liczba osób to N; centyl to wynik na skali."]],
      hint: "Ile procent wyników leży poniżej najwyższego wyniku?",
      why: `Punkt centylowy P<sub>k</sub> = wynik, poniżej którego leży k% obserwacji. Najwyższa obserwacja to P<sub>100</sub> = <b>${mx}</b>.`,
    });
  }
  const x = pick(s.slice(2, n - 2)), below = countIf(d, (v) => v < x), pr = Math.round((below / n) * 100);
  const ok = chance(OK_P);
  let claim = pr;
  if (!ok) claim = pr >= 50 ? ri(Math.max(3, pr - 70), Math.max(5, pr - 40)) : ri(Math.min(97, pr + 40), Math.min(98, pr + 70));
  return judge({ ok,
    q: `Wyniki ${n} osób: ${list(d)}. Raport: „ranga centylowa wyniku <b>${x}</b> wynosi <b>${claim}%</b>”. Czy to realne?`,
    yes: ["Tak — tyle mniej więcej wyników leży poniżej " + x, `Poniżej ${x} jest ${below} z ${n} wyników = ${pr}%.`],
    no: [`Nie — poniżej ${x} leży ${below} z ${n} wyników (ok. ${pr}%), a nie ${claim}%`, `Ranga centylowa = procent obserwacji poniżej danego wyniku. Wystarczy policzyć mniejsze od ${x}: jest ich ${below}.`],
    wrong: [["Nie — ranga centylowa to wynik pomnożony przez 10", "Ranga zależy od tego, ile osób ma niższe wyniki, nie od samej wartości wyniku."],
      ["Nie — ranga centylowa nie może przekraczać 50%", "Może wynosić od 0 do 100%."],
      ["Nie — rangę centylową liczy się tylko w rozkładzie normalnym", "Rangę można policzyć dla dowolnych danych."]],
    hint: `Policz, ile wyników jest mniejszych od ${x}.`,
    why: `Mniejszych od ${x}: ${below} z ${n} → ranga centylowa ≈ <b>${pr}%</b>. Ranga centylowa = % obserwacji poniżej punktu; punkt centylowy = wynik, poniżej którego leży dany %.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  4. MEDIANA DLA ROZKŁADU LICZEBNOŚCI (interpolacja liniowa)
// ════════════════════════════════════════════════════════════════════════════
function grouped() {
  const h = pick([5, 10]), k = ri(5, 6), start = pick([10, 20, 30]);
  const rows = Array.from({ length: k }, (_, i) => ({ a: start + i * h, b: start + i * h + h - 1, f: ri(2, 9) }));
  let F = 0; rows.forEach((r) => { r.Fb = F; F += r.f; r.F = F; });
  const N = F, half = N / 2, mi = rows.findIndex((r) => r.F >= half), r = rows[mi], L = r.a - 0.5;
  return { h, rows, N, half, mi, r, L, me: L + ((half - r.Fb) / r.f) * h };
}
const gTable = (g) => table(["Przedział", "f", "F skum."], g.rows.map((r) => [`${r.a}–${r.b}`, r.f, r.F]));
const gWhy = (g) => `N/2 = ${fmt(g.half, 1)}. Pierwsze F ≥ ${fmt(g.half, 1)} jest w przedziale <b>${g.r.a}–${g.r.b}</b> (F poniżej = ${g.r.Fb}, f<sub>m</sub> = ${g.r.f}). ` +
  `Me = L<sub>m</sub> + (N/2 − F)/f<sub>m</sub> · h = ${fmt(g.L, 1)} + (${fmt(g.half, 1)} − ${g.r.Fb})/${g.r.f} · ${g.h} = <b>${f2(g.me)}</b>. ` +
  `Interpolacja zakłada, że wyniki są rozłożone w przedziale równomiernie.`;

const mgClaim = G("c-mg-claim", "grouped", "Mediana z tabeli — realna?", () => {
  const g = grouped(), ok = chance(OK_P);
  const others = g.rows.map((_, i) => i).filter((i) => Math.abs(i - g.mi) >= 1);
  const j = pick(others), claim = ok ? g.me : g.rows[j].a + (g.h - 1) / 2;
  return judge({ ok,
    q: `Rozkład liczebności (wyniki całkowite). W rozwiązaniu: „Me = <b>${f2(claim)}</b>”. Czy to realne?`,
    fig: gTable(g),
    yes: ["Tak — mediana leży w przedziale, w którym F przekracza N/2", `N/2 = ${fmt(g.half, 1)}, a F przekracza tę wartość w przedziale ${g.r.a}–${g.r.b} — tam leży ${f2(claim)}.`],
    no: [`Nie — N/2 = ${fmt(g.half, 1)} wypada w przedziale ${g.r.a}–${g.r.b}, więc tam musi leżeć mediana`, `Poniżej ${f2(claim)} jest ${claim < g.L ? "mniej" : "więcej"} niż połowa wyników — widać to po kolumnie F.`],
    wrong: [["Nie — mediana to zawsze środek środkowego wiersza tabeli", "Środkowy wiersz nie musi zawierać środkowej obserwacji — decyduje F, nie numer wiersza."],
      ["Nie — mediana leży w przedziale o największym f", "To przedział dominanty, nie mediany."],
      ["Nie — mediana z rozkładu musi być liczbą całkowitą", "Interpolacja daje zwykle ułamek."]],
    hint: "Policz N/2 i znajdź w kolumnie F przedział, w którym je przekraczamy.",
    why: gWhy(g),
  });
});

const mgWhere = G("c-mg-where", "grouped", "W którym przedziale jest mediana?", () => {
  const g = grouped();
  const opts = g.rows.map((r, i) => [`${r.a}–${r.b}`, i === g.mi
    ? `Dobrze: F poniżej = ${r.Fb} < N/2 = ${fmt(g.half, 1)} ≤ F = ${r.F}.`
    : i < g.mi ? `Do końca tego przedziału jest tylko ${r.F} wyników — mniej niż połowa (${fmt(g.half, 1)}).`
      : `Już przed tym przedziałem jest ${r.Fb} wyników — połowa (${fmt(g.half, 1)}) została przekroczona wcześniej.`]);
  const top = [opts[g.mi], ...shuffle(opts.filter((_, i) => i !== g.mi)).slice(0, 3)];
  return choice({ q: `Rzuć okiem na tabelę (bez liczenia wzoru): w którym przedziale leży mediana?`, fig: gTable(g), opts: top,
    hint: "Mediana = środkowa obserwacja. Gdzie F przekracza N/2?", why: gWhy(g) });
});

const mgPos = G("c-mg-pos", "grouped", "Gdzie w przedziale leży mediana?", () => {
  let g, fr;
  for (let t = 0; t < 80; t++) {
    g = grouped(); fr = (g.half - g.r.Fb) / g.r.f;
    if ((fr > 0.05 && fr < 0.25) || (fr > 0.42 && fr < 0.58) || (fr > 0.75 && fr < 0.95)) break;
  }
  const pos = fr < 0.33 ? 0 : fr > 0.67 ? 2 : 1;
  const L = fmt(g.L, 1), U = fmt(g.L + g.h, 1);
  const labels = [`Blisko dolnej granicy (${L})`, "Mniej więcej w środku przedziału", `Blisko górnej granicy (${U})`];
  const need = `Do N/2 brakuje ${fmt(g.half - g.r.Fb, 1)} z ${g.r.f} wyników przedziału (${Math.round(fr * 100)}% drogi).`;
  const opts = [[labels[pos], `Dobrze. ${need}`],
    ...[0, 1, 2].filter((i) => i !== pos).map((i) => [labels[i], `${need} Przy równomiernym rozłożeniu wyników mediana leży więc ${["blisko dolnej granicy", "w środku", "blisko górnej granicy"][pos]}.`]),
    ["Poza tym przedziałem", `Połowa obserwacji (N/2 = ${fmt(g.half, 1)}) wypada właśnie w przedziale ${g.r.a}–${g.r.b}, więc mediana musi w nim leżeć.`]];
  return choice({ q: `Mediana leży w przedziale <b>${g.r.a}–${g.r.b}</b>. Bez liczenia do końca: gdzie mniej więcej w tym przedziale?`, fig: gTable(g), opts,
    hint: "Ile z f wyników tego przedziału trzeba „wziąć”, żeby dojść do N/2?", why: gWhy(g) });
});

// ════════════════════════════════════════════════════════════════════════════
//  5. MEDIANA (dane surowe)
// ════════════════════════════════════════════════════════════════════════════
const mdClaim = G("c-md-claim", "median", "Absurdalna mediana?", () => {
  const n = ri(15, 25), d = nums(n, 1, 9), s = sorted(d), me = median(d);
  const ok = chance(OK_P);
  const hi = s[Math.floor(0.85 * n)], lo = s[Math.floor(0.12 * n)];
  let type = ok ? "ok" : pick(["max", "skew"]);
  let claim = me;
  if (type === "skew") { if (hi - me >= 2) claim = hi; else if (me - lo >= 2) claim = lo; else type = "max"; }
  if (type === "max") claim = n;
  const under = countIf(d, (x) => x < claim), over = countIf(d, (x) => x > claim);
  return judge({ ok,
    q: `Wyniki ${n} osób: ${list(d)}. W raporcie: „mediana = <b>${fmt(claim, 1)}</b>”. Czy ten wynik jest realny?`,
    yes: ["Tak — mniej więcej połowa wyników jest poniżej, a połowa powyżej tej wartości", `Mniejszych: ${under}, większych: ${over} — mediana dzieli dane na pół.`],
    no: type === "max"
      ? ["Nie — mediana musi leżeć między najmniejszym a największym wynikiem, a największy to " + s[n - 1], `${claim} to więcej niż każdy wynik w danych — połowa wyników nie może być powyżej. (${claim} to akurat liczba osób.)`]
      : [`Nie — aż ${claim > me ? under : over} z ${n} wyników jest ${claim > me ? "mniejszych" : "większych"} niż ${claim}, a mediana ma dzielić dane na pół`, `Mediana to wynik środkowy: połowa poniżej, połowa powyżej. Tu przewaga jednej strony jest wyraźna.`],
    wrong: [["Nie — mediana musi być wartością, która występuje najczęściej", "To definicja dominanty, nie mediany."],
      ["Nie — mediana zawsze jest równa średniej", "Są równe tylko w rozkładzie symetrycznym."],
      ["Nie — mediana musi być liczbą parzystą", "Parzystość nie ma tu znaczenia."]],
    hint: "Policz z grubsza: ile wyników jest mniejszych, a ile większych od podanej mediany?",
    why: `Uporządkowane: ${list(s)}. n = ${n}, pozycja mediany = (n + 1)/2 = ${fmt((n + 1) / 2, 1)} → Me = <b>${fmt(me, 1)}</b>. Szybki test: połowa wyników poniżej, połowa powyżej — i mediana zawsze mieści się między min a max.`,
  });
});

const mdOutlier = G("c-md-out", "median", "Mediana a wartość skrajna", () => {
  const n = pick([7, 9, 11]), d = nums(n, 2, 9), big = pick([95, 120, 250, 400]);
  const me0 = median(d), d2 = [...d, big], me1 = median(d2), m1 = mean(d2), ok = chance(0.4);
  const claim = ok ? me1 : Math.round(m1);
  return judge({ ok,
    q: `Wyniki: ${list(d)} (mediana = ${fmt(me0, 1)}). Dopisano jeszcze jeden wynik: <b>${big}</b>. Raport: „mediana wzrosła do <b>${fmt(claim, 1)}</b>”. Realne?`,
    yes: ["Tak — skrajny wynik dodaje tylko jedną pozycję na końcu, więc mediana przesuwa się najwyżej o pół pozycji", `Nowa mediana = ${fmt(me1, 1)}; wartość ${big} nie ma znaczenia — liczy się tylko, że jest największa.`],
    no: ["Nie — mediana jest odporna na wartości skrajne: jeden dodany wynik przesuwa ją najwyżej o pół pozycji", `${fmt(claim, 1)} to raczej średnia (${f2(m1)}), którą ${big} mocno ciągnie w górę. Mediana po dopisaniu = ${fmt(me1, 1)}.`],
    wrong: [["Nie — mediana musi zostać dokładnie taka sama jak przed dopisaniem", "Może się nieco przesunąć, bo zmienia się n i pozycja środka."],
      ["Nie — przed liczeniem mediany trzeba usunąć wartości skrajne", "Mediany nie trzeba „czyścić” — ona sama jest na nie odporna."],
      ["Nie — mediana zmienia się zawsze o tyle samo co średnia", "Właśnie nie — średnia reaguje na wartość skrajną mocno, mediana prawie wcale."]],
    hint: "Gdzie w uporządkowanym szeregu stanie wynik " + big + "? Ile przesunie się środek?",
    why: `Przed: ${list(sorted(d))} → Me = ${fmt(me0, 1)}. Po: ${list(sorted(d2))} → Me = <b>${fmt(me1, 1)}</b>, a średnia skoczyła do ${f2(m1)}. Mediana „widzi” tylko kolejność, nie odległość — dlatego jest odporna.`,
  });
});

const mdWords = G("c-md-words", "median", "Mediana z opisu", () => {
  const N = pick([30, 40, 50, 60]), T = pick([10, 12, 15]), ok = chance(0.4);
  const k = ok ? ri(5, N / 2 - 4) : ri(N / 2 + 3, N - 3), claim = T + ri(2, 6);
  return judge({ ok,
    q: `Kolokwium (max 30 pkt) pisało ${N} osób. <b>${k}</b> z nich dostało mniej niż ${T} pkt. W raporcie: „mediana = <b>${claim} pkt</b>”. Czy to możliwe?`,
    yesWrong: "Tak — to możliwe",
    yes: ["Tak — poniżej " + T + " pkt jest mniej niż połowa osób, więc mediana może być wyższa", `${k} < N/2 = ${N / 2}, więc środkowa osoba może mieć ${claim} pkt.`],
    no: [`Nie — skoro ${k} z ${N} osób (ponad połowa) ma mniej niż ${T} pkt, mediana musi być mniejsza niż ${T}`, `Połowa to ${N / 2} osób. Środkowa osoba w szeregu należy już do grupy poniżej ${T} pkt.`],
    wrong: [["Nie — mediana zawsze leży w połowie skali (15 pkt)", "Mediana zależy od wyników, nie od skali."],
      ["Nie — bez wszystkich wyników nie da się nic powiedzieć o medianie", "Da się: wystarczy wiedzieć, ile osób jest poniżej progu."],
      ["Nie — mediana nie może być wyższa od progu " + T + " pkt", "Może, jeśli poniżej progu jest mniej niż połowa osób."]],
    hint: "Porównaj liczbę osób poniżej progu z połową N.",
    why: `N/2 = ${N / 2}. Poniżej ${T} pkt: ${k} osób → ${k > N / 2 ? "ponad połowa, więc Me < " + T : "mniej niż połowa, więc Me ≥ " + T + " jest możliwe"}. Medianę często da się „zawęzić” bez liczenia.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  6. ŚREDNIA
// ════════════════════════════════════════════════════════════════════════════
const mnClaim = G("c-mn-claim", "mean", "Czy ta średnia jest realna?", () => {
  const ok = chance(OK_P), type = ok ? "ok" : pick(["range", "sum"]);
  const n = ri(15, 22);
  const d = type === "sum" ? shuffle([...nums(n - 2, 1, 4), pick([8, 9]), pick([8, 9])]) : nums(n, 1, 9);
  const m = mean(d), mx = Math.max(...d), S = sum(d);
  let claim = m;
  if (type === "range") claim = mx + ri(1, 4) + 0.5;
  if (type === "sum") claim = Math.min(mx - 0.5, Math.round(m) + ri(3, 4) + 0.5);
  return judge({ ok,
    q: `Wyniki ${n} osób: ${list(d)}. W raporcie: „średnia = <b>${f2(claim)}</b>”. Czy to realne?`,
    yes: ["Tak — średnia leży w środku danych i n·x̄ zgadza się z sumą", `Σ = ${S}, n = ${n} → x̄ = ${f2(m)}.`],
    no: type === "range"
      ? ["Nie — średnia musi leżeć między najmniejszym a największym wynikiem", `Największy wynik to ${mx}, a średnia ${f2(claim)} jest od niego większa — to niemożliwe.`]
      : [`Nie — przy n = ${n} średnia ${f2(claim)} dawałaby sumę ${f2(n * claim)}, a suma wyników to tylko ${S}`, `Większość wyników to 1–4, więc średnia musi być mała. Szybki test: n·x̄ = Σ.`],
    wrong: [["Nie — średnia musi być jedną z liczb w danych", "Średnia nie musi występować w danych (to nie dominanta)."],
      ["Nie — średnia musi być liczbą całkowitą", "Średnia to Σ/n — zwykle ułamek."],
      ["Nie — średnia musi być równa medianie", "Są równe tylko w rozkładzie symetrycznym."]],
    hint: "Czy średnia mieści się między min a max? Ile wyniosłaby suma przy takiej średniej?",
    why: `Σ = ${S}, n = ${n} → x̄ = ${S}/${n} = <b>${f2(m)}</b>. Dwa szybkie testy: min ≤ x̄ ≤ max oraz n · x̄ = Σ X.`,
  });
});

const mnDev = G("c-mn-dev", "mean", "Suma odchyleń od średniej", () => {
  let v, m;
  do { m = ri(4, 8); v = nums(4, m - 4, m + 4); v.push(5 * m - sum(v)); } while (v[4] < 1 || v[4] > 15 || v.every((x) => x === m));
  const ok = chance(OK_P), claim = ok ? m : m + pick([-1, 1]);
  const dev = v.map((x) => x - claim), S = sum(dev);
  return judge({ ok,
    q: `Ktoś policzył średnią x̄ = <b>${claim}</b> i odchylenia od niej. Czy średnia jest poprawna?`,
    fig: table(["X", "X − x̄"], [...v.map((x, i) => [x, fmt(dev[i], 0)]), { cls: "is-hl", cells: ["Σ", fmt(S, 0)] }]),
    yesWrong: "Tak — średnia jest poprawna",
    yes: ["Tak — suma odchyleń od średniej wynosi 0", "Σ(X − x̄) = 0 — to zawsze prawda dla poprawnie policzonej średniej."],
    no: [`Nie — suma odchyleń od średniej zawsze wynosi 0, a tu wynosi ${fmt(S, 0)}`, `Skoro Σ(X − x̄) ≠ 0, x̄ jest źle policzona. Poprawnie: Σ X = ${sum(v)}, x̄ = ${sum(v)}/5 = ${m}.`],
    wrong: [["Nie — odchylenia od średniej nie mogą być ujemne", "Wyniki poniżej średniej mają ujemne odchylenia — to normalne."],
      ["Nie — suma odchyleń powinna równać się n", "Suma odchyleń od średniej zawsze wynosi 0, nie n."],
      ["Nie — suma odchyleń powinna równać się wariancji", "Wariancja to średnia z KWADRATÓW odchyleń; zwykłe odchylenia sumują się do 0."]],
    hint: "Ile zawsze wynosi Σ(X − x̄)?",
    why: `Σ X = ${sum(v)}, x̄ = <b>${m}</b>. Średnia to „punkt równowagi” — odchylenia dodatnie i ujemne się znoszą: Σ(X − x̄) = 0. Dlatego w wariancji podnosimy odchylenia do kwadratu.`,
  });
});

const mnShift = G("c-mn-shift", "mean", "Co się dzieje ze średnią?", () => {
  const n = ri(10, 30), M = ri(12, 30), k = ri(2, 6), big = M * ri(6, 10);
  const V = pick([
    { ok: true, t: `Każdej z ${n} osób dodano ${k} pkt. Raport: „średnia wzrosła z ${M} do ${M + k}”.`, e: "Dodanie stałej do każdego wyniku przesuwa średnią dokładnie o tę stałą." },
    { ok: false, t: `Każdej z ${n} osób dodano ${k} pkt. Raport: „średnia wzrosła z ${M} do ${M + k * n}”.`,
      no: `Nie — gdy każdy dostaje +${k}, średnia rośnie o ${k}, a nie o ${k}·n`, e: `Suma rośnie o ${k}·${n}, ale dzielimy ją przez ${n} — średnia: ${M} + ${k} = ${M + k}.` },
    { ok: false, t: `Średnia ${n} osób = ${M}. Dołączyła osoba z wynikiem dokładnie ${M}. Raport: „średnia wzrosła do ${M + 1}”.`,
      no: `Nie — dodanie wyniku równego średniej nie zmienia średniej`, e: `Nowy wynik ma odchylenie 0 od średniej, więc punkt równowagi zostaje na ${M}.` },
    { ok: false, t: `Średnia ${n} osób = ${M}. Dołączyła osoba z wynikiem ${big}. Raport: „średnia się nie zmieniła”.`,
      no: `Nie — wynik ${big} daleko od średniej podnosi średnią`, e: `Nowa suma = ${n * M} + ${big}, n = ${n + 1} → średnia ≈ ${f2((n * M + big) / (n + 1))}. Średnia jest wrażliwa na wartości skrajne.` },
    { ok: true, t: `Wszystkie wyniki pomnożono przez 2. Raport: „średnia wzrosła z ${M} do ${2 * M}”.`, e: "Mnożenie każdego wyniku przez stałą mnoży średnią przez tę stałą." },
  ]);
  return judge({ ok: V.ok,
    q: `${V.t} Czy to się zgadza?`,
    yesWrong: "Tak — to się zgadza",
    yes: ["Tak — tak właśnie zachowuje się średnia", V.e],
    no: [V.no || "", V.e],
    wrong: [["Nie — średnia nie zmienia się, gdy zmieniają się wyniki wszystkich osób", "Zmienia się — średnia liczona jest ze wszystkich wyników."],
      ["Nie — dołączenie nowej osoby zawsze obniża średnią", "Zależy od jej wyniku: powyżej średniej podnosi, poniżej obniża, równy — nic nie zmienia."],
      ["Nie — bez wszystkich danych nie da się tego ocenić", "Da się: wystarczy znać średnią, n i to, co zmieniono."]],
    hint: "Pomyśl o sumie wyników i o n.",
    why: `${V.e} Reguły: X + k → x̄ + k; X · k → x̄ · k; dopisanie wyniku = x̄ nic nie zmienia; wynik daleki od x̄ mocno ją przesuwa.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  7. DOMINANTA
// ════════════════════════════════════════════════════════════════════════════
function withMode(n, lo, hi) {
  for (;;) {
    const d = nums(n, lo, hi), cnt = new Map();
    d.forEach((x) => cnt.set(x, (cnt.get(x) || 0) + 1));
    const top = Math.max(...cnt.values()), modes = [...cnt].filter(([, c]) => c === top).map(([v]) => v);
    if (modes.length === 1 && top >= 3 && top !== modes[0]) return { d, mo: modes[0], c: top };
  }
}
const moClaim = G("c-mo-claim", "mode", "Czy to dominanta?", () => {
  const n = ri(15, 20), { d, mo, c } = withMode(n, 1, 9), mx = Math.max(...d);
  const ok = chance(OK_P), type = ok ? "ok" : mx !== mo ? pick(["count", "max"]) : "count";
  const claim = { ok: mo, count: c, max: mx }[type];
  return judge({ ok,
    q: `Wyniki ${n} osób: ${list(d)}. Raport: „dominanta = <b>${claim}</b>”. Czy to poprawne?`,
    yesWrong: "Tak — to poprawne",
    yes: ["Tak — ta wartość występuje najczęściej", `${mo} występuje ${c} razy — częściej niż każda inna wartość.`],
    no: type === "count"
      ? [`Nie — ${c} to liczba wystąpień (f), a dominanta to wartość, która występuje najczęściej: ${mo}`, `Najczęstsza wartość to ${mo} (występuje ${c} razy). Częsty błąd: podanie f zamiast wartości.`]
      : [`Nie — dominanta to wartość najczęstsza, a nie największa; najczęściej występuje ${mo}`, `${mx} to maksimum. Dominanta = ${mo} (${c} razy).`],
    wrong: [["Nie — dominanta to środkowa wartość uporządkowanego szeregu", "To mediana."],
      ["Nie — dominanta musi być równa średniej", "Nie musi — są równe tylko w rozkładzie symetrycznym jednomodalnym."],
      ["Nie — dominanta to liczba różnych wartości w danych", "Dominanta to wartość, która występuje najczęściej."]],
    hint: "Która wartość pojawia się najwięcej razy?",
    why: `Najczęściej (${c} razy) występuje <b>${mo}</b> — to dominanta. Dominanta to wartość zmiennej, a nie jej liczebność.`,
  });
});

const moTable = G("c-mo-table", "mode", "Dominanta w tabeli kategorii", () => {
  const V = pick(NOMINAL), fs = shuffle([ri(30, 48), ri(12, 22), ri(8, 18), ri(4, 10)]);
  const top = fs.indexOf(Math.max(...fs)), second = fs.indexOf(sorted(fs)[2]);
  const type = chance(OK_P) ? "ok" : pick(["f", "second"]);
  const claim = { ok: V.c[top], f: String(fs[top]), second: V.c[second] }[type];
  return judge({ ok: type === "ok",
    q: `Rozkład liczebności: ${V.v}. Raport: „dominanta = <b>${claim}</b>”. Czy to poprawne?`,
    fig: table([V.v, "f"], V.c.map((c, i) => [c, fs[i]])),
    yesWrong: "Tak — to poprawne",
    yes: ["Tak — to kategoria o największej liczebności", `${V.c[top]} ma f = ${fs[top]} — najwięcej.`],
    no: type === "f"
      ? [`Nie — ${fs[top]} to liczebność, a dominantą jest kategoria: ${V.c[top]}`, "Dominanta to wartość zmiennej (tu nazwa kategorii), a nie liczba osób."]
      : [`Nie — najwięcej osób (${fs[top]}) jest w kategorii ${V.c[top]}`, `${claim} ma tylko f = ${fs[second]}.`],
    wrong: [["Nie — w danych jakościowych nie ma dominanty", "Jest — to jedyna miara tendencji centralnej dla skali nominalnej."],
      ["Nie — dominantą jest pierwsza kategoria w tabeli", "Kolejność wierszy nie ma znaczenia, liczy się f."],
      ["Nie — trzeba podać średnią liczebność", "Średnia z f nie jest miarą tendencji centralnej zmiennej."]],
    hint: "Która kategoria ma największe f?",
    why: `Największe f = ${fs[top]} → dominanta = <b>${V.c[top]}</b>. Podajemy kategorię, nie liczbę osób.`,
  });
});

const moBimodal = G("c-mo-bi", "mode", "Dwie dominanty", () => {
  let a = ri(2, 4), b = ri(6, 8); const c = ri(4, 5);
  const rest = nums(ri(6, 9), 1, 9).filter((x) => x !== a && x !== b).slice(0, 7);
  const cnt = new Map(); rest.forEach((x) => cnt.set(x, (cnt.get(x) || 0) + 1));
  if ([...cnt.values()].some((v) => v >= c)) b = a + 4;
  const d = shuffle([...Array(c).fill(a), ...Array(c).fill(b), ...rest]);
  const type = chance(OK_P) ? "ok" : pick(["avg", "one"]);
  const claim = { ok: `rozkład jest dwumodalny: dominanty ${a} i ${b}`, avg: `dominanta = ${fmt((a + b) / 2, 1)}`, one: `dominanta = ${a}` }[type];
  return judge({ ok: type === "ok",
    q: `Wyniki: ${list(d)}. Raport: „<b>${claim}</b>”. Czy to poprawne?`,
    yesWrong: "Tak — to poprawne",
    yes: ["Tak — dwie wartości występują równie często i najczęściej", `${a} i ${b} występują po ${c} razy.`],
    no: type === "avg"
      ? [`Nie — dominant się nie uśrednia: ${a} i ${b} występują po ${c} razy, więc są dwie dominanty`, `${fmt((a + b) / 2, 1)} może w ogóle nie występować w danych. Rozkład jest dwumodalny.`]
      : [`Nie — ${b} występuje równie często jak ${a}, więc dominanty są dwie`, `Obie wartości mają f = ${c}. Podanie jednej gubi informację o dwóch „szczytach”.`],
    wrong: [["Nie — gdy dwie wartości są równie częste, dominanty nie ma", "Jest — rozkład ma wtedy dwie dominanty (dwumodalny)."],
      ["Nie — dominantą jest wtedy większa z wartości", "Nie wybieramy żadnej — podajemy obie."],
      ["Nie — dominantą jest wtedy mediana", "Mediana to inna miara; nie zastępuje dominanty."]],
    hint: "Policz, ile razy występuje każda wartość.",
    why: `${a} i ${b} występują po ${c} razy — rozkład <b>dwumodalny</b> (dwie dominanty). Często oznacza to dwie różne grupy w danych.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  8. MIARY TENDENCJI CENTRALNEJ A KSZTAŁT ROZKŁADU
// ════════════════════════════════════════════════════════════════════════════
const shHist = G("c-sh-hist", "shape", "Średnia, mediana i dominanta na wykresie", () => {
  let d, M, Me, Mo, right, hs;
  for (;;) {
    right = chance(0.5);
    let base = [3, 8, 10, 7, 5, 3, 2, 1, 1].map((h) => h + ri(0, 1));
    if (!right) base = base.reverse();
    hs = base; d = base.flatMap((h, i) => Array(h).fill(i + 1));
    M = mean(d); Me = median(d); Mo = base.indexOf(Math.max(...base)) + 1;
    if (base.filter((h) => h === Math.max(...base)).length === 1 && (right ? Mo < Me && Me < M : Mo > Me && Me > M)) break;
  }
  const ok = chance(OK_P), sM = ok ? M : Mo, sMo = ok ? Mo : M;
  return judge({ ok,
    q: `Histogram wyników (n = ${d.length}). Raport: „M = <b>${f2(sM)}</b>, Me = <b>${fmt(Me, 1)}</b>, Mo = <b>${fmt(sMo, 1)}</b>”. Czy to realne?`,
    fig: histSvg(hs.map((_, i) => i + 1), hs),
    yes: [`Tak — ogon jest ${right ? "po prawej, więc Mo < Me < M" : "po lewej, więc M < Me < Mo"}`, `Średnią najbardziej ciągnie ogon, dominanta jest pod najwyższym słupkiem (${Mo}).`],
    no: [`Nie — ogon jest ${right ? "po prawej" : "po lewej"}, więc średnia powinna być ${right ? "największa (Mo < Me < M)" : "najmniejsza (M < Me < Mo)"}`, `Dominanta to najwyższy słupek (${Mo}), a nie ${fmt(sMo, 1)}. Średnia ucieka w stronę ogona.`],
    wrong: [["Nie — w każdym rozkładzie M = Me = Mo", "Tylko w symetrycznym jednomodalnym."],
      ["Nie — mediana zawsze jest największa z trzech miar", "Mediana zwykle leży pomiędzy średnią a dominantą."],
      ["Nie — średnia zawsze leży pod najwyższym słupkiem", "Pod najwyższym słupkiem leży dominanta."]],
    hint: "Gdzie jest najwyższy słupek? W którą stronę ciągnie się ogon?",
    why: `Dominanta = najwyższy słupek = ${Mo}. Me = ${fmt(Me, 1)}, M = ${f2(M)}. Rozkład skośny ${right ? "prawostronnie: Mo < Me < M" : "lewostronnie: M < Me < Mo"} — średnia przesuwa się w stronę ogona.`,
  });
});

const shSym = G("c-sh-sym", "shape", "Rozkład symetryczny", () => {
  const c = ri(20, 80), ok = chance(0.4), off = ri(12, 25) * pick([-1, 1]);
  const tiny = () => fmt(c + ri(-3, 3) / 10, 1);
  return judge({ ok,
    q: `Rozkład wyników jest jednomodalny i symetryczny (kształt dzwonu). Raport: „M = ${c}, Me = ${tiny()}, Mo = <b>${ok ? tiny() : c + off}</b>”. Czy to realne?`,
    yes: ["Tak — w rozkładzie symetrycznym jednomodalnym trzy miary leżą (prawie) w tym samym miejscu", "Niewielkie różnice (ułamki) wynikają z losowości danych."],
    no: ["Nie — w rozkładzie symetrycznym jednomodalnym M, Me i Mo leżą w tym samym miejscu", `Szczyt dzwonu (Mo) jest w środku, tam gdzie średnia i mediana (≈ ${c}). Mo = ${c + off} oznaczałoby szczyt z boku, czyli rozkład skośny.`],
    wrong: [["Nie — dominanta zawsze jest większa od średniej", "Zależy od skośności; w symetrycznym są równe."],
      ["Nie — średnia i mediana nigdy nie są równe", "W rozkładzie symetrycznym są równe."],
      ["Nie — rozkład symetryczny nie ma dominanty", "Ma — szczyt dzwonu."]],
    hint: "Gdzie jest szczyt symetrycznego dzwonu?",
    why: "W rozkładzie symetrycznym jednomodalnym (np. normalnym) M = Me = Mo. Rozjazd tych miar to sygnał skośności — albo błędu w obliczeniach.",
  });
});

const shIncome = G("c-sh-inc", "shape", "Pensje i prezes", () => {
  const n = ri(8, 11), d = nums(n, 40, 65).map((x) => x / 10), boss = ri(60, 120), all = [...d, boss];
  const M = mean(all), Me = median(all), ok = chance(OK_P);
  const [sM, sMe] = ok ? [M, Me] : [Me, M];
  return judge({ ok,
    q: `Pensje w firmie (tys. zł): ${list(all.map((x) => fmt(x, 1)))}. Raport: „średnia = <b>${f2(sM)}</b>, mediana = <b>${f2(sMe)}</b>”. Czy to realne?`,
    yes: ["Tak — jedna bardzo wysoka pensja ciągnie średnią w górę, a mediana zostaje przy typowych pensjach", `M = ${f2(M)} > Me = ${f2(Me)}.`],
    no: ["Nie — przy jednej bardzo wysokiej pensji średnia musi być większa od mediany", `Pensja ${boss} tys. podnosi średnią do ${f2(M)}, a mediana (${f2(Me)}) zostaje wśród typowych pensji. Podano je odwrotnie.`],
    wrong: [["Nie — średnia i mediana pensji muszą być równe", "Równe są tylko w rozkładzie symetrycznym; pensje rzadko są symetryczne."],
      ["Nie — pensję prezesa trzeba pominąć, bo zawyża wyniki", "Nie wolno usuwać danych; trzeba wybrać odporną miarę (medianę)."],
      ["Nie — mediana zawsze jest większa niż średnia", "W rozkładzie skośnym prawostronnie jest odwrotnie."]],
    hint: "Która miara reaguje na jedną ogromną wartość?",
    why: `M = ${f2(M)}, Me = ${f2(Me)}. Dochody są skośne prawostronnie: średnia rośnie przez nieliczne wysokie wartości, mediana opisuje typowego pracownika.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  9. TENDENCJA CENTRALNA CZY ZMIENNOŚĆ?
// ════════════════════════════════════════════════════════════════════════════
const MEASURES = [["Wariancja", 1], ["Średnia", 0], ["Dominanta", 0], ["Mediana", 0], ["Odchylenie standardowe", 1], ["Rozstęp", 1], ["Odchylenie ćwiartkowe", 1]];
const tvClass = G("c-tv-class", "tendvar", "Położenie czy rozrzut?", () => {
  const [m, v] = pick(MEASURES);
  const T = ["Miara tendencji centralnej", "Pojedyncza liczba opisująca centralne położenie zbioru obserwacji (dominanta, mediana, średnia)."];
  const Z = ["Miara zmienności (rozrzutu)", "Liczba opisująca rozrzut obserwacji (rozstęp, odchylenie ćwiartkowe, wariancja, odchylenie standardowe)."];
  const good = v ? Z : T, bad = v ? T : Z;
  return choice({ q: `Do której grupy należy: <b>${m}</b>?`,
    opts: [[good[0], `Dobrze. ${good[1]}`], [bad[0], `${m} należy do drugiej grupy. ${bad[0]} to: ${bad[1].split("(")[1].replace(")", "")}.`],
      ["Miara kształtu rozkładu", "Kształt opisują skośność i kurtoza, a nie ta miara."],
      ["Jedno i drugie naraz", `${m} odpowiada tylko na jedno pytanie: ${v ? "jak bardzo wyniki się różnią" : "gdzie leży środek danych"}.`]],
    hint: "Czy ta liczba mówi, GDZIE są wyniki, czy JAK BARDZO się różnią?",
    why: "Tendencja centralna: dominanta, mediana, średnia. Zmienność: rozstęp, odchylenie ćwiartkowe, wariancja, odchylenie standardowe.",
  });
});

const tvSame = G("c-tv-same", "tendvar", "Ta sama średnia, inny rozrzut", () => {
  const m = ri(5, 9), A = shuffle([m - 1, m, m, m + 1, m, m - 1, m + 1]), k = ri(3, 4);
  const B = shuffle([m - k, m + k, m - k + 1, m + k - 1, m, m - k, m + k]);
  const ok = chance(0.4);
  return judge({ ok,
    q: `Grupa A: ${list(A)}<br>Grupa B: ${list(B)}<br>Obie mają średnią ${m}. Wniosek: „<b>${ok ? "grupy mają tę samą średnią, ale wyniki w B są dużo bardziej rozrzucone" : "grupy mają tę samą średnią, więc są tak samo zróżnicowane"}</b>”. Czy wniosek jest poprawny?`,
    yesWrong: "Tak — wniosek jest poprawny",
    yes: ["Tak — średnia mówi o położeniu, a rozrzut trzeba ocenić osobno", `Rozstęp A = 2, rozstęp B = ${2 * k}; s<sub>A</sub> ≈ ${f2(sdN(A))}, s<sub>B</sub> ≈ ${f2(sdN(B))}.`],
    no: ["Nie — średnia nic nie mówi o rozrzucie; w B wyniki są dużo bardziej rozrzucone", `Rozstęp A = 2, B = ${2 * k}; s<sub>A</sub> ≈ ${f2(sdN(A))}, s<sub>B</sub> ≈ ${f2(sdN(B))}. Dlatego obok średniej podaje się miarę zmienności.`],
    wrong: [["Nie — skoro średnie są równe, to grupy są identyczne", "Grupy różnią się wynikami, choć średnia jest ta sama."],
      ["Nie — grupy o tej samej średniej muszą mieć tę samą medianę", "Nie muszą; zresztą to nie ma związku z rozrzutem."],
      ["Nie — rozrzut da się ocenić tylko z wykresu", "Wystarczą liczby: rozstęp, s."]],
    hint: "Popatrz, jak daleko od " + m + " są wyniki w każdej grupie.",
    why: `Obie średnie = ${m}, ale A: s ≈ ${f2(sdN(A))}, B: s ≈ ${f2(sdN(B))}. Miary tendencji centralnej i zmienności opisują dwie różne cechy rozkładu — potrzebne są obie.`,
  });
});

const tvShift = G("c-tv-shift", "tendvar", "Przesunięcie i rozciągnięcie wyników", () => {
  const M = ri(20, 40), s = ri(3, 8), k = ri(5, 10);
  const V = pick([
    { ok: false, t: `Wszystkim dodano ${k} pkt. Raport: „średnia ${M} → ${M + k}, odchylenie standardowe ${s} → ${s + k}”.`,
      no: "Nie — dodanie stałej przesuwa wszystkie wyniki tak samo: średnia rośnie, ale rozrzut (s) się nie zmienia", e: `Odległości między wynikami się nie zmieniają, więc s = ${s}.` },
    { ok: true, t: `Wszystkim dodano ${k} pkt. Raport: „średnia ${M} → ${M + k}, odchylenie standardowe bez zmian (${s})”.`, e: "Przesunięcie zmienia położenie, nie rozrzut." },
    { ok: true, t: `Wszystkie wyniki pomnożono przez 2. Raport: „średnia ${M} → ${2 * M}, odchylenie standardowe ${s} → ${2 * s}”.`, e: "Mnożenie rozciąga też odległości między wynikami — s rośnie dwa razy." },
    { ok: false, t: `Wszystkie wyniki pomnożono przez 2. Raport: „średnia ${M} → ${2 * M}, odchylenie standardowe bez zmian (${s})”.`,
      no: "Nie — mnożenie przez 2 rozciąga też odległości między wynikami: s rośnie dwa razy", e: `Odległości od średniej są dwa razy większe → s = ${2 * s}.` },
  ]);
  return judge({ ok: V.ok, q: `${V.t} Czy to się zgadza?`,
    yesWrong: "Tak — to się zgadza",
    yes: ["Tak — tak zachowują się średnia i odchylenie standardowe", V.e],
    no: [V.no || "", V.e],
    wrong: [["Nie — dodanie stałej zmienia tylko rozrzut, a nie średnią", "Odwrotnie: zmienia średnią, a nie rozrzut."],
      ["Nie — po każdej zmianie wyników średnia i s zmieniają się o tyle samo", "Dodawanie zmienia tylko średnią; mnożenie zmienia obie miary, ale proporcjonalnie, nie „o tyle samo”."],
      ["Nie — żadne przekształcenie wyników nie zmienia s", "Mnożenie zmienia s."]],
    hint: "Czy odległości między wynikami się zmieniły?",
    why: `${V.e} Reguły: X + k → M + k, s bez zmian; X · k → M · k, s · |k| (wariancja · k²).`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  10. ROZSTĘP
// ════════════════════════════════════════════════════════════════════════════
const rgClaim = G("c-rg-claim", "range", "Czy rozstęp się zgadza?", () => {
  const n = ri(10, 16), d = nums(n, 2, 30), mx = Math.max(...d), mn = Math.min(...d), R = mx - mn;
  const ok = chance(OK_P);
  let type = ok ? "ok" : pick(["max", "ends"]);
  if (type === "ends" && Math.abs(d[n - 1] - d[0]) === R) type = "max";
  const claim = { ok: R, max: mx, ends: Math.abs(d[n - 1] - d[0]) }[type];
  return judge({ ok,
    q: `Wyniki: ${list(d)}. Raport: „rozstęp = <b>${claim}</b>”. Czy to poprawne?`,
    yesWrong: "Tak — to poprawne",
    yes: ["Tak — to różnica między największym a najmniejszym wynikiem", `${mx} − ${mn} = ${R}.`],
    no: type === "max"
      ? [`Nie — rozstęp = max − min = ${mx} − ${mn} = ${R}; ${claim} to samo maksimum`, "Rozstęp mówi o odległości między skrajnymi wynikami, więc trzeba odjąć minimum."]
      : [`Nie — rozstęp liczymy z największego i najmniejszego wyniku: ${mx} − ${mn} = ${R}`, `${claim} to różnica ostatniej i pierwszej liczby z listy — kolejność zapisu nie ma znaczenia.`],
    wrong: [["Nie — rozstęp to liczba wyników w danych", "Liczba wyników to n."],
      ["Nie — rozstęp nie może być większy niż średnia", "Może — to dwie różne rzeczy."],
      ["Nie — rozstęp liczymy po usunięciu wyników skrajnych", "Rozstęp to właśnie różnica wyników skrajnych."]],
    hint: "Znajdź największy i najmniejszy wynik.",
    why: `max = ${mx}, min = ${mn} → rozstęp = <b>${R}</b>. Rozstęp zależy tylko od dwóch skrajnych wyników.`,
  });
});

const rgOutlier = G("c-rg-out", "range", "Rozstęp a jeden skrajny wynik", () => {
  const d = nums(ri(8, 12), 2, 9), big = pick([45, 60, 95]), R0 = Math.max(...d) - Math.min(...d), R1 = big - Math.min(...d), ok = chance(0.4);
  return judge({ ok,
    q: `Wyniki: ${list(d)} (rozstęp = ${R0}). Dopisano jeden wynik <b>${big}</b>. Raport: „rozstęp ${ok ? `wzrósł do ${R1}` : "prawie się nie zmienił"}”. Realne?`,
    yes: ["Tak — rozstęp zależy tylko od wyników skrajnych, więc jeden wynik " + big + " od razu go zwiększa", `Nowy rozstęp = ${big} − ${Math.min(...d)} = ${R1}.`],
    no: ["Nie — rozstęp zależy od skrajnych wyników, więc jeden wynik " + big + " mocno go zwiększa", `Nowy rozstęp = ${big} − ${Math.min(...d)} = ${R1} zamiast ${R0}. To główna wada rozstępu: jest bardzo wrażliwy na pojedyncze skrajne wyniki.`],
    wrong: [["Nie — dopisanie jednego wyniku nigdy nie zmienia rozstępu", "Zmienia, jeśli nowy wynik jest nowym minimum albo maksimum."],
      ["Nie — rozstęp może się tylko zmniejszyć po dopisaniu wyniku", "Dopisanie wyniku może rozstęp tylko zwiększyć albo zostawić bez zmian."],
      ["Nie — rozstęp zmienia się o tyle, o ile zmienia się średnia", "Rozstęp zależy od skrajnych wyników, nie od średniej."]],
    hint: "Czy " + big + " jest nowym maksimum?",
    why: `Rozstęp przed: ${R0}, po: <b>${R1}</b>. Rozstęp jest prosty, ale nieodporny — dlatego używa się też odchylenia ćwiartkowego i s.`,
  });
});

const rgZero = G("c-rg-zero", "range", "Zerowy rozrzut", () => {
  const v = ri(3, 9), w = v + ri(1, 2);
  const V = pick([
    { ok: false, t: `Wyniki: ${list(shuffle([v, v, w, v, v]))}. Raport: „rozstęp = 0”.`, no: "Nie — rozstęp = 0 tylko wtedy, gdy wszystkie wyniki są równe", e: `Tu max = ${w}, min = ${v}, więc R = ${w - v}.` },
    { ok: true, t: `Wyniki: ${list([v, v, v, v, v, v])}. Raport: „rozstęp = 0, odchylenie standardowe = 0”.`, e: "Wszystkie wyniki są równe — nie ma żadnego rozrzutu." },
    { ok: false, t: `Raport: „odchylenie standardowe = 0, rozstęp = ${w - v + 2}”.`, no: "Nie — s = 0 oznacza, że wszystkie wyniki są równe, a wtedy rozstęp też musi być 0", e: "Jeśli choć jeden wynik różni się od średniej, s > 0." },
    { ok: false, t: `Raport: „rozstęp = −${ri(2, 6)}”.`, no: "Nie — rozstęp = max − min, więc nie może być ujemny", e: "Maksimum nigdy nie jest mniejsze od minimum." },
  ]);
  return judge({ ok: V.ok, q: `${V.t} Czy to możliwe?`,
    yes: ["Tak — przy identycznych wynikach wszystkie miary zmienności wynoszą 0", V.e],
    no: [V.no || "", V.e],
    wrong: [["Nie — rozstęp nigdy nie może wynosić 0", "Może — gdy wszystkie wyniki są równe."],
      ["Nie — rozstęp i s nie mają ze sobą nic wspólnego", "Oba mierzą rozrzut: jeśli jedno wynosi 0, drugie też."],
      ["Nie — miary zmienności liczy się tylko dla dużych prób", "Można je policzyć dla każdej próby."]],
    hint: "Kiedy rozrzut jest zerowy?",
    why: `${V.e} Miary zmienności są ≥ 0; wynoszą 0 wtedy i tylko wtedy, gdy wszystkie wyniki są równe.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  11. ODCHYLENIE ĆWIARTKOWE (kwartyle)
// ════════════════════════════════════════════════════════════════════════════
const qClaim = G("c-q-claim", "quart", "Kwartyle i Q — realne?", () => {
  const n = pick([11, 13, 15]), s = sorted(nums(n, 1, 30));
  const { q1, q3, me } = quart(s), Q = (q3 - q1) / 2, R = s[n - 1] - s[0];
  const ok = chance(OK_P);
  let type = ok ? "ok" : pick(["order", "bigQ"]);
  if (type === "order" && q3 - me < 2) type = "bigQ";
  let sQ1 = q1, sQ3 = q3, sQ = Q;
  if (type === "order") { sQ1 = q3; sQ3 = q1; sQ = Math.abs(Q); }
  if (type === "bigQ") sQ = Math.max(R, q3 - q1 + 2);
  return judge({ ok,
    q: `Uporządkowane wyniki: ${list(s)}. Raport: „Q<sub>1</sub> = <b>${fmt(sQ1, 1)}</b>, Q<sub>3</sub> = <b>${fmt(sQ3, 1)}</b>, odchylenie ćwiartkowe Q = <b>${fmt(sQ, 1)}</b>”. Czy to realne?`,
    yes: ["Tak — Q1 < Me < Q3, a Q = (Q3 − Q1)/2", `Me = ${fmt(me, 1)}; Q = (${fmt(q3, 1)} − ${fmt(q1, 1)})/2 = ${fmt(Q, 1)}.`],
    no: type === "order"
      ? [`Nie — Q1 (25% wyników poniżej) musi być mniejszy od mediany (${fmt(me, 1)}), a Q3 większy`, `Podano Q1 = ${fmt(sQ1, 1)} > Me — kwartyle są zamienione.`]
      : [`Nie — Q = (Q3 − Q1)/2 nie może być większe od połowy rozstępu (${fmt(R / 2, 1)})`, `Q3 i Q1 leżą wewnątrz danych, więc ich odległość ≤ R = ${R}, a połowa ≤ ${fmt(R / 2, 1)}. Tu Q = ${fmt(sQ, 1)}.`],
    wrong: [["Nie — Q to różnica Q3 − Q1 bez dzielenia na 2", "Q to POŁOWA odległości między Q3 a Q1 (półrozstęp kwartylowy)."],
      ["Nie — Q1 to zawsze najmniejszy wynik w danych", "Q1 to wynik, poniżej którego leży 25% obserwacji."],
      ["Nie — kwartyle muszą być w tej samej odległości od mediany", "W rozkładzie skośnym nie są."]],
    hint: "Q1 ≤ Me ≤ Q3, a Q ≤ połowa rozstępu.",
    why: `Q1 = ${fmt(q1, 1)} (mediana dolnej połowy), Me = ${fmt(me, 1)}, Q3 = ${fmt(q3, 1)} (mediana górnej połowy). Q = (Q3 − Q1)/2 = <b>${fmt(Q, 1)}</b>. Punkty kwartylowe dzielą rozkład na 4 części po 25%.`,
  });
});

const qBound = G("c-q-bound", "quart", "Q z liczb z raportu", () => {
  const q1 = ri(8, 20), q3 = q1 + 2 * ri(2, 6), R = (q3 - q1) + ri(6, 14), type = chance(OK_P) ? "ok" : pick(["nohalf", "gtR"]);
  const claim = { ok: (q3 - q1) / 2, nohalf: q3 - q1, gtR: R / 2 + ri(2, 5) }[type];
  return judge({ ok: type === "ok",
    q: `Raport: „Q<sub>1</sub> = ${q1}, Q<sub>3</sub> = ${q3}, rozstęp = ${R}, odchylenie ćwiartkowe Q = <b>${fmt(claim, 1)}</b>”. Czy Q jest poprawne?`,
    yesWrong: "Tak — Q jest poprawne",
    yes: ["Tak — Q = (Q3 − Q1)/2", `(${q3} − ${q1})/2 = ${fmt((q3 - q1) / 2, 1)}.`],
    no: type === "nohalf"
      ? [`Nie — Q to połowa odległości Q3 − Q1: (${q3} − ${q1})/2 = ${fmt((q3 - q1) / 2, 1)}`, `${claim} to sam rozstęp kwartylowy Q3 − Q1 — zabrakło dzielenia przez 2.`]
      : [`Nie — Q nie może być większe od połowy rozstępu (${fmt(R / 2, 1)}), a poza tym (Q3 − Q1)/2 = ${fmt((q3 - q1) / 2, 1)}`, "Kwartyle leżą wewnątrz danych, więc ich odległość nie przekracza rozstępu."],
    wrong: [["Nie — Q musi być równe połowie rozstępu", "Q dotyczy środkowych 50% wyników, nie skrajnych."],
      ["Nie — Q musi być równe medianie", "Q to miara zmienności, a mediana — tendencji centralnej."],
      ["Nie — Q liczy się jako Q3 + Q1 dzielone przez 2", "To byłby środek między kwartylami, a nie rozrzut."]],
    hint: "Q = (Q3 − Q1)/2.",
    why: `Q = (${q3} − ${q1})/2 = <b>${fmt((q3 - q1) / 2, 1)}</b>. Zawsze Q ≤ R/2 = ${fmt(R / 2, 1)}.`,
  });
});

const qRobust = G("c-q-rob", "quart", "Q a wartość skrajna", () => {
  const d = nums(pick([10, 12]), 4, 20), big = pick([90, 120, 200]), d2 = [...d, big];
  const A = quart(d), B = quart(d2), Q0 = (A.q3 - A.q1) / 2, Q1 = (B.q3 - B.q1) / 2, ok = chance(0.4);
  const claim = ok ? Q1 : Q0 + (big - Math.max(...d)) / 2;
  return judge({ ok,
    q: `Wyniki: ${list(d)} (Q = ${fmt(Q0, 1)}). Dopisano wynik <b>${big}</b>. Raport: „Q wynosi teraz <b>${fmt(claim, 1)}</b>”. Realne?`,
    yes: ["Tak — Q opiera się na środkowych 50% wyników, więc jeden skrajny wynik prawie go nie zmienia", `Nowe kwartyle: Q1 = ${fmt(B.q1, 1)}, Q3 = ${fmt(B.q3, 1)} → Q = ${fmt(Q1, 1)}.`],
    no: ["Nie — Q zależy od środkowych 50% wyników; jeden skrajny wynik przesuwa kwartyle najwyżej o pół pozycji", `Nowe Q = ${fmt(Q1, 1)}. Tak bardzo zmieniłby się rozstęp, nie Q.`],
    wrong: [["Nie — Q musi zostać dokładnie takie samo", "Może się nieco zmienić, bo zmienia się n i pozycje kwartyli."],
      ["Nie — Q zawsze rośnie o połowę nowego wyniku", "Q nie zależy od wartości skrajnego wyniku."],
      ["Nie — po dopisaniu wyniku Q trzeba liczyć z rozstępu", "Q zawsze liczymy z kwartyli."]],
    hint: "Czy " + big + " zmienia środkowe 50% wyników?",
    why: `Przed: Q = ${fmt(Q0, 1)}, po: <b>${fmt(Q1, 1)}</b>, a rozstęp skoczył z ${Math.max(...d) - Math.min(...d)} do ${big - Math.min(...d2)}. Q jest odporne na wartości skrajne — tak jak mediana.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  12. WARIANCJA
// ════════════════════════════════════════════════════════════════════════════
const vaClaim = G("c-va-claim", "variance", "Czy ta wariancja jest realna?", () => {
  let d; do { d = nums(ri(6, 9), 1, 12); } while (sdN(d) < 2);
  const n = d.length, m = mean(d), S2 = varN(d), R = Math.max(...d) - Math.min(...d);
  const ok = chance(OK_P), type = ok ? "ok" : pick(["neg", "big", "tiny"]);
  const claim = { ok: S2, neg: -S2, big: R * R + ri(10, 60), tiny: ri(2, 15) / 100 }[type];
  const NO = {
    neg: ["Nie — wariancja to średnia z kwadratów odchyleń, a kwadraty nie są ujemne", "Wariancja jest zawsze ≥ 0."],
    big: [`Nie — każde odchylenie od średniej jest mniejsze niż rozstęp (${R}), więc wariancja nie może przekroczyć R² = ${R * R}`, `Kwadrat każdego odchylenia ≤ ${R * R}, a wariancja to ich średnia.`],
    tiny: ["Nie — wyniki odchylają się od średniej o kilka punktów, więc średni kwadrat odchylenia nie może być bliski 0", `Np. wynik ${Math.max(...d)} odbiega od średniej o ${f2(Math.max(...d) - m)}, a jego kwadrat to ${f2((Math.max(...d) - m) ** 2)}.`],
  };
  return judge({ ok,
    q: `Wyniki ${n} osób: ${list(d)} (x̄ = ${f2(m)}). Raport: „wariancja S² = <b>${f2(claim)}</b>”. Czy to realne?`,
    yes: ["Tak — wielkość pasuje do odchyleń wyników od średniej", `S² = Σ(X − x̄)²/n = ${f2(S2)}; s ≈ ${f2(Math.sqrt(S2))}, czyli wyniki odbiegają od średniej przeciętnie o ok. ${f1(Math.sqrt(S2))} pkt.`],
    no: NO[type] || ["", ""],
    wrong: [["Nie — wariancja musi być mniejsza od średniej", "Nie ma takiej zasady — wariancja może być większa od średniej."],
      ["Nie — wariancja musi być liczbą całkowitą", "Zwykle wychodzi ułamek."],
      ["Nie — wariancję liczy się tylko w rozkładzie normalnym", "Wariancję można policzyć dla dowolnych danych ilościowych."]],
    hint: "Wariancja ≥ 0 i jest kwadratem „typowego odchylenia”. O ile mniej więcej wyniki odbiegają od średniej?",
    why: `S² = Σ(X − x̄)²/n = <b>${f2(S2)}</b> (oszacowanie populacyjne s² = Σ/(n−1) = ${f2(S2 * n / (n - 1))}). Szybkie testy: S² ≥ 0, S² ≤ R², a √S² ≈ typowe odchylenie od średniej.`,
  });
});

const vaN1 = G("c-va-n1", "variance", "Dzielić przez n czy n − 1?", () => {
  let d; do { d = nums(ri(5, 8), 1, 12); } while (sdN(d) < 1);
  const n = d.length, S2 = varN(d), s2 = (S2 * n) / (n - 1), type = chance(OK_P) ? "ok" : pick(["smaller", "equal"]);
  const claim = { ok: s2, smaller: S2 * (n - 1) / n, equal: S2 }[type];
  return judge({ ok: type === "ok",
    q: `Próba n = ${n}: ${list(d)}. Raport: „wariancja w próbie S² = ${f2(S2)}, oszacowanie wariancji w populacji ŝ² = <b>${f2(claim)}</b>”. Czy to realne?`,
    yes: ["Tak — ŝ² dzieli tę samą sumę kwadratów przez n − 1, więc jest nieco większe od S²", `ŝ² = S² · n/(n − 1) = ${f2(S2)} · ${n}/${n - 1} = ${f2(s2)}.`],
    no: [`Nie — ŝ² dzieli tę samą sumę kwadratów przez n − 1 (mniej niż n), więc musi być większe od S²: ${f2(s2)}`, type === "equal" ? "Obie wartości mogą być równe tylko, gdy wszystkie wyniki są identyczne (obie = 0)." : "Podano wartość mniejszą od S² — dzielono przez n + 1 albo pomnożono odwrotnie."],
    wrong: [["Nie — oszacowanie populacyjne zawsze jest mniejsze od wariancji z próby", "Odwrotnie — dzielenie przez n − 1 daje większy wynik."],
      ["Nie — wariancji w populacji nie da się oszacować z próby", "Da się — po to dzieli się przez n − 1."],
      ["Nie — oszacowanie populacyjne dzieli się przez N populacji", "Nie znamy N; dzielimy przez n − 1."]],
    hint: "Ta sama suma kwadratów, mniejszy mianownik…",
    why: `SS = ${f2(S2 * n)}. S² = SS/n = ${f2(S2)}; ŝ² = SS/(n − 1) = <b>${f2(s2)}</b>. Wariancja z próby zaniża zmienność w populacji, więc oszacowanie dzieli przez n − 1.`,
  });
});

const vaUnits = G("c-va-units", "variance", "Wariancja: jednostki i przekształcenia", () => {
  const s = ri(3, 9), k = ri(2, 6);
  const V = pick([
    { ok: true, t: `Wzrost mierzono w cm: „s = ${s} cm, wariancja = ${s * s} cm²”.`, e: `Wariancja jest w jednostkach do kwadratu: ${s}² = ${s * s} cm².` },
    { ok: false, t: `Wzrost mierzono w cm: „s = ${s} cm, wariancja = ${s * s} cm”.`, no: "Nie — wariancja jest w jednostkach do kwadratu (cm²), bo to średnia z kwadratów odchyleń", e: "Dlatego zwykle podajemy s — jest w tych samych jednostkach co wyniki." },
    { ok: false, t: `Wariancja wyników = ${s * s}. Każdy wynik pomnożono przez 2. Raport: „wariancja = ${2 * s * s}”.`, no: `Nie — przy mnożeniu przez 2 odchylenia rosną 2 razy, a ich kwadraty 4 razy: wariancja = ${4 * s * s}`, e: "X · k → wariancja · k², s · |k|." },
    { ok: true, t: `Wariancja wyników = ${s * s}. Każdy wynik pomnożono przez 2. Raport: „wariancja = ${4 * s * s}”.`, e: "Odchylenia rosną 2 razy, kwadraty 4 razy." },
    { ok: false, t: `Wariancja wyników = ${s * s}. Każdemu dodano ${k} pkt. Raport: „wariancja = ${s * s + k}”.`, no: "Nie — dodanie stałej nie zmienia odchyleń od średniej, więc wariancja się nie zmienia", e: `Średnia też rośnie o ${k}, więc X − x̄ zostaje takie samo: wariancja = ${s * s}.` },
  ]);
  return judge({ ok: V.ok, q: `${V.t} Czy to się zgadza?`,
    yesWrong: "Tak — to się zgadza",
    yes: ["Tak — tak zachowuje się wariancja", V.e], no: [V.no || "", V.e],
    wrong: [["Nie — wariancja ma zawsze te same jednostki co wyniki", "To s ma jednostki wyników; wariancja — ich kwadrat."],
      ["Nie — wariancja zmienia się dokładnie tak jak średnia", "Średnia reaguje na dodawanie, wariancja nie; przy mnożeniu wariancja rośnie k² razy."],
      ["Nie — wariancja nie zależy od wyników", "Zależy — od odchyleń wyników od średniej."]],
    hint: "Wariancja = średnia z KWADRATÓW odchyleń.",
    why: `${V.e} Reguły: X + k → wariancja bez zmian; X · k → wariancja · k²; jednostka wariancji = jednostka² (cm², pkt²).`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  13. ODCHYLENIE STANDARDOWE
// ════════════════════════════════════════════════════════════════════════════
const sdClaim = G("c-sd-claim", "sd", "Czy to odchylenie standardowe jest realne?", () => {
  let d; do { d = nums(ri(7, 10), 2, 20); } while (sdN(d) < 2.5);
  const m = mean(d), s = sdN(d), R = Math.max(...d) - Math.min(...d), ok = chance(OK_P);
  const type = ok ? "ok" : pick(["var", "big", "tiny"]);
  const claim = { ok: s, var: s * s, big: R + ri(3, 10), tiny: ri(1, 3) / 10 }[type];
  const maxDev = Math.max(...d.map((x) => Math.abs(x - m)));
  const NO = {
    var: [`Nie — to wygląda na wariancję; s = √S² ≈ ${f2(s)}`, `Wyniki odbiegają od średniej przeciętnie o kilka punktów, a nie o ${f2(claim)}. Zapomniano o pierwiastku.`],
    big: [`Nie — s to „przeciętne” odchylenie od średniej, a żaden wynik nie odbiega od niej o więcej niż ${f2(maxDev)}`, "Przeciętne odchylenie nie może być większe od największego odchylenia."],
    tiny: ["Nie — wyniki wyraźnie się różnią, więc przeciętne odchylenie nie może wynosić ułamka punktu", `Wyniki odbiegają od średniej (${f2(m)}) nawet o ${f2(maxDev)} pkt.`],
  };
  return judge({ ok,
    q: `Wyniki: ${list(d)} (x̄ = ${f2(m)}). Raport: „odchylenie standardowe s = <b>${f2(claim)}</b>”. Czy to realne?`,
    yes: ["Tak — pasuje do tego, o ile wyniki przeciętnie odbiegają od średniej", `S² = ${f2(s * s)}, s = √S² = ${f2(s)}.`],
    no: NO[type] || ["", ""],
    wrong: [["Nie — s musi być równe połowie rozstępu", "Nie ma takiej zasady; s zwykle jest mniejsze od R/2."],
      ["Nie — s musi być liczbą całkowitą", "Pierwiastek zwykle daje ułamek."],
      ["Nie — s musi być większe od średniej", "Nie ma takiej zasady."]],
    hint: "Heurystyka z wykładu: s ≈ przeciętna wartość, o jaką wyniki odbiegają od średniej.",
    why: `S² = ${f2(s * s)}, s = <b>${f2(s)}</b>. Szybki test: s nie przekracza największego odchylenia od średniej (${f2(maxDev)}) i jest „typową” odległością wyniku od średniej.`,
  });
});

const sdPair = G("c-sd-pair", "sd", "Wariancja i s — czy pasują?", () => {
  const big = chance(0.6), s = big ? ri(3, 9) : pick([0.2, 0.3, 0.4, 0.5]), S2 = s * s;
  const type = chance(OK_P) ? "ok" : big ? "half" : "square";
  const claim = { ok: s, half: S2 / 2, square: S2 * S2 }[type];
  return judge({ ok: type === "ok",
    q: `Raport: „S² = <b>${fmt(S2, 4)}</b>, s = <b>${fmt(claim, 4)}</b>”. Czy te liczby do siebie pasują?`,
    yesWrong: "Tak — liczby pasują",
    yes: ["Tak — s = √S²", `√${fmt(S2, 4)} = ${fmt(s, 4)}.`],
    no: type === "half"
      ? [`Nie — s to pierwiastek z wariancji, a nie jej połowa: √${fmt(S2, 4)} = ${fmt(s, 4)}`, `${fmt(claim, 4)} · ${fmt(claim, 4)} ≠ ${fmt(S2, 4)}.`]
      : [`Nie — gdy S² < 1, pierwiastek jest WIĘKSZY od S²: s = √${fmt(S2, 4)} = ${fmt(s, 4)}`, "Podano kwadrat wariancji zamiast pierwiastka. Dla liczb mniejszych od 1 pierwiastek rośnie, a kwadrat maleje."],
    wrong: [["Nie — s zawsze musi być mniejsze od S²", "Dla S² < 1 jest odwrotnie (√0,25 = 0,5)."],
      ["Nie — s i S² muszą być równe", "Równe są tylko dla 0 i 1."],
      ["Nie — s nie da się policzyć z samej wariancji", "Da się: s = √S²."]],
    hint: "Podnieś podane s do kwadratu.",
    why: `s = √S² = √${fmt(S2, 4)} = <b>${fmt(s, 4)}</b>. Test: s² musi dać S². Uwaga na wartości < 1: wtedy s > S².`,
  });
});

const sdCompare = G("c-sd-cmp", "sd", "Która grupa ma większe s?", () => {
  const m = ri(8, 12), A = shuffle(nums(7, m - 2, m + 2)), B = shuffle([...nums(4, m - 7, m - 3), ...nums(3, m + 3, m + 7)]);
  const sA = sdN(A), sB = sdN(B), ok = chance(OK_P), [cA, cB] = ok ? [sA, sB] : [sB, sA];
  return judge({ ok,
    q: `Grupa A: ${list(A)}<br>Grupa B: ${list(B)}<br>Raport: „s<sub>A</sub> = <b>${f2(cA)}</b>, s<sub>B</sub> = <b>${f2(cB)}</b>”. Czy to realne?`,
    yes: ["Tak — wyniki B są dużo bardziej rozrzucone, więc s_B > s_A", `A mieści się w ${m - 2}–${m + 2}, B rozciąga się od ${Math.min(...B)} do ${Math.max(...B)}.`],
    no: ["Nie — wartości są zamienione: wyniki B są dużo bardziej rozrzucone, więc to s_B musi być większe", `s<sub>A</sub> = ${f2(sA)}, s<sub>B</sub> = ${f2(sB)}. Wystarczy rzut oka na rozstęp grup.`],
    wrong: [["Nie — przy podobnych średnich s musi być takie samo", "Średnia nie mówi o rozrzucie."],
      ["Nie — większe s ma zawsze grupa z większą średnią", "s nie zależy od położenia."],
      ["Nie — s porównuje się tylko dla grup tej samej liczebności", "Można porównywać dowolne grupy."]],
    hint: "Która grupa ma wyniki bardziej „rozrzucone”?",
    why: `s<sub>A</sub> = ${f2(sA)}, s<sub>B</sub> = <b>${f2(sB)}</b>. Szacowanie na oko: s to typowa odległość wyniku od średniej — w B wyniki są daleko od środka.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  14. ROZKŁAD NORMALNY
// ════════════════════════════════════════════════════════════════════════════
const CTX = [{ M: 100, s: 15, x: "IQ" }, { M: 50, s: 10, x: "wynik T" }, { M: 60, s: 15, x: "wynik testu" }, { M: 100, s: 10, x: "wynik testu" }, { M: 20, s: 4, x: "liczba punktów" }];
const noRule = G("c-no-rule", "normal", "Reguła 68–95–99,7", () => {
  const { M, s, x } = pick(CTX);
  const R = pick([
    { t: `między ${M - s} a ${M + s}`, v: 68, bad: [34, 95], e: "±1 s od średniej to ok. 68% (po 34% z każdej strony)." },
    { t: `między ${M - 2 * s} a ${M + 2 * s}`, v: 95, bad: [68, 50], e: "±2 s od średniej to ok. 95%." },
    { t: `powyżej ${M + s}`, v: 16, bad: [34, 50], e: "Powyżej +1 s: 50% − 34% ≈ 16%." },
    { t: `powyżej ${M + 2 * s}`, v: 2.3, bad: [25, 14], e: "Powyżej +2 s: 50% − 47,7% ≈ 2,3%." },
    { t: `poniżej ${M}`, v: 50, bad: [68, 34], e: "Rozkład jest symetryczny: poniżej średniej jest dokładnie połowa." },
  ]);
  const ok = chance(OK_P), claim = ok ? R.v : pick(R.bad);
  return judge({ ok,
    q: `${x[0].toUpperCase() + x.slice(1)} ma rozkład normalny: M = ${M}, s = ${s}. Raport: „<b>${fmt(claim, 1)}%</b> osób ma ${x} ${R.t}”. Realne?`,
    yes: ["Tak — zgadza się z regułą 68–95–99,7", R.e],
    no: [`Nie — w rozkładzie normalnym to ok. ${fmt(R.v, 1)}%`, R.e],
    wrong: [["Nie — w rozkładzie normalnym każdy przedział o szerokości s ma tyle samo wyników", "Najwięcej wyników jest blisko średniej; im dalej, tym mniej."],
      ["Nie — procent zależy od średniej, więc bez danych surowych nie da się go ocenić", "W rozkładzie normalnym procent zależy tylko od odległości w jednostkach s."],
      ["Nie — dalej niż 1 s od średniej nie ma już żadnych wyników", "Jest ich ok. 32%."]],
    hint: "68% w ±1 s, 95% w ±2 s, 99,7% w ±3 s. Rozkład jest symetryczny.",
    why: `${R.e} Reguła: ok. 68% wyników w M ± 1 s, 95% w M ± 2 s, 99,7% w M ± 3 s.`,
  });
});

const noProp = G("c-no-prop", "normal", "Cechy krzywej normalnej", () => {
  const { M, s } = pick(CTX);
  const V = pick([
    { ok: false, t: `„Wyniki mają rozkład normalny, wyraźnie skośny w prawo.”`, no: "Nie — rozkład normalny jest symetryczny, więc nie może być skośny", e: "Krzywa normalna jest jednomodalna i symetryczna względem średniej." },
    { ok: true, t: `„Rozkład normalny: M = ${M}, Me = ${M}, Mo = ${M}.”`, e: "Symetryczny i jednomodalny → M = Me = Mo." },
    { ok: true, t: `„W rozkładzie normalnym (M = ${M}, s = ${s}) wynik ${M + 4 * s} jest możliwy, choć bardzo rzadki.”`, e: "Krzywa jest asymptotyczna względem osi — teoretycznie nigdy nie spada do zera." },
    { ok: false, t: `„W rozkładzie normalnym (M = ${M}, s = ${s}) żaden wynik nie może przekroczyć ${M + 3 * s}.”`, no: "Nie — krzywa jest asymptotyczna: poza ±3 s jest ok. 0,3% wyników, a nie 0", e: "Wyniki dalej niż 3 s od średniej są rzadkie, ale możliwe." },
    { ok: false, t: `„Rozkład normalny tych wyników ma dwie dominanty: ${M - s} i ${M + s}.”`, no: "Nie — rozkład normalny jest jednomodalny (jeden szczyt w średniej)", e: "Dwa szczyty to rozkład dwumodalny, nie normalny." },
  ]);
  return judge({ ok: V.ok, q: `${V.t} Czy to możliwe?`,
    yesWrong: "Tak — to możliwe",
    yes: ["Tak — zgadza się z cechami krzywej normalnej", V.e], no: [V.no || "", V.e],
    wrong: [["Nie — w rozkładzie normalnym M zawsze wynosi 0", "M = 0 ma tylko standaryzowany rozkład z; ogólnie średnia może być dowolna."],
      ["Nie — rozkład normalny opisuje tylko wyniki IQ", "Opisuje wiele zmiennych ciągłych (w teorii)."],
      ["Nie — rozkład normalny jest zawsze dyskretny", "W teorii jest ciągły (choć w praktyce dane bywają dyskretne)."]],
    hint: "Cechy: jednomodalny, symetryczny, asymptotyczny, ciągły (w teorii).",
    why: `${V.e} Krzywa normalna: jednomodalna, symetryczna (M = Me = Mo), asymptotyczna względem osi X, ciągła w teorii.`,
  });
});

const noSd = G("c-no-sd", "normal", "s na oko z zakresu wyników", () => {
  const s = pick([5, 8, 10, 12, 15, 20]), M = pick([50, 80, 100, 120]), lo = M - 3 * s + ri(-2, 2), hi = M + 3 * s + ri(-2, 2);
  const type = chance(OK_P) ? "ok" : pick(["big", "tiny"]);
  const claim = { ok: s + ri(-1, 1), big: Math.round((hi - lo) * (0.7 + Math.random() * 0.3)), tiny: ri(1, 2) }[type];
  return judge({ ok: type === "ok",
    q: `Wyniki 500 osób mają rozkład zbliżony do normalnego, od ${lo} do ${hi} (M ≈ ${M}). Raport: „s = <b>${claim}</b>”. Czy to realne?`,
    yes: [`Tak — prawie wszystkie wyniki mieszczą się w M ± 3 s, więc s ≈ rozstęp/6 ≈ ${fmt((hi - lo) / 6, 1)}`, "Szybkie oszacowanie s z zakresu danych."],
    no: [`Nie — prawie wszystkie wyniki (99,7%) leżą w M ± 3 s, więc rozstęp ≈ 6 s i s ≈ ${fmt((hi - lo) / 6, 1)}`, type === "big" ? `Przy s = ${claim} wyniki rozciągałyby się na ok. ${6 * claim} punktów, a nie ${hi - lo}.` : `Przy s = ${claim} prawie wszystkie wyniki byłyby między ${M - 3 * claim} a ${M + 3 * claim}.`],
    wrong: [["Nie — s zawsze wynosi połowę rozstępu", "W rozkładzie normalnym rozstęp to ok. 6 s, nie 2 s."],
      ["Nie — s musi być równe średniej", "Nie ma takiej zasady."],
      ["Nie — s nie da się oszacować bez danych surowych", "Da się w przybliżeniu: rozstęp ≈ 6 s."]],
    hint: "Ile odchyleń standardowych mieści się między najmniejszym a największym wynikiem w rozkładzie normalnym?",
    why: `Rozstęp = ${hi - lo} ≈ 6 s → s ≈ <b>${fmt((hi - lo) / 6, 1)}</b>. Prawdziwe s = ${s}.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  15. WYNIK STANDARYZOWANY z
// ════════════════════════════════════════════════════════════════════════════
function zCase() {
  for (;;) {
    const { M, s } = pick(CTX), X = M + ri(-25, 25) * Math.max(1, Math.round(s / 10));
    const z = Math.round(((X - M) / s) * 100) / 100;
    if (Math.abs(z) >= 0.3 && Math.abs(z) <= 2.6) return { M, s, X, z };
  }
}
const zCalc = G("c-z-calc", "z", "Czy ten wynik z jest realny?", () => {
  const { M, s, X, z } = zCase(), below = X < M, ok = chance(OK_P);
  const type = ok ? "ok" : Math.abs(X - M) >= 4 ? pick(["sign", "nodiv"]) : "sign";
  const claim = { ok: z, sign: -z, nodiv: X - M }[type];
  return judge({ ok,
    q: `M = ${M}, s = ${s}, wynik surowy X = ${X}. Raport: „z = <b>${f2(claim)}</b>”. Czy to realne?`,
    yes: ["Tak — znak i wielkość z się zgadzają", `z = (${X} − ${M})/${s} = ${f2(z)}: X leży ${f2(Math.abs(z))} s ${below ? "poniżej" : "powyżej"} średniej.`],
    no: type === "sign"
      ? [`Nie — X leży ${below ? "poniżej" : "powyżej"} średniej, więc z musi być ${below ? "ujemny" : "dodatni"}`, `z = (X − M)/s = (${X} − ${M})/${s} = ${f2(z)}.`]
      : [`Nie — X jest tylko ${Math.abs(X - M)} pkt od średniej, czyli ${f2(Math.abs(z))} s; zapomniano podzielić przez s`, `z = ${f2(claim)} oznaczałoby wynik ${f2(Math.abs(claim))} odchyleń standardowych od średniej — skrajnie rzadki.`],
    wrong: [["Nie — wynik z zawsze jest dodatni", "Wyniki poniżej średniej mają z ujemne."],
      ["Nie — z musi być liczbą całkowitą", "z to zwykle ułamek (odczytujemy go z dokładnością do 0,01)."],
      ["Nie — wynik z liczy się jako X/s", "Najpierw odejmujemy średnią: z = (X − M)/s."]],
    hint: "Czy X jest powyżej czy poniżej średniej? O ile odchyleń standardowych?",
    why: `z = (X − M)/s = (${X} − ${M})/${s} = <b>${f2(z)}</b>. Szybkie testy: znak z = strona średniej; |z| = odległość w jednostkach s (|z| > 3 zdarza się bardzo rzadko).`,
  });
});

const zBelow = G("c-z-below", "z", "Jaki odsetek leży poniżej?", () => {
  const { M, s, X, z } = zCase(), p = phi(z) * 100, ok = chance(OK_P);
  const type = ok ? "ok" : pick(["other", "between"]);
  const claim = { ok: p, other: 100 - p, between: Math.abs(p - 50) }[type];
  const bad = z < 0 ? claim > 50 : claim < 50;
  const tA = `Tabela A dla |z| = ${f2(Math.abs(z))}: między średnią a z = ${f2(Math.abs(p - 50))}%, dalej od średniej = ${f2(Math.min(p, 100 - p))}%.`;
  return judge({ ok,
    q: `M = ${M}, s = ${s}, X = ${X} (z = ${f2(z)}). Raport: „poniżej tego wyniku leży <b>${f2(claim)}%</b> wyników”. Czy to realne?`,
    yes: [`Tak — X jest ${z < 0 ? "poniżej" : "powyżej"} średniej, więc poniżej leży ${z < 0 ? "mniej" : "więcej"} niż 50%, a wielkość zgadza się z tabelą A`, tA],
    no: bad
      ? [`Nie — X leży ${z < 0 ? "poniżej" : "powyżej"} średniej, więc poniżej niego jest ${z < 0 ? "mniej" : "więcej"} niż 50% wyników`, `${tA} Poprawnie: ${f2(p)}%.`]
      : [`Nie — ${f2(claim)}% to odsetek ${type === "between" ? "między średnią a wynikiem" : "po drugiej stronie wyniku"}; poniżej leży ${f2(p)}%`, tA],
    wrong: [["Nie — poniżej każdego wyniku leży zawsze 50% wyników", "50% leży poniżej średniej, nie poniżej dowolnego wyniku."],
      ["Nie — odsetek poniżej to po prostu z · 10%", "Zależność nie jest liniowa — odczytuje się ją z tabeli A."],
      ["Nie — dla ujemnego z odsetek też jest ujemny", "Odsetek zawsze mieści się między 0 a 100%."]],
    hint: "Najpierw sprawdź stronę: z < 0 → poniżej mniej niż 50%. Potem tabela A.",
    why: `z = ${f2(z)}. ${tA} Poniżej X: <b>${f2(p)}%</b>. Rysunek krzywej z zaznaczonym z zawsze pomaga wybrać właściwą kolumnę tabeli.`,
  });
});

const zBetween = G("c-z-betw", "z", "Odsetek między wynikiem a średnią", () => {
  const { M, s, X, z } = zCase(), b = Math.abs(phi(z) - 0.5) * 100, ok = chance(OK_P);
  const type = ok ? "ok" : Math.abs(z) >= 1.2 ? pick(["over", "small"]) : "over";
  const claim = { ok: b, over: 50 + b, small: ri(3, 12) }[type];
  return judge({ ok,
    q: `M = ${M}, s = ${s}, X = ${X} (z = ${f2(z)}). Raport: „między tym wynikiem a średnią leży <b>${f2(claim)}%</b> wyników”. Czy to realne?`,
    yes: ["Tak — mniej niż 50% i wielkość zgadza się z tabelą A", `Tabela A dla |z| = ${f2(Math.abs(z))}: ${f2(b)}%.`],
    no: type === "over"
      ? ["Nie — po jednej stronie średniej leży tylko 50% wyników, więc między średnią a wynikiem jest mniej niż 50%", `${f2(claim)}% to odsetek poniżej (lub powyżej) wyniku, a nie między nim a średnią. Poprawnie: ${f2(b)}%.`]
      : [`Nie — już przy |z| = 1 między średnią a wynikiem jest ok. 34%, a tu |z| = ${f2(Math.abs(z))}`, `Poprawnie: ${f2(b)}%.`],
    wrong: [["Nie — dla wyniku poniżej średniej ten odsetek jest ujemny", "Odsetek jest zawsze dodatni; znak z mówi tylko o stronie."],
      ["Nie — między wynikiem a średnią zawsze leży 34%", "34% tylko dla |z| = 1."],
      ["Nie — ten odsetek równa się z · 100%", "Odsetek odczytuje się z tabeli A, a nie z mnożenia."]],
    hint: "Ile maksymalnie wyników leży po jednej stronie średniej?",
    why: `Tabela A (kolumna „między M a z”) dla |z| = ${f2(Math.abs(z))}: <b>${f2(b)}%</b>. Ten odsetek jest zawsze < 50%, a przy |z| = 1 wynosi ok. 34%.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  16. KORELACJA PEARSONA
// ════════════════════════════════════════════════════════════════════════════
function corrPts(kind, n = 18) {
  for (let t = 0; t < 200; t++) {
    const xs = Array.from({ length: n }, () => ri(10, 100) / 10);
    const b = kind === "pos" ? ri(5, 12) / 10 : kind === "neg" ? -ri(5, 12) / 10 : 0;
    const ys = xs.map((x) => Math.round((20 + b * x + gauss() * (kind === "none" ? 3 : 1.2)) * 10) / 10);
    const r = pearson(xs, ys);
    if ((kind === "none" && Math.abs(r) < 0.2) || (kind !== "none" && Math.abs(r) > 0.75 && Math.sign(r) === Math.sign(b))) return { xs, ys, r };
  }
  return corrPts(kind, n);
}
const rScatter = G("c-r-scatter", "corr", "r na oko z wykresu", () => {
  const kind = pick(["pos", "neg", "none"]), { xs, ys, r } = corrPts(kind), ok = chance(OK_P);
  const type = ok ? "ok" : kind === "none" ? pick(["strong", "over"]) : pick(["sign", "over"]);
  const claim = { ok: r, sign: -r, over: (r < 0 ? -1 : 1) * (1 + ri(1, 6) / 10), strong: pick([-1, 1]) * ri(85, 95) / 100 }[type];
  const dir = kind === "pos" ? "rosną (X↑ → Y↑)" : kind === "neg" ? "maleją (X↑ → Y↓)" : "tworzą bezładną chmurę";
  return judge({ ok,
    q: `Wykres rozrzutu dla ${xs.length} osób. Raport: „r = <b>${f2(claim)}</b>”. Czy to realne?`,
    fig: scatterSvg(xs.map((x, i) => [x, ys[i]])),
    yes: [`Tak — punkty ${dir}, a siła pasuje do tego, jak ciasno leżą`, `Policzone r = ${f2(r)}.`],
    no: type === "over" ? ["Nie — r zawsze mieści się między −1 a 1", `|r| > 1 jest niemożliwe (r to wystandaryzowana kowariancja). Tu r = ${f2(r)}.`]
      : type === "sign" ? [`Nie — punkty ${dir}, więc r musi być ${kind === "pos" ? "dodatnie" : "ujemne"}`, `Kierunek: znak r. Tu r = ${f2(r)}.`]
        : ["Nie — punkty tworzą bezładną chmurę, więc |r| jest bliskie 0, a nie ok. 0,9", `Silna korelacja oznacza punkty ułożone blisko prostej. Tu r = ${f2(r)}.`],
    wrong: [["Nie — r nie może być ujemne", "Może — ujemne r to związek odwrotny."],
      ["Nie — r można ocenić tylko z obliczeń, nie z wykresu", "Kierunek i przybliżoną siłę widać na wykresie od razu."],
      ["Nie — r mówi o średnich, a nie o układzie punktów", "r mówi o sile i kierunku związku liniowego."]],
    hint: "Kierunek: czy chmura idzie w górę, czy w dół? Siła: jak blisko prostej leżą punkty?",
    why: `r = <b>${f2(r)}</b>. Szybka kontrola: −1 ≤ r ≤ 1; znak = kierunek chmury; |r| bliskie 1 = punkty blisko prostej, bliskie 0 = bezładna chmura.`,
  });
});

const rData = G("c-r-data", "corr", "r z małej tabeli", () => {
  let xs, ys, r;
  do {
    xs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5).map((x) => x + ri(0, 1));
    const sg = pick([1, -1]);
    ys = xs.map((x) => (sg > 0 ? x : 12 - x) + ri(-1, 1));
    r = pearson(xs, ys);
  } while (Math.abs(r) < 0.7 || Math.abs(r) > 0.99);
  const ok = chance(OK_P), type = ok ? "ok" : pick(["sign", "over"]);
  const claim = { ok: r, sign: -r, over: Math.sign(r) * (1 + ri(1, 5) / 10) }[type];
  const up = r > 0;
  return judge({ ok,
    q: `Dane 5 osób. Raport: „korelacja Pearsona r = <b>${f2(claim)}</b>”. Czy to realne?`,
    fig: table(["Osoba", "X", "Y"], xs.map((x, i) => ["ABCDE"[i], x, ys[i]])),
    yes: [`Tak — gdy X rośnie, Y ${up ? "też rośnie" : "maleje"}, i to dość regularnie`, `r = ${f2(r)}.`],
    no: type === "sign" ? [`Nie — gdy X rośnie, Y ${up ? "też rośnie" : "maleje"}, więc r musi być ${up ? "dodatnie" : "ujemne"}`, `Ułóż osoby według X i zobacz, co robi Y. Tu r = ${f2(r)}.`]
      : ["Nie — r zawsze mieści się między −1 a 1", `Poprawnie r = ${f2(r)}.`],
    wrong: [["Nie — przy 5 osobach r zawsze jest bliskie 0", "Nawet przy małej próbie r może być wysokie."],
      ["Nie — r liczy się tylko dla zmiennych porządkowych", "Pearson jest dla zmiennych ilościowych (Spearman dla porządkowych)."],
      ["Nie — r musi być równe różnicy średnich X i Y", "r nie zależy od średnich, tylko od współzmienności."]],
    hint: "Posortuj osoby według X. Co dzieje się z Y?",
    why: `x̄ = ${f2(mean(xs))}, ȳ = ${f2(mean(ys))}; r = Σ(X−x̄)(Y−ȳ)/√(SS<sub>X</sub>·SS<sub>Y</sub>) = <b>${f2(r)}</b>. Przed liczeniem warto przewidzieć znak — wynik o złym znaku od razu zdradza błąd.`,
  });
});

const CATS = [[0, 0.2, "brak/słaba"], [0.2, 0.5, "średnia"], [0.5, 0.8, "mocna"], [0.8, 1, "bardzo mocna"]];
const rInterp = G("c-r-interp", "corr", "Jak silna jest ta korelacja?", () => {
  let a; do { a = ri(3, 97) / 100; } while (CATS.some(([lo]) => Math.abs(a - lo) < 0.04) || a > 0.96);
  const r = a * pick([1, -1]), ci = CATS.findIndex(([lo, hi]) => a >= lo && a < hi), dir = r > 0 ? "dodatnia" : "ujemna";
  const type = chance(OK_P) ? "ok" : pick(["cat", "dir", ...(r < 0 && a >= 0.5 ? ["negweak"] : [])]);
  const wrongCat = CATS[ci === 0 ? 2 : ci === 3 ? 1 : pick([ci - 1, ci + 1].filter((i) => i >= 0 && i < 4))][2];
  const text = { ok: `${CATS[ci][2]} korelacja ${dir}`, cat: `${wrongCat} korelacja ${dir}`, dir: `${CATS[ci][2]} korelacja ${r > 0 ? "ujemna" : "dodatnia"}`, negweak: "słaba korelacja, bo jest ujemna" }[type];
  return judge({ ok: type === "ok",
    q: `r = <b>${f2(r)}</b>. Interpretacja w raporcie (wg ram: 0–0,2 brak/słaba, 0,2–0,5 średnia, 0,5–0,8 mocna, 0,8–1 bardzo mocna): „<b>${text}</b>”. Poprawna?`,
    yesWrong: "Tak — interpretacja jest poprawna",
    yes: ["Tak — siła z |r|, kierunek ze znaku", `|r| = ${f2(a)} → ${CATS[ci][2]}; znak ${r > 0 ? "+" : "−"} → ${dir}.`],
    no: type === "dir" ? [`Nie — znak r jest ${r > 0 ? "dodatni" : "ujemny"}, więc korelacja jest ${dir}`, "Kierunek odczytujemy ze znaku r."]
      : [`Nie — siłę ocenia się po |r| = ${f2(a)}, czyli ${CATS[ci][2]}; znak mówi tylko o kierunku`, type === "negweak" ? `Korelacja ${f2(r)} jest tak samo silna jak ${f2(a)} — różni się tylko kierunkiem.` : `${f2(a)} mieści się w przedziale ${fmt(CATS[ci][0], 1)}–${fmt(CATS[ci][1], 1)}.`],
    wrong: [["Nie — ujemna korelacja zawsze oznacza brak związku", "Ujemna korelacja to związek odwrotny — może być bardzo silny."],
      ["Nie — o sile korelacji decyduje wielkość próby", "Siłę opisuje |r|; wielkość próby wpływa na istotność, nie na samą siłę."],
      ["Nie — korelacja powyżej 0,5 to zawsze związek przyczynowy", "Korelacja nie dowodzi przyczynowości."]],
    hint: "Siła = |r|, kierunek = znak.",
    why: `|r| = ${f2(a)} → <b>${CATS[ci][2]}</b>, kierunek: <b>${dir}</b>. Ramy są umowne — wszystko zależy od kontekstu badania (0,02 może mieć znaczenie praktyczne, a 0,95 może nie świadczyć o żadnym związku przyczynowym).`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  17. KORELACJA TO NIE PRZYCZYNOWOŚĆ
// ════════════════════════════════════════════════════════════════════════════
const NOT_CAUSE = ["Tak — wniosek jest uprawniony", "Korelacja sama w sobie nie mówi, co jest przyczyną, a co skutkiem."];
const causalItems = [
  { q: "Sprzedaż lodów koreluje z liczbą utonięć (r = 0,8). Wniosek: „lody zwiększają ryzyko utonięcia”. Czy wniosek jest uprawniony?",
    a: [["Nie — za oba zjawiska może odpowiadać trzecia zmienna: upał (lato)", "W upały ludzie i jedzą więcej lodów, i częściej się kąpią."], NOT_CAUSE,
      ["Nie — r = 0,8 to za słaba korelacja na wnioski", "0,8 to korelacja (bardzo) mocna; problemem nie jest siła, tylko przyczynowość."],
      ["Nie — odwrotnie: utonięcia zwiększają sprzedaż lodów", "To też byłby wniosek przyczynowy bez podstaw."]],
    hint: "Czy jest coś, co wpływa na oba zjawiska?", why: "Korelacja to nie związek przyczynowo-skutkowy. Typowa pułapka: zmienna uwikłana (tu temperatura)." },
  { q: "Liczba filmów z pewnym aktorem w danym roku koreluje z liczbą utonięć w basenach (r = 0,67). Wniosek: „jego filmy powodują utonięcia”.",
    a: [["Nie — to pozorna (przypadkowa) korelacja: przy wielu porównaniach takie zbieżności się zdarzają", "Na stronach typu „spurious correlations” są setki takich par — bez żadnego mechanizmu."], NOT_CAUSE,
      ["Tak, jeśli korelacja jest istotna statystycznie", "Istotność nie zamienia korelacji w przyczynowość."],
      ["Nie — r = 0,67 to brak związku", "0,67 to korelacja mocna; problemem jest brak mechanizmu, nie siła."]],
    hint: "Czy istnieje jakikolwiek sensowny mechanizm?", why: "Korelacje pozorne (spurious correlations) pokazują, że współwystępowanie danych nie oznacza związku przyczynowego." },
  { q: "U dzieci rozmiar buta koreluje z umiejętnością czytania (r = 0,7). Wniosek: „większe stopy pomagają czytać”.",
    a: [["Nie — oba zależą od wieku dziecka", "Starsze dzieci mają większe stopy i dłużej uczą się czytać."], NOT_CAUSE,
      ["Nie — korelacji nie liczy się dla dzieci", "Można ją liczyć dla dowolnej grupy."],
      ["Tak, bo korelacja jest dodatnia", "Znak mówi o kierunku, nie o przyczynowości."]],
    hint: "Co rośnie razem z dzieckiem?", why: "Trzecia zmienna (wiek) tworzy związek między dwiema niepowiązanymi przyczynowo zmiennymi." },
  { q: "Płeć zakodowano 0/1, kolor oczu 1–4 i policzono między nimi korelację Pearsona: r = 0,32. Czy ten wynik ma sens?",
    a: [["Nie — Pearsona liczy się tylko dla dwóch zmiennych ilościowych, a to zmienne nominalne", "Kody kolorów są dowolne — inne kodowanie dałoby inne r."],
      ["Tak — r = 0,32 to średnia korelacja", "Liczba wyszła, ale nic nie znaczy — kody nie są wartościami liczbowymi."],
      ["Nie — r musi wynosić 0 dla płci", "Problemem jest rodzaj skali, a nie konkretna wartość."],
      ["Tak, jeśli próba jest duża", "Wielkość próby nie naprawi złej skali."]],
    hint: "Na jakiej skali są te zmienne?", why: "Pearson: dwie zmienne ilościowe. Spearman: zmienne porządkowe. Dla nominalnych potrzebne są inne miary związku." },
  { q: "Korelacja godzin nauki z wynikiem kolokwium: r = 0,6. Wniosek: „to mocny związek; może wynikać z tego, że nauka podnosi wynik, ale sama korelacja tego nie dowodzi”. Ocena?",
    a: [["Wniosek jest poprawny", "Ocena siły (0,5–0,8 mocna) się zgadza, a autor nie twierdzi, że korelacja dowodzi przyczynowości."],
      ["Wniosek jest błędny — korelacja 0,6 dowodzi, że nauka podnosi wynik", "Korelacja nigdy sama nie dowodzi przyczynowości."],
      ["Wniosek jest błędny — 0,6 to słaba korelacja", "Według ram z zajęć 0,5–0,8 to korelacja mocna."],
      ["Wniosek jest błędny — korelację trzeba podawać w procentach", "r podaje się jako liczbę od −1 do 1."]],
    hint: "Czy autor nadużywa korelacji?", why: "Dobra interpretacja: siła i kierunek + ostrożność co do przyczynowości." },
  { q: "W próbie miliona osób korelacja zażywania leku z rzadszymi zawałami wynosi r = 0,02. Wniosek: „taka korelacja na pewno nie ma żadnego znaczenia praktycznego”.",
    a: [["Nie — zależy od kontekstu: przy milionach osób nawet r = 0,02 może oznaczać wiele uratowanych żyć", "Ramy interpretacyjne są arbitralne; znaczenie zależy od tego, czego dotyczy związek."],
      ["Tak — r poniżej 0,2 nigdy nie ma znaczenia", "Wykład podkreśla: wynik 0,02 może mieć istotne przełożenie na rzeczywistość."],
      ["Tak — przy tak dużej próbie korelacja musi być fałszywa", "Duża próba daje raczej bardziej stabilny wynik."],
      ["Nie — r = 0,02 to bardzo mocna korelacja", "To korelacja bardzo słaba — ale słaba ≠ bez znaczenia."]],
    hint: "Czy ramy 0–0,2–0,5–0,8 są sztywne?", why: "Wszystko zależy od kontekstu badania — siła r to nie to samo co jego praktyczna waga." },
];
const causal = bank("c-causal", "causal", "Korelacja a przyczynowość", causalItems);

// ════════════════════════════════════════════════════════════════════════════
//  18. REGRESJA LINIOWA
// ════════════════════════════════════════════════════════════════════════════
const regLine = G("c-reg-line", "regr", "Czy to równanie pasuje do wykresu?", () => {
  const kind = pick(["pos", "neg"]), { xs, ys, r } = corrPts(kind, 14), { b, a, mx, my } = fit(xs, ys), ok = chance(OK_P);
  const type = ok ? "ok" : pick(["sign", "shift"]);
  const sb = type === "sign" ? -b : b, sa = type === "sign" ? my + b * mx : type === "shift" ? a + pick([-1, 1]) * ri(8, 15) : a;
  return judge({ ok,
    q: `Wykres rozrzutu (x̄ = ${f2(mx)}, ȳ = ${f2(my)}). Raport: „linia regresji: <b>${eq(sb, sa)}</b>”. Czy to realne?`,
    fig: scatterSvg(xs.map((x, i) => [x, ys[i]])),
    yes: ["Tak — nachylenie ma znak chmury punktów, a linia przechodzi przez (x̄, ȳ)", `Podstaw x̄: ${f2(sb)}·${f2(mx)} ${sa < 0 ? "−" : "+"} ${f2(Math.abs(sa))} = ${f2(sb * mx + sa)} ≈ ȳ.`],
    no: type === "sign"
      ? [`Nie — punkty ${kind === "pos" ? "rosną" : "maleją"}, więc nachylenie b musi być ${kind === "pos" ? "dodatnie" : "ujemne"} (znak b = znak r)`, `r = ${f2(r)}; poprawnie ${eq(b, a)}.`]
      : [`Nie — linia regresji przechodzi przez punkt (x̄, ȳ), a tu dla X = ${f2(mx)} daje Y′ = ${f2(sb * mx + sa)} zamiast ${f2(my)}`, `Wyraz wolny a = ȳ − b·x̄ = ${f2(a)}. Poprawnie: ${eq(b, a)}.`],
    wrong: [["Nie — wyraz wolny a musi być dodatni", "a może być dowolny; to wartość Y′ dla X = 0."],
      ["Nie — nachylenie b musi być równe r", "b = r·s<sub>Y</sub>/s<sub>X</sub>; równe r tylko przy równych odchyleniach."],
      ["Nie — linia regresji musi przechodzić przez punkt (0, 0)", "Przechodzi przez (x̄, ȳ), nie przez początek układu."]],
    hint: "Dwa testy: znak b vs kierunek chmury; czy linia przechodzi przez (x̄, ȳ)?",
    why: `b = Σ(X−x̄)(Y−ȳ)/Σ(X−x̄)² = ${f2(b)}, a = ȳ − b·x̄ = <b>${f2(a)}</b> → ${eq(b, a)}. Linia najmniejszych kwadratów zawsze przechodzi przez (x̄, ȳ), a znak b jest taki jak znak r.`,
  });
});

const REG_CTX = [
  { t: "X = wynik matury (%), Y = średnia ocen na studiach (skala 2–5)", b: 0.03, a: 1.5, x: [40, 100], unit: "", lo: 2, hi: 5 },
  { t: "X = godziny nauki, Y = punkty z kolokwium (0–50)", b: 2.5, a: 10, x: [5, 14], unit: " pkt", lo: 0, hi: 50 },
  { t: "X = wzrost (cm), Y = masa ciała (kg)", b: 0.9, a: -90, x: [160, 190], unit: " kg", lo: 40, hi: 120 },
];
const regPred = G("c-reg-pred", "regr", "Czy ta predykcja jest realna?", () => {
  const C = pick(REG_CTX), X = ri(C.x[0], C.x[1]), y = C.b * X + C.a, ok = chance(OK_P);
  const claim = ok ? y : (C.b + C.a) * X;
  return judge({ ok,
    q: `${C.t}. Równanie: <b>${eq(C.b, C.a)}</b>. Dla X = ${X} raport podaje Y′ = <b>${f2(claim)}${C.unit}</b>. Realne?`,
    yes: ["Tak — Y′ = b·X + a i wynik mieści się w możliwym zakresie Y", `${f2(C.b)}·${X} ${C.a < 0 ? "−" : "+"} ${f2(Math.abs(C.a))} = ${f2(y)}.`],
    no: [`Nie — Y′ = ${f2(C.b)}·${X} ${C.a < 0 ? "−" : "+"} ${f2(Math.abs(C.a))} = ${f2(y)}; wynik ${f2(claim)} jest poza możliwym zakresem Y (${C.lo}–${C.hi})`, "Ktoś dodał współczynniki do siebie i pomnożył przez X. Przewidywanie zawsze warto porównać ze zdrowym rozsądkiem."],
    wrong: [["Nie — przewidywana wartość zawsze równa się ȳ", "Tylko gdy r = 0. Przy korelacji predykcja zależy od X."],
      ["Nie — przy predykcji nie dodaje się wyrazu wolnego a", "Y′ = b·X + a — a jest częścią równania."],
      ["Nie — Y′ musi być równe X", "Y′ to przewidywanie innej zmiennej; jednostki mogą być zupełnie inne."]],
    hint: "Podstaw X do równania i porównaj wynik z możliwym zakresem Y.",
    why: `Y′ = ${f2(C.b)}·${X} ${C.a < 0 ? "−" : "+"} ${f2(Math.abs(C.a))} = <b>${f2(y)}${C.unit}</b>. Predykcja spoza zakresu, w którym w ogóle może leżeć Y, to sygnał błędu w liczeniu.`,
  });
});

const regCheck = G("c-reg-check", "regr", "Równanie z x̄, ȳ i r", () => {
  const mx = ri(3, 8), my = ri(6, 15), r = pick([1, -1]) * ri(30, 90) / 100, b = Math.sign(r) * pick([0.5, 1, 1.5, 2]), a = my - b * mx;
  const type = chance(OK_P) ? "ok" : pick(["sign", "mean"]);
  const sb = type === "sign" ? -b : b, sa = type === "sign" ? my + b * mx : type === "mean" ? a + pick([-1, 1]) * ri(4, 9) : a;
  return judge({ ok: type === "ok",
    q: `Dane: x̄ = ${mx}, ȳ = ${my}, r = ${f2(r)}. Raport: „<b>${eq(sb, sa)}</b>”. Czy to równanie może być poprawne?`,
    yes: ["Tak — znak b zgadza się ze znakiem r, a dla X = x̄ wychodzi ȳ", `${f2(sb)}·${mx} ${sa < 0 ? "−" : "+"} ${f2(Math.abs(sa))} = ${f2(sb * mx + sa)} = ȳ.`],
    no: type === "sign"
      ? [`Nie — r jest ${r > 0 ? "dodatnie" : "ujemne"}, więc b musi być ${r > 0 ? "dodatnie" : "ujemne"}`, "b = r · s<sub>Y</sub>/s<sub>X</sub>, a odchylenia standardowe są dodatnie — znak b = znak r."]
      : [`Nie — dla X = x̄ = ${mx} równanie daje ${f2(sb * mx + sa)}, a powinno dać ȳ = ${my}`, `Linia regresji przechodzi przez (x̄, ȳ): a = ȳ − b·x̄ = ${f2(a)}.`],
    wrong: [["Nie — b musi być równe r", "b = r·s<sub>Y</sub>/s<sub>X</sub>, więc zależy też od odchyleń standardowych."],
      ["Nie — a musi być równe ȳ", "a = ȳ tylko gdy b = 0 albo x̄ = 0."],
      ["Nie — przy r < 0,9 regresji się nie liczy", "Regresję liczy się przy każdej korelacji; im wyższa, tym lepsza predykcja."]],
    hint: "Znak b = znak r. Podstaw X = x̄ — musi wyjść ȳ.",
    why: `Poprawne równanie przechodzi przez (${mx}, ${my}) i ma b o znaku r, np. ${eq(b, a)}. Dwa szybkie testy łapią większość błędów w regresji.`,
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  19. BŁĄD PREDYKCJI S_YX I ZAŁOŻENIA REGRESJI
// ════════════════════════════════════════════════════════════════════════════
const syxClaim = G("c-syx-claim", "syx", "Czy ten błąd oszacowania jest realny?", () => {
  const sY = ri(4, 12), r = pick([1, -1]) * pick([0.3, 0.5, 0.6, 0.8, 0.9, 0.95]), syx = sY * Math.sqrt(1 - r * r);
  const type = chance(OK_P) ? "ok" : Math.abs(r) < 0.9 ? pick(["big", "zero"]) : "big";
  const claim = { ok: syx, big: sY * (1 + Math.abs(r)), zero: 0 }[type];
  return judge({ ok: type === "ok",
    q: `s<sub>Y</sub> = ${sY}, r = ${f2(r)}. Raport: „standardowy błąd oszacowania S<sub>YX</sub> = <b>${f2(claim)}</b>”. Czy to realne?`,
    yes: ["Tak — S_YX = s_Y·√(1 − r²) i jest mniejsze od s_Y", `${sY}·√(1 − ${f2(r * r)}) = ${f2(syx)}.`],
    no: type === "big"
      ? ["Nie — S_YX nie może być większe od s_Y: predykcja z X nie może być gorsza niż zgadywanie ȳ", `S<sub>YX</sub> = s<sub>Y</sub>·√(1 − r²) = ${f2(syx)} ≤ ${sY}.`]
      : [`Nie — S_YX = 0 tylko przy r = ±1 (wszystkie punkty na prostej); przy r = ${f2(r)} błąd jest spory`, `S<sub>YX</sub> = ${sY}·√(1 − ${f2(r * r)}) = ${f2(syx)}.`],
    wrong: [["Nie — przy ujemnym r błąd oszacowania jest ujemny", "S_YX jest zawsze ≥ 0; zależy od r², więc znak r nie ma znaczenia."],
      ["Nie — S_YX zawsze równa się s_Y", "Tylko przy r = 0."],
      ["Nie — S_YX zawsze równa się 1 − r", "Wzór to s<sub>Y</sub>·√(1 − r²)."]],
    hint: "0 ≤ S_YX ≤ s_Y. Im wyższe |r|, tym mniejszy błąd.",
    why: `S<sub>YX</sub> = s<sub>Y</sub>·√(1 − r²) = <b>${f2(syx)}</b> — miara rozrzutu rzeczywistych Y wokół przewidywanych Y′. r = ±1 → 0; r = 0 → s<sub>Y</sub>.`,
  });
});

const syxExtreme = G("c-syx-ext", "syx", "Skrajne korelacje a predykcja", () => {
  const my = ri(10, 30), sY = ri(3, 9);
  const V = pick([
    { ok: true, t: `r = 0. Raport: „najlepsza predykcja to Y′ = ȳ = ${my} dla każdego X, a S<sub>YX</sub> = s<sub>Y</sub> = ${sY}”.`, e: "Bez korelacji X nic nie mówi o Y: linia regresji jest pozioma (b = 0)." },
    { ok: false, t: `r = 0. Raport: „Y′ = 2·X + ${my - 10}”.`, no: "Nie — przy r = 0 nachylenie b = r·s_Y/s_X = 0, więc linia jest pozioma: Y′ = ȳ", e: `Najlepsza predykcja to ȳ = ${my} dla każdego X.` },
    { ok: true, t: `r = −1. Raport: „S<sub>YX</sub> = 0 — przewidujemy Y bezbłędnie”.`, e: "Wszystkie punkty leżą na prostej (malejącej), więc błąd predykcji = 0." },
    { ok: false, t: `r = −1. Raport: „S<sub>YX</sub> = ${2 * sY} — przy ujemnej korelacji błąd jest największy”.`, no: "Nie — r = −1 to idealny związek: wszystkie punkty na prostej, S_YX = 0", e: "Znak r mówi o kierunku, nie o jakości predykcji. Liczy się r² = 1." },
  ]);
  return judge({ ok: V.ok, q: `s<sub>Y</sub> = ${sY}, ȳ = ${my}. ${V.t} Czy to się zgadza?`,
    yesWrong: "Tak — to się zgadza",
    yes: ["Tak — tak zachowuje się regresja przy skrajnych korelacjach", V.e], no: [V.no || "", V.e],
    wrong: [["Nie — przy r = 0 nie da się nic przewidzieć, nawet ȳ", "Da się — najlepszym przewidywaniem jest wtedy średnia ȳ."],
      ["Nie — przy ujemnej korelacji regresji się nie liczy", "Liczy się; b jest wtedy ujemne."],
      ["Nie — błąd predykcji nie zależy od r", "Zależy: S<sub>YX</sub> = s<sub>Y</sub>·√(1 − r²)."]],
    hint: "S_YX = s_Y·√(1 − r²); b = r·s_Y/s_X.",
    why: `${V.e} r = 0 → Y′ = ȳ, S<sub>YX</sub> = s<sub>Y</sub>; |r| = 1 → S<sub>YX</sub> = 0; im wyższa korelacja, tym lepsza predykcja.`,
  });
});

function uPts() {
  const xs = Array.from({ length: 16 }, () => ri(0, 100) / 10);
  return xs.map((x) => [x, Math.round(((x - 5) ** 2 + gauss() * 1.5) * 10) / 10]);
}
function fanPts() {
  const xs = Array.from({ length: 22 }, () => ri(5, 100) / 10);
  return xs.map((x) => [x, Math.round((5 + x + gauss() * x * 0.6) * 10) / 10]);
}
const syxAssume = bank("c-syx-assume", "syx", "Założenia regresji", [
  () => { const p = uPts(); return { q: `Wykres rozrzutu. Policzone r ≈ ${f2(pearson(p.map((x) => x[0]), p.map((x) => x[1])))}. Wniosek: „między X a Y nie ma żadnego związku”. Czy to uprawnione?`, fig: scatterSvg(p),
    a: [["Nie — związek jest wyraźny, ale nieliniowy (U), a r mierzy tylko związek liniowy", "Pearson i regresja liniowa zakładają liniowość — tu założenie jest złamane."],
      ["Tak — r bliskie 0 oznacza brak związku", "r ≈ 0 oznacza brak związku LINIOWEGO; wykres pokazuje wyraźny związek krzywoliniowy."],
      ["Nie — r powinno wyjść bliskie 1", "Przy kształcie U korelacja liniowa jest bliska 0, bo lewa i prawa połowa się znoszą."],
      ["Tak — punktów jest za mało, żeby mówić o związku", "Kształt jest tu bardzo wyraźny."]],
    hint: "Jaki kształt tworzą punkty?", why: "Założenie liniowości: związek X i Y najlepiej opisuje prosta. Zawsze najpierw obejrzyj wykres rozrzutu." }; },
  () => ({ q: "Wykres rozrzutu. Raport: „ten sam błąd predykcji S_YX obowiązuje dla małych i dużych X”. Czy to uprawnione?", fig: scatterSvg(fanPts()),
    a: [["Nie — rozrzut Y rośnie wraz z X (brak homoscedastyczności), więc błąd zależy od X", "Homoscedastyczność = podobny rozrzut Y dla każdego X. Tu rozrzut przypomina wachlarz."],
      ["Tak — S_YX jest jeden dla całej linii regresji", "Jest jeden tylko wtedy, gdy rozrzut wokół linii jest wszędzie podobny."],
      ["Nie — przy dużych X błąd jest mniejszy", "Wykres pokazuje coś odwrotnego: im większe X, tym większy rozrzut."],
      ["Tak — homoscedastyczność dotyczy tylko X, nie Y", "Dotyczy rozrzutu Y przy różnych wartościach X."]],
    hint: "Czy punkty są tak samo rozrzucone wokół linii z lewej i z prawej?", why: "Homoscedastyczność to założenie regresji: wariancja Y wokół linii jest stała dla wszystkich X." }),
  { q: "Na podstawie 5 osób policzono r = 0,9 i równanie regresji. Wniosek: „to równanie stabilnie przewiduje wyniki całej populacji”.",
    a: [["Nie — przy tak małej próbie regresja jest niestabilna; inne 5 osób dałoby zupełnie inne równanie", "Założenie: duża próba. Mała próba = wynik podatny na przypadek."],
      ["Tak — r = 0,9 gwarantuje stabilność", "Wysokie r w małej próbie może być przypadkiem."],
      ["Tak — regresja nie zależy od wielkości próby", "Zależy — przy małych próbach współczynniki bardzo się wahają."],
      ["Nie — regresji nie wolno liczyć przy r > 0,8", "Wolno; wysokie r to dobra predykcja."]],
    hint: "Co by się stało przy innych 5 osobach?", why: "Założenia regresji: liniowość, homoscedastyczność, normalność Y dla każdego X, duża próba (stabilność)." },
  { q: "300 osób; punkty układają się wzdłuż prostej, rozrzut wokół niej jest podobny dla wszystkich X, a Y przy danym X ma rozkład zbliżony do normalnego. Czy założenia regresji liniowej są spełnione?",
    a: [["Tak — liniowość, homoscedastyczność, normalność i duża próba", "Wszystkie cztery założenia z zajęć są spełnione."],
      ["Nie — potrzeba co najmniej 10 000 osób", "300 to duża próba; nie ma takiego progu."],
      ["Nie — r musi wynosić 1", "Regresja nie wymaga idealnej korelacji."],
      ["Nie — Y musi mieć rozkład równomierny", "Założenie mówi o rozkładzie normalnym Y dla każdego X."]],
    hint: "Porównaj z listą założeń.", why: "Założenia: liniowość związku, homoscedastyczność, normalny rozkład Y dla każdej wartości X, duża próba." },
]);

// ════════════════════════════════════════════════════════════════════════════
//  ZAGADNIENIA
// ════════════════════════════════════════════════════════════════════════════
export const SENSE_TOPICS = [
  { id: "c-study", title: "Próba, populacja i zmienne", sub: "zależna, niezależna, uwikłana", icon: "◎", gens: [badVar, badConf, badPop] },
  { id: "c-scales", title: "Skale i rodzaje zmiennych", sub: "nominalna → ilorazowa, dyskretna / ciągła", icon: "≡", gens: [scNom, scRatio, scDiscrete] },
  { id: "c-freq", title: "Rozkład liczebności", sub: "F i % skumulowany, granice realne, centyle", icon: "▤", gens: [frCum, frLimits, frRank] },
  { id: "c-grouped", title: "Mediana z rozkładu liczebności", sub: "przedział mediany, interpolacja", icon: "▥", gens: [mgWhere, mgClaim, mgPos] },
  { id: "c-median", title: "Mediana", sub: "absurdalne mediany, odporność", icon: "Me", gens: [mdClaim, mdOutlier, mdWords] },
  { id: "c-mean", title: "Średnia", sub: "min–max, n·x̄ = Σ, Σ(X − x̄) = 0", icon: "x̄", gens: [mnClaim, mnDev, mnShift] },
  { id: "c-mode", title: "Dominanta", sub: "wartość, nie liczebność; dwie dominanty", icon: "Mo", gens: [moClaim, moTable, moBimodal] },
  { id: "c-shape", title: "Miary a kształt rozkładu", sub: "skośność, symetria, wartości skrajne", icon: "◠", gens: [shHist, shSym, shIncome] },
  { id: "c-tendvar", title: "Tendencja centralna czy zmienność?", sub: "położenie vs rozrzut", icon: "⇔", gens: [tvClass, tvSame, tvShift] },
  { id: "c-range", title: "Rozstęp", sub: "max − min, wrażliwość na skrajne", icon: "↔", gens: [rgClaim, rgOutlier, rgZero] },
  { id: "c-quart", title: "Odchylenie ćwiartkowe", sub: "kwartyle, Q = (Q3 − Q1)/2", icon: "Q", gens: [qClaim, qBound, qRobust] },
  { id: "c-variance", title: "Wariancja", sub: "≥ 0, ≤ R², n vs n − 1, jednostki²", icon: "s²", gens: [vaClaim, vaN1, vaUnits] },
  { id: "c-sd", title: "Odchylenie standardowe", sub: "s ≈ typowe odchylenie, s = √S²", icon: "s", gens: [sdClaim, sdPair, sdCompare] },
  { id: "c-normal", title: "Rozkład normalny", sub: "68–95–99,7, cechy krzywej, s z zakresu", icon: "∩", gens: [noRule, noProp, noSd] },
  { id: "c-z", title: "Wyniki z i tabela A", sub: "znak z, odsetek poniżej, między z a M", icon: "z", gens: [zCalc, zBelow, zBetween] },
  { id: "c-corr", title: "Korelacja Pearsona", sub: "znak, siła, −1 ≤ r ≤ 1", icon: "r", gens: [rScatter, rData, rInterp] },
  { id: "c-causal", title: "Korelacja a przyczynowość", sub: "zmienna uwikłana, korelacje pozorne", icon: "⚠", gens: [causal, causal, causal] },
  { id: "c-regr", title: "Regresja liniowa", sub: "znak b, punkt (x̄, ȳ), realna predykcja", icon: "Y′", gens: [regLine, regPred, regCheck] },
  { id: "c-syx", title: "Błąd predykcji i założenia", sub: "S_YX, liniowość, homoscedastyczność", icon: "±", gens: [syxClaim, syxExtreme, syxAssume] },
];
const ALL_SENSE = [...new Map(SENSE_TOPICS.flatMap((t) => t.gens).map((g) => [g.id, g])).values()];
export function senseGenById(id) { return ALL_SENSE.find((g) => g.id === id) || null; }
export const SENSE_MIX_SIZE = 15;
/** Sprawdzian mieszany: losowe generatory ze wszystkich zagadnień. */
export function senseMixGens() { return shuffle(ALL_SENSE).slice(0, SENSE_MIX_SIZE); }
