// ============================================================================
//  parsers.js — parsowanie materiałów wklejonych lub pobranych z Google Drive
//  Formaty zgodne 1:1 z aplikacją Android (J-Learner / AnkiFiszki).
//
//  TEST ABCD (blok = 6 linii, bloki oddzielone pustą linią):
//      Q: treść pytania
//      A: odpowiedź A
//      B: odpowiedź B
//      C: odpowiedź C
//      D: odpowiedź D
//      CORRECT: A          (litera A/B/C/D — poprawna odpowiedź)
//      CORRECT: A, C        (kilka liter — pytanie wielokrotnego wyboru)
//
//  FISZKI (jedna fiszka = jedna linia):
//      przód;tył              (średnik; albo tabulator)
//      przód;tył;tagi         (tagi opcjonalne)
// ============================================================================

/** Usuwa prefiks "X:" / "x:" z początku linii i przycina białe znaki. */
function stripPrefix(line, letter) {
  const up = letter.toUpperCase() + ":";
  const lo = letter.toLowerCase() + ":";
  let v = line;
  if (v.startsWith(up)) v = v.slice(up.length);
  else if (v.startsWith(lo)) v = v.slice(lo.length);
  return v.trim();
}

/**
 * Zamienia treść linii CORRECT ("A", "A,C", "A C", "AC", "A; D") na posortowaną
 * listę indeksów 0..3. Pojedyncza litera → lista jednoelementowa (kompatybilność wstecz).
 * @returns {number[]}
 */
function parseCorrectIndices(raw) {
  const map = { A: 0, B: 1, C: 2, D: 3 };
  const out = [];
  for (const token of String(raw).toUpperCase().split(/[\s,;/|]+/)) {
    for (const ch of token) {
      if (ch in map && !out.includes(map[ch])) out.push(map[ch]);
    }
  }
  return out.sort((a, b) => a - b);
}

/** Wszystkie poprawne odpowiedzi pytania połączone przecinkiem (Fiszki, podsumowania). */
function correctAnswersText(q) {
  const idxs = q.correctIndices && q.correctIndices.length ? q.correctIndices : [q.correctIndex];
  return idxs.map((i) => q.answers[i]).filter((x) => x != null && x !== "").join(", ");
}

/**
 * Parsuje tekst w formacie Q:/A:/B:/C:/D:/CORRECT: na listę pytań.
 * CORRECT może zawierać kilka liter (np. "A, C") — wtedy pytanie ma wiele poprawnych.
 * @returns {Array<{question:string, answers:string[], correctIndex:number, correctIndices:number[]}>}
 */
function parseTestText(text) {
  const questions = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let i = 0;
  while (i < lines.length) {
    const qLine = lines[i];
    if (!/^q:/i.test(qLine)) {
      i++;
      continue;
    }
    const question = stripPrefix(qLine, "Q");
    const aLine = lines[i + 1];
    const bLine = lines[i + 2];
    const cLine = lines[i + 3];
    const dLine = lines[i + 4];
    const correctLine = lines[i + 5];

    if (aLine && bLine && cLine && dLine && correctLine) {
      const a = stripPrefix(aLine, "A");
      const b = stripPrefix(bLine, "B");
      const c = stripPrefix(cLine, "C");
      const d = stripPrefix(dLine, "D");
      const correct = stripPrefix(correctLine, "CORRECT").toUpperCase();
      const idx = parseCorrectIndices(correct);
      const correctIndices = idx.length ? idx : [0];
      const correctIndex = correctIndices[0];
      if (question && a) {
        questions.push({ question, answers: [a, b, c, d], correctIndex, correctIndices });
      }
      i += 6;
    } else {
      i++;
    }
  }
  return questions;
}

/**
 * Parsuje tekst fiszek (przód;tył;tagi lub z tabulatorem) na listę kart.
 * @returns {Array<{front:string, back:string, tags:string}>}
 */
function parseFlashcardText(text) {
  const cards = [];
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    let parts;
    if (trimmed.includes(";")) parts = splitLimit(trimmed, ";", 3);
    else if (trimmed.includes("\t")) parts = splitLimit(trimmed, "\t", 3);
    else continue;

    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
      cards.push({
        front: parts[0].trim(),
        back: parts[1].trim(),
        tags: parts.length >= 3 ? parts[2].trim() : "",
      });
    }
  }
  return cards;
}

/** split z limitem jak w Kotlinie: ostatni element zachowuje resztę z separatorami. */
function splitLimit(str, sep, limit) {
  const out = [];
  let rest = str;
  while (out.length < limit - 1) {
    const idx = rest.indexOf(sep);
    if (idx === -1) break;
    out.push(rest.slice(0, idx));
    rest = rest.slice(idx + sep.length);
  }
  out.push(rest);
  return out;
}

/**
 * Wykrywa typ materiału na podstawie zawartości.
 * @returns {"test"|"flashcards"|"unknown"}
 */
function detectMaterialType(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.some((l) => /^q:/i.test(l))) return "test";

  const looksLikeCard = lines.some((l) => {
    const parts = l.includes(";") ? l.split(";") : l.includes("\t") ? l.split("\t") : [];
    return parts.length >= 2 && parts[0].trim() && parts[1].trim();
  });
  if (looksLikeCard) return "flashcards";

  return "unknown";
}

// Eksport do globalnego zakresu (aplikacja używa zwykłych <script>).
window.JLParsers = {
  parseTestText,
  parseFlashcardText,
  detectMaterialType,
  parseCorrectIndices,
  correctAnswersText,
};
