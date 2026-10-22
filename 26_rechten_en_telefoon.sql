-- ═══════════════════════════════════════════════════════════════════
-- 26_rechten_en_telefoon.sql — Glasopname v120 (22-10-2026)
--
-- Draaien in Supabase: SQL Editor → New query → dit hele bestand plakken
-- → Run. Eén keer; nog een keer draaien kan geen kwaad.
--
-- EERST de controlevraag (zie de nota): kijk met
--     select email, naam, actief from public.gebruikers order by email;
-- of iedereen die met de app werkt erin staat met actief = true. Na dit
-- script kan alleen wie daar actief staat nog bij de projecten.
--
-- Wat het doet, in gewone woorden:
--  1. Toegang: alleen collega's die in `gebruikers` op actief staan (en
--     geen anonieme aanmelding). Wie op actief = false staat, kan niets
--     meer lezen of wijzigen. Iemand weghalen = actief op false (nooit
--     verwijderen).
--  2. Wie iets wijzigde, zet de database zelf (niet meer de app).
--  3. Het logboek schrijft alleen de database zelf.
--  4. Een project definitief verwijderen kan alleen vanuit de prullenbak
--     (de knop "Nu definitief verwijderen" blijft werken).
--  5. Een foto in de opslag kan niet overschreven worden (de app doet dat
--     ook niet: elke foto krijgt een eigen naam).
--  6. In `gebruikers` wijzig je via de app alleen je eigen naam en
--     telefoonnummer (nieuw: kolom telefoon, voor op de bestellijst).
--     E-mail en actief alleen hier, in de SQL Editor.
--  7. De nummers van ruiten en foto's in een project moeten gewone
--     nummers zijn, en het versienummer van de app kan niet absurd hoog.
--
-- Terugdraaien: zie BEHEER.md, "Script 26 terugdraaien".
-- ═══════════════════════════════════════════════════════════════════

-- ─── 0. Veiligheidsstop ────────────────────────────────────────────
-- Staat er niemand op actief, dan zou na dit script niemand er meer in
-- kunnen. Dan stopt het script hier, zonder iets te veranderen.
do $$
begin
  if not exists (select 1 from public.gebruikers where actief) then
    raise exception 'Er staat geen enkele gebruiker op actief in public.gebruikers. Script gestopt; er is niets veranderd.';
  end if;
end $$;

-- Iedereen uit auth.users heeft een regel in gebruikers (script 14 deed
-- dit al; voor de zekerheid nog eens, zonder iets te overschrijven).
insert into public.gebruikers (id, naam, email)
select u.id, split_part(coalesce(u.email, ''), '@', 1), coalesce(u.email, '')
from auth.users u
where coalesce(u.is_anonymous, false) = false
on conflict (id) do nothing;

-- ─── 1. Telefoonnummer per gebruiker (v120) ────────────────────────
alter table public.gebruikers add column if not exists telefoon text;
alter table public.gebruikers drop constraint if exists gebruikers_telefoon_kort;
alter table public.gebruikers add constraint gebruikers_telefoon_kort
  check (telefoon is null or char_length(telefoon) <= 30);

-- ─── 2. Wie is een collega? ────────────────────────────────────────
create or replace function public.is_lid()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (select 1 from public.gebruikers g
                  where g.id = (select auth.uid()) and g.actief);
$$;
revoke all on function public.is_lid() from public, anon;
grant execute on function public.is_lid() to authenticated;

-- Elke regel (policy) op de tabellen van de app krijgt "en is een
-- collega" erbij. Wat er al stond, blijft gelden.
do $$
declare
  r record;
  gebruik text;
  controle text;
begin
  for r in select schemaname, tablename, policyname, cmd, qual, with_check
             from pg_policies
            where schemaname = 'public'
              and tablename in ('projecten', 'app_data', 'taken', 'projectgeschiedenis',
                                'gebruikers', 'mailadressen', 'mailverzonden', 'bewerkslot')
  loop
    gebruik := case
      when r.cmd in ('SELECT', 'UPDATE', 'DELETE', 'ALL') and coalesce(r.qual, '') !~ 'is_lid'
        then format(' using ((select public.is_lid()) and (%s))', coalesce(r.qual, 'true'))
      else '' end;
    controle := case
      when r.cmd in ('INSERT', 'UPDATE', 'ALL') and coalesce(r.with_check, '') !~ 'is_lid'
        then format(' with check ((select public.is_lid()) and (%s))', coalesce(r.with_check, 'true'))
      else '' end;
    if gebruik <> '' or controle <> '' then
      execute format('alter policy %I on %I.%I to authenticated%s%s',
                     r.policyname, r.schemaname, r.tablename, gebruik, controle);
    end if;
  end loop;
end $$;

-- ─── 3. Het logboek schrijft alleen de database ────────────────────
-- (de trigger log_project, uit script 13; de app schrijft er niet in)
drop policy if exists geschiedenis_insert on public.projectgeschiedenis;

-- ─── 4. Definitief verwijderen alleen vanuit de prullenbak ─────────
drop policy if exists projecten_delete on public.projecten;
create policy projecten_delete on public.projecten
  for delete to authenticated
  using ((select public.is_lid()) and verwijderd_op is not null);

-- ─── 5. Foto's: lezen, toevoegen en weghalen alleen voor collega's;
--        overschrijven niet ──────────────────────────────────────────
drop policy if exists projectfotos_update on storage.objects;
alter policy projectfotos_select on storage.objects
  using (bucket_id = 'projectfotos' and (select public.is_lid()));
alter policy projectfotos_insert on storage.objects
  with check (bucket_id = 'projectfotos' and (select public.is_lid()));
