# J-Learner — fiszki i testy ABCD (aplikacja z kontami)

Prawdziwa aplikacja webowa: użytkownik zakłada konto, **zapisuje swoje fiszki i testy
w folderach**, i korzysta z materiałów **udostępnionych przez autora**. Frontend jest
statyczny (idealny pod GitHub Pages), a konta i dane trzyma **Supabase** (darmowy plan).

## Co potrafi

- **Konta** (e-mail + hasło) — logowanie i rejestracja.
- **Moje materiały** — foldery (zagnieżdżone), tworzenie/edycja/usuwanie testów i fiszek,
  wbudowany edytor z wykrywaniem formatu, import z pliku. Nowe konto dostaje dwa
- **Foldery materiałów** — folder wybierasz **w edytorze** (pole „Folder”) przy tworzeniu i edycji materiału, albo szybko przyciskiem **↪** w wierszu materiału. Wybór „góra sekcji” = materiał poza folderem (usunięcie z folderu). Przenosić można tylko w obrębie tej samej sekcji (Fiszki / Testy ABCD).
  domyślne foldery: **Testy ABCD** i **Fiszki**.
- **Od autora** — publiczne materiały, które publikujesz; każdy może je otworzyć lub
  „skopiować do moich".
- **Tryby nauki** (jak w aplikacji mobilnej) — wybierane przy starcie materiału:
  - testy ABCD: **Quiz klasyczny** (ABCD → wpisywanie z pamięci, powtarza aż opanujesz),
    **Sesja testowa** (ABCD, wynik na końcu, powtórka błędnych), **Fiszki**
    (pokaż odpowiedź → Powtórz / Trudne / Dobre / Łatwe);
  - fiszki: **Nauka** (przerabiasz całość, karta wraca aż „Łatwe") i **Przegląd**
    (szybka powtórka — „Dobre" lub „Łatwe" kończy kartę).
- **Audio** — zakładka z nagraniami MP3 wysłanymi z aplikacji mobilnej (AI Lab →
  „Wyślij MP3 do J-Learner web”): lista pogrupowana w foldery, odtwarzacz z tempem
  0.8–2×, automatycznie gra kolejny plik (np. następny rozdział), pobieranie i usuwanie.
  Pliki leżą w prywatnym buckecie Supabase Storage `audio`, każdy widzi tylko swoje.
  Wymaga uruchomienia aktualnego `supabase/schema.sql` (sekcja AUDIO).
- Skróty klawiszowe: ABCD `1`–`4`, `Enter`, `S`; oceny fiszek `Spacja`, `1`–`4`.
- **Wyszukiwarka i sortowanie** w bibliotece (filtr po tytule, Nazwa A–Z / Ostatnio zmienione).
- **Reset hasła** — link „Nie pamiętasz hasła?" wysyła e-mail; po kliknięciu w link
  ustawiasz nowe hasło i logujesz się automatycznie. Wymaga ustawienia **Site URL**
  w Supabase (Authentication → URL Configuration) na adres wdrożonej strony.
- **PWA** — aplikację można zainstalować na ekranie głównym telefonu (manifest + ikony);
  service worker cache'uje shell aplikacji, więc otwiera się także offline.
- **Odporny zapis postępu** — oceny kart są buforowane i wysyłane paczkami; niewysłany
  postęp trafia do localStorage i dosyła się po powrocie sieci lub ponownym otwarciu.
- **Zapis postępu** — co zaliczysz w danym trybie, zapisuje się na koncie (Supabase).
  Kolejna sesja rusza od niezaliczonych. Postęp jest **osobny dla każdego trybu** i można
  go **zresetować** (na ekranie startu): dla testów *Quiz klasyczny / Sesja testowa /
  Fiszki / Wszystko*, dla fiszek *Nauka / Przegląd / Wszystko*. (Bez harmonogramu
  spaced repetition — trzymamy tylko „zaliczone”.)

## Uruchomienie lokalnie

Statyczne pliki — wystarczy serwer HTTP:

```bash
cd j-learner-web
python3 -m http.server 8000   # http://localhost:8000
```

(Logowanie/dane wymagają adresu `http(s)://`, nie `file://`.)

## Konfiguracja backendu (Supabase, darmowe)

Pełna instrukcja: **`supabase/README.md`**. W skrócie:

1. Załóż projekt na supabase.com.
2. **SQL Editor** → wklej `supabase/schema.sql` → **Run** (tworzy tabele + reguły RLS).
3. **Project Settings → API** → skopiuj *Project URL* i *anon key* do `assets/config.js`.
4. (Na start) wyłącz potwierdzanie e-maila w **Authentication → Providers → Email**.
5. Dla resetu hasła: **Authentication → URL Configuration → Site URL** ustaw na adres
   strony (np. `https://twojlogin.github.io/j-learner-web/`) — tam trafia link z e-maila.

`anon key` jest publiczny z założenia — bezpieczeństwa pilnują reguły **RLS** w bazie
(każdy widzi tylko swoje dane; materiały publiczne czyta każdy; zwykły użytkownik nie
może nic opublikować globalnie).

## Wdrożenie na GitHub Pages

To czysta statyka — **Settings → Pages → Deploy from a branch** (`main`, katalog `/root`).
Plik `assets/config.js` możesz spokojnie zacommitować (zawiera tylko publiczny URL i anon
key). Po wypchnięciu na `main` strona aktualizuje się sama.

## Wydanie nowej wersji (checklist)

Frontend to moduły ES z cache-bustingiem `?v=N` oraz service worker z własną wersją cache.
Przy każdym wydaniu podbij numer wersji w **czterech** miejscach:

1. `index.html` — `?v=N` przy `styles.css` i `assets/app.js`,
2. `assets/app.js` — `?v=N` w importach `parsers.js` i `supabase.js` (i stała `APP_VERSION`),
3. `assets/supabase.js` — `?v=N` w imporcie `config.js`,
4. `sw.js` — stała `VERSION` (zmienia nazwę cache i wymusza odświeżenie shellu).

Szybka weryfikacja: `grep -rn "?v=" index.html assets/*.js sw.js` — wszystkie wpisy
powinny mieć ten sam numer.

## Publikowanie materiałów „od autora" (Twoje API)

Supabase daje gotowe REST API. Materiały publiczne dodajesz kluczem `service_role`
(omija RLS) — zwykłym `POST`-em, łatwym do wpięcia w Twój pipeline. Gotowy przykład
(`curl` oraz skrypt `node publish.mjs`) i opis pól: **`supabase/README.md`**.

## Formaty treści

**Test ABCD** (blok = 6 linii, opcjonalnie 7. linia z notatką):

```
Q: treść pytania
A: odpowiedź A
B: odpowiedź B
C: odpowiedź C
D: odpowiedź D
CORRECT: B
EXPLAIN: fragment materiału / wyjaśnienie pokazywane pod „?"
```

Linia `CORRECT:` może wskazywać kilka poprawnych odpowiedzi — wtedy pytanie staje się
wielokrotnego wyboru (np. `CORRECT: A, C`; akceptowane też `A C` lub `AC`). W sesji
takie pytanie pokazuje checkboxy i przycisk **Sprawdź**; zalicza się tylko przy zaznaczeniu
wszystkich poprawnych (i żadnej błędnej).

Opcjonalna linia `EXPLAIN:` (albo `WYJAŚNIENIE:` / `NOTE:` / `NOTATKA:`) dodaje notatkę do
pytania — w trakcie nauki pojawia się przycisk „?", pod którym widać ten fragment materiału.

**Fiszki** (jedna na linię): `przód;tył` (opcjonalnie `;tagi`, a po nich opcjonalnie
`;notatka` jako 4. pole — pokazywana pod „?"). Przykłady: `samples/`.

## Struktura plików

```
j-learner-web/
├── index.html
├── assets/
│   ├── config.js       # ⚙️ dane Supabase (URL + anon key)
│   ├── supabase.js     # warstwa danych: konta + foldery + materiały
│   ├── parsers.js      # parsowanie formatów (test/fiszki)
│   ├── styles.css      # wygląd
│   └── app.js          # logika UI i sesji
├── supabase/
│   ├── schema.sql      # tabele + RLS (wklej do SQL Editor)
│   ├── publish.mjs     # publikowanie materiałów „od autora" (service_role)
│   └── README.md       # konfiguracja + API publikowania
├── samples/            # przykładowe materiały
└── README.md
```

## Bezpieczeństwo (skrót)

- Dostęp do danych pilnuje **RLS** w Postgresie (nie front).
- Front bez zewnętrznego JS; **CSP** ogranicza połączenia do Twojego projektu Supabase.
- Treść wstrzykiwana do strony jest escapowana (ochrona przed XSS).
- Strona wybija się z obcej ramki (anty-clickjacking).
- `service_role` (do publikowania) trzymaj tylko po swojej stronie — nigdy w przeglądarce.
