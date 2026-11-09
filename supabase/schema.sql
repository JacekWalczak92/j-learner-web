-- ============================================================================
--  J-Learner — schemat bazy dla Supabase. Wklej całość w: SQL Editor → Run.
-- ============================================================================

-- Foldery (drzewo per użytkownik)
create table if not exists public.folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  parent_id  uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Materiały (fiszki / testy)
create table if not exists public.materials (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folder_id  uuid references public.folders(id) on delete set null,
  title      text not null,
  type       text not null check (type in ('test','flashcards')),
  content    text not null,
  is_public  boolean not null default false,
  tags       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists materials_user_idx   on public.materials(user_id);
create index if not exists materials_public_idx on public.materials(is_public) where is_public;
create index if not exists folders_user_idx      on public.folders(user_id);

-- updated_at automatycznie
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists materials_touch on public.materials;
create trigger materials_touch before update on public.materials
  for each row execute function public.touch_updated_at();

-- Uprawnienia ról (rzędy i tak filtruje RLS poniżej)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.folders   to authenticated;
grant select, insert, update, delete on public.materials to authenticated;
grant select on public.materials to anon;

-- RLS
alter table public.folders   enable row level security;
alter table public.materials enable row level security;

-- Foldery: tylko właściciel
drop policy if exists "folders_select_own" on public.folders;
drop policy if exists "folders_insert_own" on public.folders;
drop policy if exists "folders_update_own" on public.folders;
drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_select_own" on public.folders for select using (auth.uid() = user_id);
create policy "folders_insert_own" on public.folders for insert with check (auth.uid() = user_id);
create policy "folders_update_own" on public.folders for update using (auth.uid() = user_id);
create policy "folders_delete_own" on public.folders for delete using (auth.uid() = user_id);

-- Materiały: własne (pełny dostęp) + publiczne (odczyt dla wszystkich).
-- Zwykły użytkownik NIE może oznaczyć materiału jako publiczny (is_public musi być false).
-- Publiczne materiały „od autora" dodajesz kluczem service_role (omija RLS) — patrz README.
drop policy if exists "materials_select_own_or_public" on public.materials;
drop policy if exists "materials_insert_own_private" on public.materials;
drop policy if exists "materials_update_own_private" on public.materials;
drop policy if exists "materials_delete_own" on public.materials;
create policy "materials_select_own_or_public" on public.materials
  for select using (auth.uid() = user_id or is_public = true);
create policy "materials_insert_own_private" on public.materials
  for insert with check (auth.uid() = user_id and is_public = false);
create policy "materials_update_own_private" on public.materials
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id and is_public = false);
create policy "materials_delete_own" on public.materials
  for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
--  POSTĘP NAUKI  (per użytkownik / materiał / karta / tryb)
--  Zapamiętuje, co użytkownik zaliczył w danym trybie. Można resetować.
--  (spaced repetition celowo pominięty — trzymamy tylko proste „zaliczone")
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  card_key    text not null,                              -- odcisk karty (hash treści)
  mode        text not null check (mode in ('classic','exam','flash','nauka','przeglad')),
  passed      boolean not null default false,
  difficulty  text not null default 'none' check (difficulty in ('none','easy','hard')),
  times_shown int not null default 0,
  updated_at  timestamptz not null default now(),
  unique (user_id, material_id, card_key, mode)           -- klucz upsertu
);

create index if not exists progress_lookup_idx
  on public.progress (user_id, material_id, mode);

drop trigger if exists trg_progress_touch on public.progress;
create trigger trg_progress_touch before update on public.progress
  for each row execute function public.touch_updated_at();

alter table public.progress enable row level security;
grant select, insert, update, delete on public.progress to authenticated;

