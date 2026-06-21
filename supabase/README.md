# Backend J-Learner na Supabase

Konta użytkowników + ich foldery i materiały, plus publiczna biblioteka „od autora".
Darmowy plan Supabase w zupełności wystarcza.

## Konfiguracja (raz)

1. Załóż projekt na https://supabase.com (darmowy).
2. **SQL Editor → New query** → wklej całą zawartość `schema.sql` → **Run**.
3. **Project Settings → API** skopiuj:
   - *Project URL* → do `assets/config.js` jako `supabaseUrl`,
   - *anon public key* → jako `supabaseAnonKey` (klucz publiczny, bezpieczny w kodzie —
     dostępu pilnuje RLS).
4. (Zalecane na start) **Authentication → Providers → Email**: wyłącz „Confirm email",
   żeby rejestracja działała od razu bez potwierdzania mailem. Możesz włączyć później.

To wszystko — aplikacja na GitHub Pages łączy się wprost z Supabase.

## Jak to działa z bezpieczeństwem

- `anon key` jest publiczny celowo. Tym, co naprawdę chroni dane, są reguły **RLS**:
  każdy widzi i edytuje tylko swoje foldery/materiały, a materiały publiczne może
  czytać każdy. Zwykły użytkownik **nie może** sam oznaczyć materiału jako publiczny.

## Publikowanie materiałów „od autora"

Publiczne materiały (`is_public = true`) trafiają do zakładki **„Od autora"** u
wszystkich. Reguły RLS nie pozwalają zwykłemu użytkownikowi ustawić `is_public`,
więc publikowanie idzie **po stronie serwera** — przez Edge Function (zalecane,
używa jej apka mobilna) albo bezpośrednio kluczem `service_role`.

Najpierw weź UUID swojego konta: **Authentication → Users** → Twój użytkownik → `id`.
To wartość sekretu `AUTHOR_USER_ID`.

### Wariant 0 — Edge Function `publish-material` (apka mobilna) ⭐

Funkcja sprawdza token zalogowanego użytkownika, porównuje jego `id` z sekretem
`AUTHOR_USER_ID` i tylko autorowi pozwala zapisać rekord z `is_public = true`.
Dzięki temu klucz `service_role` nie opuszcza serwera — apka wysyła wyłącznie
**zwykły token użytkownika**.

Kod: [`functions/publish-material/index.ts`](functions/publish-material/index.ts).

**Wdrożenie (Supabase CLI):**

```bash
supabase functions deploy publish-material --project-ref sztwcvqivqynvksxsqtj
supabase secrets set AUTHOR_USER_ID=twoj-uuid --project-ref sztwcvqivqynvksxsqtj
# SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY są wstrzykiwane automatycznie
```

**Wywołanie (apka mobilna — opcja „Wyślij do Od Autora"):**

```
POST https://sztwcvqivqynvksxsqtj.supabase.co/functions/v1/publish-material
Authorization: Bearer <ACCESS_TOKEN zalogowanego użytkownika>
Content-Type: application/json

{
  "title": "Test — metodologia",
  "type": "test",          // dozwolone: "test" lub "flashcards"
  "content": "Q: ...\nA: ...\nB: ...\nC: ...\nD: ...\nCORRECT: A",
  "tags": "metodologia"     // opcjonalne
}
```

Odpowiedzi: `200 {ok:true,id,...}` · `401` brak/zły token · `403` to nie autor ·
`400` złe body. Materiał ląduje w `materials` z `is_public = true` i pojawia się
w webowej zakładce **„Od autora"** (nie w „Moje materiały").

> Zwykły zapis z apki (do „Moje materiały") nadal idzie wprost do tabeli
> `materials` z `is_public = false`. Edge Function dotyczy **tylko** publikowania.

### Wariant 1 — curl (service_role, ręcznie)

```bash
curl -X POST "$SUPABASE_URL/rest/v1/materials" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "user_id": "TWOJ_UUID",
    "title": "Metodologia — kolokwium 1",
    "type": "test",
    "content": "Q: ...\nA: ...\nB: ...\nC: ...\nD: ...\nCORRECT: A",
    "is_public": true
  }'
```

### Wariant 2 — gotowy skrypt (wykrywa typ z treści)

```bash
SUPABASE_URL=https://xxx.supabase.co \
SERVICE_ROLE_KEY=eyJ... \
AUTHOR_USER_ID=twoj-uuid \
node publish.mjs "Metodologia — kolokwium 1" metodologia.txt
```

Materiał pojawi się u wszystkich w zakładce **„Od autora"**.

> `service_role` to pełny dostęp do bazy — używaj go tylko po swojej stronie
> (serwer / CLI), nigdy w przeglądarce ani w publicznym repo.

## Formaty treści (pole `content`)

- **Test ABCD** — bloki po 6 linii: `Q:` / `A:` / `B:` / `C:` / `D:` / `CORRECT: <A-D>`.
- **Fiszki** — jedna na linię: `przód;tył` (opcjonalnie `;tagi`).

## Postęp nauki (zapis i reset)

Tabela `progress` (w `schema.sql`) trzyma, co użytkownik zaliczył per **materiał / karta
/ tryb** (`classic`/`exam`/`flash`/`nauka`/`przeglad`). Karta jest identyfikowana przez
**hash treści** (`card_key`), więc po edycji treści danej karty jej postęp startuje od zera.
RLS pozwala każdemu widzieć i kasować tylko własne wiersze. Reset z UI usuwa wiersze
dla danego trybu (lub całego materiału). Spaced repetition celowo pominięty.
