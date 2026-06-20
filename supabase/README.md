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

## Publikowanie materiałów „od autora" (Twoje API)

Publiczne materiały dodajesz **kluczem `service_role`** (Project Settings → API →
*service_role secret*), który omija RLS. To zwykłe wywołanie HTTP do Supabase REST,
więc łatwo wepniesz je w swój pipeline.

Najpierw weź UUID swojego konta: **Authentication → Users** → Twój użytkownik → `id`.

### Wariant 1 — curl

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