alter policy projectfotos_delete on storage.objects
  using (bucket_id = 'projectfotos' and (select public.is_lid()));

-- ─── 6. gebruikers: alleen je eigen naam en telefoon ───────────────
revoke update on public.gebruikers from authenticated;
grant update (naam, telefoon) on public.gebruikers to authenticated;
drop policy if exists gebruikers_update on public.gebruikers;
create policy gebruikers_update on public.gebruikers
  for update to authenticated
  using ((select public.is_lid()) and id = (select auth.uid()))
  with check ((select public.is_lid()) and id = (select auth.uid()));

-- ─── 7. Wie wijzigde: de database zet het ──────────────────────────
-- Naam = de naam in gebruikers, of anders het deel van het mailadres vóór
-- de @ (zoals de app het tot nu toe deed).
create or replace function public.wie_is_het()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  wie text;
begin
  -- Geen ingelogde gebruiker: de SQL Editor of een functie van Supabase
  -- zelf (bijv. de bestelmail). Dan niets aanpassen.
  if uid is null then return new; end if;
  select coalesce(nullif(g.naam, ''), split_part(g.email, '@', 1), '')
    into wie from public.gebruikers g where g.id = uid;
  new.gewijzigd_door := uid;
  new.gewijzigd_naam := coalesce(wie, '');
  if tg_op = 'UPDATE' and new.verwijderd_op is distinct from old.verwijderd_op then
    new.verwijderd_door := case when new.verwijderd_op is null then null else uid end;
    new.verwijderd_naam := case when new.verwijderd_op is null then null else coalesce(wie, '') end;
  end if;
  -- Een nieuw project begint niet in de prullenbak.
  if tg_op = 'INSERT' then
    new.verwijderd_op := null;
    new.verwijderd_door := null;
    new.verwijderd_naam := null;
  end if;
  return new;
end;
$$;
-- De naam begint met "a": triggers lopen op alfabet, deze moet vóór het
-- logboek (projecten_logboek) staan, zodat daar de juiste naam in komt.
drop trigger if exists projecten_a_wie on public.projecten;
create trigger projecten_a_wie
  before insert or update on public.projecten
  for each row execute function public.wie_is_het();

-- ─── 8. Versienummer: niet terug, en niet absurd hoog ──────────────
-- Zelfde als script 21, met een bovengrens: een versie van vijf cijfers of
-- meer wordt geweigerd. Staat er al zo'n getal in een project, dan telt
-- het als 0 (dan kan een project nooit "vastzitten").
create or replace function public.versie_niet_terug()
returns trigger
language plpgsql
as $$
declare
  oud int;
  nieuw int;
begin
  if new.data is not distinct from old.data then
    return new;
  end if;
  if coalesce(new.data ->> '_versieNr', '') ~ '^[0-9]{5,}$' then
    raise exception 'Onbekend versienummer %', new.data ->> '_versieNr' using errcode = 'P0001';
  end if;
  oud := case when coalesce(old.data ->> '_versieNr', '') ~ '^[0-9]{1,6}$'
              then (old.data ->> '_versieNr')::int else 0 end;
  nieuw := case when coalesce(new.data ->> '_versieNr', '') ~ '^[0-9]{1,6}$'
                then (new.data ->> '_versieNr')::int else 0 end;
  if nieuw < oud then
    raise exception 'Verouderde app-versie: tik op ↻ Bijwerken. Je werk blijft op dit apparaat staan.'
      using errcode = 'P0001',
            detail = format('project heeft versie %s, dit apparaat %s', oud, nieuw);
  end if;
  return new;
end;
$$;

-- ─── 9. Nummers van ruiten en foto's ───────────────────────────────
-- Een ruit heeft een heel getal als nummer, een foto letters, cijfers,
-- - en _. De app doet het zelf ook zo (en herstelt het bij het laden).
create or replace function public.ids_controleren()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.data is not distinct from old.data then
    return new;
  end if;
  if jsonb_typeof(new.data -> 'rijen') = 'array' and exists (
       select 1 from jsonb_array_elements(new.data -> 'rijen') e
        where jsonb_typeof(e) <> 'object'
           or jsonb_typeof(e -> 'id') <> 'number'
           or (e ->> 'id') !~ '^[0-9]{1,9}$') then
    raise exception 'Ongeldig nummer van een ruit. Tik op ↻ Bijwerken; je werk blijft op dit apparaat staan.'
      using errcode = 'P0001';
  end if;
  if jsonb_typeof(new.data -> 'fotos') = 'array' and exists (
       select 1 from jsonb_array_elements(new.data -> 'fotos') f
        where jsonb_typeof(f) <> 'object'
           or coalesce(f ->> 'id', '') !~ '^[A-Za-z0-9_-]{1,64}$'
           or (jsonb_typeof(f -> 'markeringen') = 'array' and exists (
                 select 1 from jsonb_array_elements(f -> 'markeringen') m
                  where (m ->> 'rijId') !~ '^[0-9]{1,9}$'))) then
    raise exception 'Ongeldig nummer van een foto. Tik op ↻ Bijwerken; je werk blijft op dit apparaat staan.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists projecten_ids on public.projecten;
create trigger projecten_ids
  before insert or update on public.projecten
  for each row execute function public.ids_controleren();

-- ─── 10. Kleinigheid: vaste zoekvolgorde voor glas_gebruik ─────────
alter function public.glas_gebruik() set search_path = '';

-- ─── Klaar. Wie kan er nu bij? ─────────────────────────────────────
select email, naam, actief, telefoon,
       case when actief then 'kan bij de projecten' else 'GEEN toegang' end as toegang
  from public.gebruikers
 order by actief desc, email;
