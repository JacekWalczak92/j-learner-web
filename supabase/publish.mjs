// ============================================================================
//  publish.mjs — wysyłka materiału do PUBLICZNEJ biblioteki („od autora").
//  To jest właśnie „API, przez które wysyłasz" — zwykłe HTTP do Supabase REST.
//
//  Użycie:
//    SUPABASE_URL=https://xxx.supabase.co \
//    SERVICE_ROLE_KEY=eyJ... \
//    AUTHOR_USER_ID=<uuid Twojego konta> \
//    node publish.mjs "Tytuł materiału" sciezka/do/pliku.txt
//
//  Typ (test/flashcards) wykrywany jest automatycznie z treści.
//  SERVICE_ROLE_KEY trzymaj w sekrecie — nigdy w przeglądarce ani w repo.
// ============================================================================
import fs from "node:fs";

const { SUPABASE_URL, SERVICE_ROLE_KEY, AUTHOR_USER_ID } = process.env;
const [title, file] = process.argv.slice(2);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !AUTHOR_USER_ID || !title || !file) {
  console.error("Brakuje danych. Zobacz nagłówek pliku publish.mjs.");
  process.exit(1);
}

const content = fs.readFileSync(file, "utf8");
const type = /^\s*q:/im.test(content) ? "test" : "flashcards";

const resp = await fetch(SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/materials", {
  method: "POST",
  headers: {
    apikey: SERVICE_ROLE_KEY,
    Authorization: "Bearer " + SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({ user_id: AUTHOR_USER_ID, title, type, content, is_public: true }),
});

if (!resp.ok) {
  console.error("Błąd:", resp.status, await resp.text());
  process.exit(1);
}
const [row] = await resp.json();
console.log(`Opublikowano „${row.title}" (${row.type}), id=${row.id}`);