drop policy if exists "progress_select_own" on public.progress;
drop policy if exists "progress_insert_own" on public.progress;
drop policy if exists "progress_update_own" on public.progress;
drop policy if exists "progress_delete_own" on public.progress;
create policy "progress_select_own" on public.progress for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress_delete_own" on public.progress for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
--  AUDIO  (MP3 z aplikacji mobilnej → zakładka „Audio")
--  Pliki: Storage, prywatny bucket `audio`, ścieżka <user_id>/<folder>/<plik>.mp3.
--  Opis (tytuł, folder, rozmiar): tabela audio_files. Każdy widzi swoje, a nagrania
--  kont z tabeli app_authors („Od autora") widzą wszyscy zalogowani (tylko odczyt).
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.audio_files (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  folder     text not null default '',
  path       text not null,                               -- klucz w Storage (bucket audio)
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, path)                                  -- klucz upsertu z aplikacji mobilnej
);

create index if not exists audio_files_user_idx on public.audio_files (user_id);

drop trigger if exists trg_audio_files_touch on public.audio_files;
create trigger trg_audio_files_touch before update on public.audio_files
  for each row execute function public.touch_updated_at();

-- Konta autora: ich nagrania widzą wszyscy zalogowani. Bez polityk = przez REST nikt
-- tej tabeli nie czyta ani nie zmienia; wpis dodajesz tutaj w SQL Editor:
--   insert into public.app_authors (user_id)
--     select id from auth.users where email = 'TWOJ_EMAIL' on conflict do nothing;
create table if not exists public.app_authors (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.app_authors enable row level security;

-- security definer: polityki muszą sprawdzić app_authors mimo braku dostępu do niej.
create or replace function public.is_author(uid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_authors where user_id = uid);
$$;
revoke all on function public.is_author(uuid) from public;
grant execute on function public.is_author(uuid) to authenticated;

alter table public.audio_files enable row level security;
grant select, insert, update, delete on public.audio_files to authenticated;

drop policy if exists "audio_files_select_own" on public.audio_files;
drop policy if exists "audio_files_insert_own" on public.audio_files;
drop policy if exists "audio_files_update_own" on public.audio_files;
drop policy if exists "audio_files_delete_own" on public.audio_files;
drop policy if exists "audio_files_select_own_or_author" on public.audio_files;
create policy "audio_files_select_own_or_author" on public.audio_files
  for select to authenticated using (auth.uid() = user_id or public.is_author(user_id));
create policy "audio_files_insert_own" on public.audio_files for insert with check (auth.uid() = user_id);
create policy "audio_files_update_own" on public.audio_files for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "audio_files_delete_own" on public.audio_files for delete using (auth.uid() = user_id);

-- Bucket na MP3: prywatny, tylko audio/mpeg, do 50 MB (limit darmowego planu).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', false, 52428800, array['audio/mpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Storage: użytkownik zapisuje tylko pod własnym <user_id>/…, czyta swoje i autora.
drop policy if exists "audio_objects_select_own" on storage.objects;
drop policy if exists "audio_objects_insert_own" on storage.objects;
drop policy if exists "audio_objects_update_own" on storage.objects;
drop policy if exists "audio_objects_delete_own" on storage.objects;
drop policy if exists "audio_objects_select_own_or_author" on storage.objects;
create policy "audio_objects_select_own_or_author" on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.audio_files f
               where f.path = storage.objects.name and public.is_author(f.user_id))));
create policy "audio_objects_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_objects_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_objects_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════════════
--  TEKSTY  (TXT z aplikacji mobilnej → zakładka „Audio" → „TXT dla ElevenReadera")
--  Treść trzymamy wprost w tabeli (bez Storage): to zwykły tekst, rozdział to kilka–
--  kilkadziesiąt KB. Każdy widzi swoje, a teksty kont z app_authors — wszyscy zalogowani.
--  Klucz upsertu z aplikacji: (user_id, folder, title) — ponowne wysłanie nadpisuje.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.text_files (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  folder     text not null default '',
  content    text not null check (char_length(content) <= 2000000),
  size_chars integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, folder, title)
);

create index if not exists text_files_user_idx on public.text_files (user_id);

drop trigger if exists trg_text_files_touch on public.text_files;
create trigger trg_text_files_touch before update on public.text_files
  for each row execute function public.touch_updated_at();

alter table public.text_files enable row level security;
grant select, insert, update, delete on public.text_files to authenticated;

