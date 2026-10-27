# CLAUDE.md — kontekst projektu J-Learner (web)

Ten plik to „ściąga" dla Claude (Claude Code w terminalu, claude.ai/code w przeglądarce
lub zwykły czat z podpiętym repo GitHub). Opis funkcji dla użytkownika jest w `README.md`,
konfiguracja backendu w `supabase/README.md`.

## Co to jest

J-Learner — aplikacja webowa do nauki: **fiszki** i **testy ABCD** (jedno- i wielokrotnego
wyboru), z kontami użytkowników, folderami, materiałami „Od autora" i zapisem postępu.
Webowy odpowiednik aplikacji mobilnej J-Learner (stamtąd pochodzą tryby nauki oraz
Edge Function `publish-material`).

- Repo: https://github.com/JacekWalczak92/j-learner-web (gałąź `main`)
- Hosting: **GitHub Pages** z `main`, katalog główny (`.nojekyll`). Push na `main` = wdrożenie.
- Backend: **Supabase** (Auth + Postgres REST + RLS), projekt `sztwcvqivqynvksxsqtj`.
- Język UI i komentarzy w kodzie: **polski**.

## Stack i zasady techniczne

- **Czysta statyka, bez builda i bez npm.** Vanilla JS jako moduły ES, jeden plik CSS.
  Nie dodawaj frameworków, bundlerów, `package.json` ani zależności z CDN.
- **Bez zewnętrznego JS w przeglądarce** — z Supabase rozmawiamy przez `fetch`
  (REST `/rest/v1`, Auth `/auth/v1`), nie przez `supabase-js`.
- **CSP** w `<meta>` w `index.html` ogranicza `connect-src` do projektu Supabase —
  nowe domeny trzeba tam dopisać.
- Każdy tekst z danych wstawiany do HTML przechodzi przez `escapeHtml()` (ochrona przed XSS).
- Anty-clickjacking: `app.js` na starcie wybija stronę z obcej ramki.
- `assets/config.js` zawiera tylko publiczny URL i klucz publishable/anon — wolno go
  commitować. **Klucza `service_role` nigdy nie umieszczaj w repo ani we froncie.**

## Mapa plików

