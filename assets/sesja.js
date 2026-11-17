// ════════════════════════════════════════════════════════════════════════════
//  Terminy sesji — dane z wydruku „Sesja — Semestr zimowy (III)” (16.11.2026).
//  Nowy semestr = podmień obiekt SESJA (daty ISO, rrrr-mm-dd). UI w app.js (TERMINY SESJI).
//  Termin: { what, date?, time?, form?, session?: true (w sesji, termin nieustalony),
//            tbd?: true (brak wpisanego terminu), task?: "treść zadania" }.
//  Kolizje (≥ 2 terminy jednego dnia) liczy sesjaCollisions().
// ════════════════════════════════════════════════════════════════════════════

export const SESJA = {
  title: "Semestr zimowy (III)",
  printed: "2026-11-16",
  start: "2026-10-01",          // początek osi czasu (start roku akademickiego)
  lastClasses: "2027-01-31",
  main: ["2027-02-01", "2027-02-14"],
  retake: ["2027-02-15", "2027-02-28"],
  note: "Daty szacowane („w sesji”, „na ostatnich zajęciach”) nie są potwierdzone — sprawdź w serwisie WNS.",
  subjects: [
    { name: "Podstawy ochrony własności intelektualnej", kind: "wykład", ects: 1, hours: 15, credit: "zal. z oceną",
      terms: [{ what: "zaliczenie na ocenę", date: "2026-12-06", time: "8:00", form: "test · papierowy · w sali" }] },
    { name: "Psychologia edukacyjna", kind: "wykład", ects: 3, hours: 30, credit: "zal. z oceną",
      terms: [{ what: "egzamin", date: "2027-01-24", form: "test · papierowy · w sali" }] },
    { name: "Psychologia różnic indywidualnych", kind: "ćwiczenia", ects: 3, hours: 30, credit: "zal. z oceną",
      terms: [
        { what: "zaliczenie na ocenę", date: "2027-01-24", form: "test · online · w sali" },
        { what: "projekt", date: "2027-01-24", form: "projekt · papierowy · w sali" },
      ] },
    { name: "Introduction to psychology", kind: "wykład", ects: 2, hours: 30, credit: "zal. z oceną",
      terms: [
        { what: "zaliczenie na ocenę", date: "2027-01-31", form: "pisemny · online · w sali" },
        { what: "prezentacja", date: "2027-01-31", form: "projekt · papierowy · w sali" },
      ] },
    { name: "Podstawy statystyki psychologicznej", kind: "wykład A", ects: 2, hours: 30, credit: "zal. z oceną",
      terms: [{ what: "egzamin", session: true, form: "test · papierowy · w sali" }] },
    { name: "Psychologia kliniczna dzieci i młodzieży", kind: "wykład", ects: 3, hours: 30, credit: "egzamin",
      terms: [
        { what: "egzamin", session: true, form: "test · online · w sali" },
        { what: "zadanie", date: "2026-11-03", task: "Uporządkować materiały z zajęć" },
      ] },
    { name: "Psychologia poznania społecznego", kind: "wykład", ects: 3, hours: 30, credit: "egzamin",
      terms: [
        { what: "egzamin", session: true, form: "test · papierowy · w sali" },
        { what: "zadanie", date: "2026-11-03", task: "Ogarnąć materiał, uporządkować i wgrać" },
      ] },
    { name: "Psychologia różnic indywidualnych", kind: "wykład", ects: 3, hours: 30, credit: "egzamin",
      terms: [{ what: "egzamin", session: true, form: "test · online · w sali" }] },
    { name: "Psychologia wychowawcza", kind: "wykład", ects: 3, hours: 30, credit: "egzamin",
      terms: [{ what: "egzamin", session: true, form: "pisemny · papierowy · w sali" }] },
    { name: "Podstawy statystyki psychologicznej", kind: "ćwiczenia A", ects: 2, hours: 15, credit: "zal. z oceną",
      terms: [{ what: "zaliczenie na ocenę", tbd: true }] },
    { name: "Psychologia poznania społecznego", kind: "ćwiczenia", ects: 3, hours: 30, credit: "zal. z oceną",
      terms: [{ what: "zaliczenie na ocenę", tbd: true }] },
    { name: "Socjologia", kind: "wykład", ects: 2, hours: 15, credit: "egzamin",
      terms: [{ what: "egzamin", tbd: true }] },
  ],
};

/** Wszystkie terminy jako płaska lista { ...term, subject }. */
export function sesjaTerms(s = SESJA) {
  return s.subjects.flatMap((sub) => sub.terms.map((t) => ({ ...t, subject: sub })));
}

/** Daty, na które przypadają ≥ 2 terminy (bez zadań) → Map(data → liczba). */
export function sesjaCollisions(s = SESJA) {
  const cnt = new Map();
  for (const t of sesjaTerms(s)) if (t.date && !t.task) cnt.set(t.date, (cnt.get(t.date) || 0) + 1);
  return new Map([...cnt].filter(([, n]) => n > 1).sort());
}

/** Liczba dni od dziś (lokalnie, od północy) do daty ISO; ujemna = minęło. */
export function daysUntil(iso, now = new Date()) {
  const [y, m, d] = iso.split("-").map(Number);
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d) - a) / 864e5);
}

const WD = ["nd", "pn", "wt", "śr", "cz", "pt", "sb"];
const MON = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
/** „nd 24.01.2027” / { wd, day, mon } do kafelka daty. */
export function fmtDate(iso, { weekday = true, year = true } = {}) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WD[new Date(y, m - 1, d).getDay()];
  const dd = String(d).padStart(2, "0") + "." + String(m).padStart(2, "0") + (year ? "." + y : "");
  return (weekday ? wd + " " : "") + dd;
}
export function dateParts(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { wd: WD[new Date(y, m - 1, d).getDay()], day: d, mon: MON[m - 1], year: y };
}
/** „dziś” / „jutro” / „za 5 dni” / „3 dni temu”. */
export function relDays(n) {
  if (n === 0) return "dziś";
  if (n === 1) return "jutro";
  if (n === -1) return "wczoraj";
  return n > 0 ? "za " + n + " dni" : -n + " dni temu";
}