drop policy if exists "text_files_select_own_or_author" on public.text_files;
drop policy if exists "text_files_insert_own" on public.text_files;
drop policy if exists "text_files_update_own" on public.text_files;
drop policy if exists "text_files_delete_own" on public.text_files;
create policy "text_files_select_own_or_author" on public.text_files
  for select to authenticated using (auth.uid() = user_id or public.is_author(user_id));
create policy "text_files_insert_own" on public.text_files for insert with check (auth.uid() = user_id);
create policy "text_files_update_own" on public.text_files for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "text_files_delete_own" on public.text_files for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
--  Admin: »Od autora«
--  Konto z app_authors może z poziomu strony dodawać, edytować i usuwać publiczne
--  materiały (is_public) oraz usuwać nagrania (wiersz + plik w Storage) i teksty
--  dowolnego konta autora.
--  Wymaga app_authors / is_author() z sekcji wyżej. Idempotentne.
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists "materials_delete_public_by_author" on public.materials;
create policy "materials_delete_public_by_author" on public.materials
  for delete to authenticated using (is_public = true and public.is_author(auth.uid()));

drop policy if exists "audio_files_delete_by_author" on public.audio_files;
create policy "audio_files_delete_by_author" on public.audio_files
  for delete to authenticated using (public.is_author(auth.uid()) and public.is_author(user_id));

drop policy if exists "audio_objects_delete_by_author" on storage.objects;
create policy "audio_objects_delete_by_author" on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and public.is_author(auth.uid()) and exists (
    select 1 from public.audio_files f
    where f.path = storage.objects.name and public.is_author(f.user_id)));

drop policy if exists "text_files_delete_by_author" on public.text_files;
create policy "text_files_delete_by_author" on public.text_files
  for delete to authenticated using (public.is_author(auth.uid()) and public.is_author(user_id));

-- Tworzenie i edycja materiałów „Od autora” wprost na stronie (admin = konto z app_authors).
drop policy if exists "materials_insert_public_by_author" on public.materials;
create policy "materials_insert_public_by_author" on public.materials
  for insert to authenticated
  with check (auth.uid() = user_id and is_public = true and public.is_author(auth.uid()));
drop policy if exists "materials_update_public_by_author" on public.materials;
create policy "materials_update_public_by_author" on public.materials
  for update to authenticated
  using (is_public = true and public.is_author(auth.uid()))
  with check (is_public = true and public.is_author(auth.uid()) and public.is_author(user_id));

-- ════════════════════════════════════════════════════════════════════════════
--  SKRZYNKA „NA TELEFON”  (web → aplikacja mobilna)
--  Przycisk „📱 Na telefon” w web dopisuje tu materiał (swój albo „Od autora”).
--  Aplikacja mobilna czyta wpisy nowsze niż ostatnio widziane na danym telefonie
--  i importuje materiały do Fiszek / Testów. Idempotentne.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.mobile_inbox (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  sent_at     timestamptz not null default now(),
  primary key (user_id, material_id)
);
create index if not exists mobile_inbox_sent_idx on public.mobile_inbox(user_id, sent_at);
grant select, insert, update, delete on public.mobile_inbox to authenticated;
alter table public.mobile_inbox enable row level security;

drop policy if exists "mobile_inbox_select_own" on public.mobile_inbox;
drop policy if exists "mobile_inbox_insert_own" on public.mobile_inbox;
drop policy if exists "mobile_inbox_update_own" on public.mobile_inbox;
drop policy if exists "mobile_inbox_delete_own" on public.mobile_inbox;
create policy "mobile_inbox_select_own" on public.mobile_inbox
  for select to authenticated using (auth.uid() = user_id);
-- Wysłać można tylko materiał, który użytkownik widzi (własny albo publiczny).
create policy "mobile_inbox_insert_own" on public.mobile_inbox
  for insert to authenticated with check (auth.uid() = user_id
    and exists (select 1 from public.materials m where m.id = material_id));
create policy "mobile_inbox_update_own" on public.mobile_inbox
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id
    and exists (select 1 from public.materials m where m.id = material_id));
create policy "mobile_inbox_delete_own" on public.mobile_inbox
  for delete to authenticated using (auth.uid() = user_id);
