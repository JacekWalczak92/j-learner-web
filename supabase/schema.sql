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
create policy "folders_select_own" on public.folders for select using (auth.uid() = user_id);
create policy "folders_insert_own" on public.folders for insert with check (auth.uid() = user_id);
create policy "folders_update_own" on public.folders for update using (auth.uid() = user_id);
create policy "folders_delete_own" on public.folders for delete using (auth.uid() = user_id);

-- Materiały: własne (pełny dostęp) + publiczne (odczyt dla wszystkich).
-- Zwykły użytkownik NIE może oznaczyć materiału jako publiczny (is_public musi być false).
-- Publiczne materiały „od autora" dodajesz kluczem service_role (omija RLS) — patrz README.
create policy "materials_select_own_or_public" on public.materials
  for select using (auth.uid() = user_id or is_public = true);
create policy "materials_insert_own_private" on public.materials
  for insert with check (auth.uid() = user_id and is_public = false);
create policy "materials_update_own_private" on public.materials
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id and is_public = false);
create policy "materials_delete_own" on public.materials
  for delete using (auth.uid() = user_id);