| Plik | Rola |
|---|---|
| `index.html` | Cały markup; ekrany jako `<section class="screen">`: `screen-auth`, `screen-library` (zakładki: Moje materiały / Od autora / Audio / Neuro EN / Statystyka), `screen-editor`, `screen-ready`, `screen-test`, `screen-flash`, `screen-results`, `screen-neuro`, `screen-fill`, `screen-stats`. CSP w `<meta>`. |
| `assets/app.js` (~1700 linii) | Cała logika UI: logowanie/rejestracja/reset hasła, biblioteka (foldery, kategorie, wyszukiwarka, sortowanie), modale, edytor, ekran startu sesji, silniki trybów nauki, zapis postępu, wyniki. |
| `assets/supabase.js` | Warstwa danych, eksportuje `JLDB`: sesja (localStorage + odświeżanie tokenu), `rest()`, foldery, materiały, postęp. |
| `assets/parsers.js` | Eksportuje `JLParsers`: `parseTestText`, `parseFlashcardText`, `detectMaterialType` itd. |
| `assets/neuro.js` | Eksportuje `NEURO_BOARDS` (plansze „Neuro EN": własne SVG, elementy `{ n, en[], pl, x, y, lx, ly }`), `boardSvgMarkup`, `gradeAnswer` (EN lub PL przez `plAnswers`). UI w `app.js` (sekcja NEURO EN): tryby `type` / `match` / `trans`; najlepsze wyniki w localStorage `jl_neuro_best` (klucze `id`, `id:match`, `id:trans`); błędy do „Powtórki błędów” w `jl_neuro_mistakes` (`boardId:n`). Fiszki: `neuroVocabDecks()` (plansze + `GENERAL_TERMS`) → `openNeuroDeck` tworzy `state.material` z `id: null` i używa zwykłego `renderReady`. Zdania z lukami: `FILL_SETS` (luka `{a|b}`, `{@grupa:a}` = dowolna kolejność w grupie), `parseFillSentence`, `gradeFillBlanks`; ekran `screen-fill`. |
| `assets/stats.js` | „Statystyka": `STAT_TOPICS` (tematy → listy generatorów), `examGens()`, `parseNum`, `numClose`, `fmt`. Generator = `{ id, topic, title, make(used) }`; `make` losuje dane i zwraca `{ q, fig?, fields?: [{ label, ans, d, traps? }], choices?, correct?, hint, why }` (`d` = miejsca po przecinku: 0 dokładnie, inaczej ±1 na ostatnim; `traps` = typowe błędy → podpowiedź). Pytania pojęciowe: `bankGen`. UI w `app.js` (sekcja STATYSTYKA, ekran `screen-stats`): dobrze rozwiązane znikają, błędne wracają z nowymi liczbami; localStorage `jl_stats_best`, `jl_stats_mistakes`. |
| `assets/config.js` | `JL_CONFIG` = `{ supabaseUrl, supabaseAnonKey }`. |
| `assets/styles.css` | Cały wygląd (~1600 linii). |
| `sw.js` | Service worker: cache shellu (cache-first dla zasobów z `?v=`). |
| `manifest.webmanifest`, `assets/icons/` | PWA. |
| `supabase/schema.sql` | Tabele `folders`, `materials`, `progress`, `audio_files`, bucket `audio` + polityki RLS + trigger `touch_updated_at`. Idempotentny — wkleja się go do SQL Editor. |
| `supabase/functions/publish-material/index.ts` | Edge Function (Deno): publikuje materiał do „Od autora" (sekrety: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTHOR_USER_ID`). |
| `supabase/publish.mjs` | Skrypt Node do publikowania materiałów kluczem `service_role`. |
| `samples/` | Przykładowe pliki w obu formatach. |

## Model danych (skrót)

- `folders` — `user_id`, `name`, `parent_id` (zagnieżdżanie). Każdy użytkownik ma dwa
  foldery-korzenie kategorii: **„Fiszki"** i **„Testy ABCD"** (`ensureCategoryRootFolders`).
  Materiał przenosi się tylko w obrębie swojej kategorii.
- `materials` — `user_id`, `folder_id`, `title`, `type` (`"flashcards"` | `"test"`),
  `content` (surowy tekst w formacie poniżej), `tags`, `is_public`, `updated_at` (trigger). Publiczne czyta każdy;
  zwykły użytkownik nie może ustawić `is_public = true` (blokuje to RLS) — publikacja
  tylko przez `service_role` / Edge Function.
- `audio_files` — MP3 z aplikacji mobilnej: `title`, `folder`, `path` (klucz w prywatnym
  buckecie Storage `audio`, zawsze `<user_id>/…`), `size_bytes`; upsert po `(user_id, path)`.
  Nagrania kont z `app_authors` (sprawdzane funkcją `is_author()`, security definer) widzą
  wszyscy zalogowani — w UI sekcje „Od autora · folder”, bez usuwania.
  Odtwarzanie przez podpisany URL (`/storage/v1/object/sign/…`, 1 h); CSP ma `media-src`
  dla Supabase.
- `progress` — postęp: `material_id`, `card_key`, `mode`
  (`classic` | `exam` | `flash` | `nauka` | `przeglad`), `passed`, `difficulty`
  (`none`/`easy`/`hard`), `times_shown`; upsert po `(user_id, material_id, card_key, mode)`.
  `card_key` to
  hash FNV-1a z przodu i tyłu (`cardKey` w `app.js`), więc postęp przetrwa zmianę
  kolejności, ale zmiana treści karty go zeruje. Postęp jest osobny dla każdego trybu.
  Zapis jest buforowany i wysyłany paczkami; niewysłany trafia do localStorage
  (`jl_pending_progress`) i jest dosyłany później.

## Formaty treści (parsowane w `parsers.js`)

Test ABCD — bloki po 6 linii (+ opcjonalnie notatka):
```
Q: pytanie
A: ...
B: ...
C: ...
D: ...
CORRECT: B          # lub kilka: "A, C" / "A C" / "AC" → wielokrotny wybór
EXPLAIN: notatka    # opcjonalnie; też WYJAŚNIENIE: / NOTE: / NOTATKA:
```
Fiszki — jedna na linię: `przód;tył[;tagi[;notatka]]`.

## Tryby nauki

- Testy: **Quiz klasyczny** (`startClassic`), **Sesja testowa** (`startExam`),
  **Fiszki** (`startGrade` z ocenami Powtórz / Trudne / Dobre / Łatwe). Tablica `TEST_MODES`.
- Fiszki: **Nauka** i **Przegląd** (oba przez `startGrade`, różna konfiguracja w `GRADE_CFG`).
  Tablica `FLASH_MODES`. Przeglądanie bez oceniania: `startBrowse`.
- Reset postępu: `RESET_GROUPS` / `doReset`.

## Wydanie nowej wersji — WAŻNE

Cache-busting przez `?v=N` + wersja cache service workera. Przy każdej zmianie
frontendu podbij numer (obecnie **19**) we wszystkich miejscach naraz:

1. `index.html` — `?v=N` przy `styles.css` i `assets/app.js`,
2. `assets/app.js` — `?v=N` w importach `parsers.js`, `supabase.js`, `neuro.js` i `stats.js` oraz `APP_VERSION`,
3. `assets/supabase.js` — `?v=N` w imporcie `config.js`,
4. `sw.js` — stała `VERSION`.

Sprawdzenie: `grep -rn "?v=" index.html assets/*.js sw.js` oraz `grep -n VERSION sw.js` —
wszędzie ten sam numer. Bez tego użytkownicy (zwłaszcza PWA) dostaną stary kod z cache.

## Uruchomienie i testowanie

- Lokalnie: `python3 -m http.server 8000` w katalogu repo → http://localhost:8000
  (`file://` nie działa — moduły ES i Auth wymagają http).
- Nie ma testów automatycznych ani lintera — weryfikacja ręczna w przeglądarce.
  Minimum po zmianie: logowanie, otwarcie materiału każdego typu, przejście jednego
  trybu, edycja/zapis materiału, brak błędów w konsoli.
- Zmiany w `supabase/schema.sql` nie aplikują się same — trzeba je wkleić w Supabase
  SQL Editor (pisz je idempotentnie: `if not exists`, `drop policy if exists`).

## Konwencje

- Styl kodu: zwięzły vanilla JS, helpery `$` / `$$`, globalny obiekt `state`,
  funkcje `renderX()` budujące DOM. Trzymaj się istniejącego stylu i gęstości komentarzy.
- Komunikaty dla użytkownika: `showToast(msg, kind)`; potwierdzenia: `modalConfirm` /
  `modalPrompt` (nie `alert`/`confirm`).
- Commity: krótkie, jednolinijkowe (dotychczas po angielsku, np. „add multiple answers").
- Po zmianach zaktualizuj `README.md` (opis funkcji) i w razie potrzeby ten plik.
