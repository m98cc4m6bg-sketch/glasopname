-- ══════════════════════════════════════════════════════════════
--  Testreeks v88 voor de SQL-scripts — tegen een échte Postgres.
--
--  Dit zet een lege database op, draait 13_taken_en_geschiedenis.sql en
--  14_gebruikers_mail_en_statussen.sql, en kijkt daarna of de triggers
--  doen wat ze moeten doen: het logboek, de taakteller, de statussen en
--  het opruimen. Supabase brengt zelf `auth.users` en de rollen mee;
--  die worden hieronder nagemaakt.
--
--  Draaien op een machine met postgresql (Jan heeft dit niet nodig):
--    initdb -D /tmp/pg/data -A trust
--    pg_ctl -D /tmp/pg/data -o "-k /tmp/pg -p 55432 -c listen_addresses=" start
--    psql -h /tmp/pg -p 55432 -U postgres -v ON_ERROR_STOP=1 -f test-sql.sql
--
--  LET OP: dit hoort nooit in Supabase gedraaid te worden — de eerste
--  regels gooien het schema weg.
-- ══════════════════════════════════════════════════════════════

\pset footer off
drop schema if exists public cascade;
drop schema if exists auth cascade;
create schema public;

-- ─── Namaak van wat Supabase zelf meebrengt ──────────────────
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema auth;
create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
grant usage on schema public to authenticated, service_role;
grant usage on schema auth to authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- ─── De basis uit 01_schema.sql en 08_projectlijst_extra.sql ──
create table public.projecten (
  id             uuid primary key default gen_random_uuid(),
  naam           text not null default '',
  datum          text default '',
  status         text not null default 'open',
  data           jsonb not null default '{}'::jsonb,
  gewijzigd_door uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  aantal_ruiten  integer not null default 0,
  adres          text not null default '',
  open_taken     integer not null default 0
);
create table public.app_data (
  key text primary key, waarde jsonb not null, updated_at timestamptz not null default now()
);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger projecten_updated_at before update on public.projecten
  for each row execute function public.set_updated_at();
alter table public.projecten enable row level security;
create policy projecten_select on public.projecten for select to authenticated using (true);
create policy projecten_update on public.projecten for update to authenticated using (true) with check (true);

-- ─── De scripts die getest worden ────────────────────────────
\i 13_taken_en_geschiedenis.sql
\i 14_gebruikers_mail_en_statussen.sql

-- ══════════════ DE CONTROLES ══════════════
-- Verwachting staat bij elke regel; vergelijk de uitkomst daarmee.

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'julian@jelierbouw.nl');
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000002', 'bart@jelierbouw.nl', '{"naam":"Bart"}');

-- 1. Een nieuwe gebruiker komt automatisch in `gebruikers`.
--    verwacht: 2 | julian | Bart
select '1. gebruikers' as test,
       (select count(*) from public.gebruikers) as aantal,
       (select naam from public.gebruikers where email = 'julian@jelierbouw.nl') as naam_uit_mail,
       (select naam from public.gebruikers where email = 'bart@jelierbouw.nl') as naam_uit_meta;

-- 2. Oude statussen worden omgezet.
--    verwacht: aangemaakt (kolom én json), bezig met inmeten/verwerken
insert into public.projecten (id, naam, status, data) values
  ('00000000-0000-4000-8000-0000000000aa', 'Oud open', 'open',
   '{"info":{"status":"open"},"rijen":[]}'::jsonb),
  ('00000000-0000-4000-8000-0000000000bb', 'Oud ingemeten', 'ingemeten',
   '{"info":{"status":"ingemeten"},"rijen":[]}'::jsonb);
\i 14_gebruikers_mail_en_statussen.sql
select '2. migratie' as test, naam, status, data -> 'info' ->> 'status' as status_in_json
  from public.projecten where naam like 'Oud%' order by naam;

insert into public.projecten (id, naam, status, data, gewijzigd_door, gewijzigd_naam)
  values ('00000000-0000-4000-8000-0000000000cc', 'Werkgangtest', 'aangemaakt',
          '{"rijen":[{"id":1},{"id":2},{"id":3}]}'::jsonb,
          '00000000-0000-4000-8000-000000000001', 'julian');

-- 3. Drie ruiten één voor één weg, binnen dezelfde werkgang: de app
--    stuurt de bijgewerkte stand mee met spoor_vervolg = true.
--    verwacht: 1 regel, "3 ruiten verwijderd", 1 momentopname
update public.projecten set data = '{"rijen":[{"id":1},{"id":2}]}'::jsonb,
  samenvatting = '1 ruit verwijderd', gewijzigd_naam = 'julian', spoor_vervolg = false
 where id = '00000000-0000-4000-8000-0000000000cc';
update public.projecten set data = '{"rijen":[{"id":1}]}'::jsonb,
  samenvatting = '2 ruiten verwijderd', gewijzigd_naam = 'julian', spoor_vervolg = true
 where id = '00000000-0000-4000-8000-0000000000cc';
update public.projecten set data = '{"rijen":[]}'::jsonb,
  samenvatting = '3 ruiten verwijderd', gewijzigd_naam = 'julian', spoor_vervolg = true
 where id = '00000000-0000-4000-8000-0000000000cc';
select '3. werkgang' as test, count(*) as regels, max(samenvatting) as tekst,
       count(data) as momentopnames
  from public.projectgeschiedenis where project_id = '00000000-0000-4000-8000-0000000000cc';

-- 4. Iets bijzonders (een ontgrendeling) krijgt een eigen regel.
--    verwacht: 2 regels, laatste = slot geopend …
update public.projecten set data = '{"rijen":[{"id":9}]}'::jsonb,
  samenvatting = 'slot geopend door julian, 1 ruit toegevoegd',
  gewijzigd_naam = 'julian', spoor_vervolg = false
 where id = '00000000-0000-4000-8000-0000000000cc';
select '4. eigen regel' as test, count(*) as regels,
  (select samenvatting from public.projectgeschiedenis
    where project_id = '00000000-0000-4000-8000-0000000000cc'
    order by moment desc, id desc limit 1) as laatste
  from public.projectgeschiedenis where project_id = '00000000-0000-4000-8000-0000000000cc';

-- 5. Een collega krijgt altijd een eigen regel plus een momentopname,
--    ook al zegt zijn app 'vervolg'.
--    verwacht: 3 regels, Bart, 2 momentopnames
update public.projecten set data = '{"rijen":[{"id":9},{"id":10}]}'::jsonb,
  samenvatting = '1 ruit toegevoegd', gewijzigd_naam = 'Bart', spoor_vervolg = true,
  gewijzigd_door = '00000000-0000-4000-8000-000000000002'
 where id = '00000000-0000-4000-8000-0000000000cc';
select '5. collega' as test, count(*) as regels,
  (select wie_naam from public.projectgeschiedenis
    where project_id = '00000000-0000-4000-8000-0000000000cc'
    order by moment desc, id desc limit 1) as laatste_wie,
  count(data) as momentopnames
  from public.projectgeschiedenis where project_id = '00000000-0000-4000-8000-0000000000cc';

-- 6. Doortypen: 200 opslagen in dezelfde werkgang blijven één regel.
--    verwacht: nog steeds 3 regels
do $$
declare i int;
begin
  for i in 1..200 loop
    update public.projecten
       set data = jsonb_build_object('rijen', jsonb_build_array(jsonb_build_object('id', i))),
           samenvatting = '1 ruit gewijzigd', gewijzigd_naam = 'Bart', spoor_vervolg = true,
           gewijzigd_door = '00000000-0000-4000-8000-000000000002'
     where id = '00000000-0000-4000-8000-0000000000cc';
  end loop;
end $$;
select '6. doortypen' as test, count(*) as regels, count(data) as momentopnames
  from public.projectgeschiedenis where project_id = '00000000-0000-4000-8000-0000000000cc';

-- 7. 250 losse werkgangen worden opgeruimd tot 200 regels.
do $$
declare i int;
begin
  for i in 1..250 loop
    update public.projecten
       set data = jsonb_build_object('rijen', jsonb_build_array(jsonb_build_object('nr', i))),
           samenvatting = 'losse wijziging ' || i, gewijzigd_naam = 'julian', spoor_vervolg = false,
           gewijzigd_door = '00000000-0000-4000-8000-000000000001'
     where id = '00000000-0000-4000-8000-0000000000cc';
  end loop;
end $$;
select '7. opruimen' as test, count(*) as regels, count(data) as momentopnames
  from public.projectgeschiedenis where project_id = '00000000-0000-4000-8000-0000000000cc';

-- 8. De taakteller op de projectrij.
--    verwacht: 2, dan 1, dan 0
insert into public.taken (project_id, tekst, eigenaar, eigenaar_naam) values
  ('00000000-0000-4000-8000-0000000000cc', 'Rooster nameten',
   '00000000-0000-4000-8000-000000000002', 'Bart'),
  ('00000000-0000-4000-8000-0000000000cc', 'Sleutel ophalen',
   '00000000-0000-4000-8000-000000000001', 'julian');
select '8a. taken' as test, open_taken from public.projecten
 where id = '00000000-0000-4000-8000-0000000000cc';
update public.taken set klaar = true where tekst = 'Sleutel ophalen';
select '8b. na afvinken' as test, open_taken from public.projecten
 where id = '00000000-0000-4000-8000-0000000000cc';
delete from public.taken where tekst = 'Rooster nameten';
select '8c. na verwijderen' as test, open_taken from public.projecten
 where id = '00000000-0000-4000-8000-0000000000cc';

-- 9. Een verwijderd project laat geen taken of logboek achter.
--    verwacht: 0 | 0
delete from public.projecten where id = '00000000-0000-4000-8000-0000000000cc';
select '9. opschonen' as test,
       (select count(*) from public.taken
         where project_id = '00000000-0000-4000-8000-0000000000cc') as taken_over,
       (select count(*) from public.projectgeschiedenis
         where project_id = '00000000-0000-4000-8000-0000000000cc') as logboek_over;

-- 10. Beide scripts nog eens draaien mag.
\i 13_taken_en_geschiedenis.sql
\i 14_gebruikers_mail_en_statussen.sql
select '10. opnieuw draaien' as test, 'gelukt' as uitkomst;

-- 11. Het aantal ruiten per project opnieuw tellen (v89).
--     verwacht: Tellen A = 8 (4 + 1 + 1 + 2), Tellen leeg = 0
insert into public.projecten (naam, data) values
 ('Tellen A', '{"rijen":[{"breedte":"1000","hoogte":"2000","aantal":"4"},
                         {"breedte":"500","hoogte":"500"},
                         {"breedte":"","hoogte":""},
                         {"breedte":"700","hoogte":"700","aantal":""},
                         {"breedte":"800","hoogte":"800","aantal":"2 stuks"}]}'::jsonb),
 ('Tellen leeg', '{"rijen":[]}'::jsonb);
\i 15_ruiten_tellen.sql
select '11. ruiten tellen' as test, naam, aantal_ruiten
  from public.projecten where naam like 'Tellen%' order by naam;

-- 12. Een vertrokken medewerker kunnen verwijderen (v89).
--     verwacht: gebruiker 0, in_lijst 0, taak_los t, naam_bewaard weg, project_los t
\i 16_gebruikers_verwijderen.sql
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000f001', 'weg@jelierbouw.nl');
insert into public.projecten (id, naam, gewijzigd_door)
  values ('00000000-0000-4000-8000-00000000f0aa', 'Project van iemand',
          '00000000-0000-4000-8000-00000000f001');
insert into public.taken (project_id, tekst, eigenaar, eigenaar_naam, aangemaakt_door)
  values ('00000000-0000-4000-8000-00000000f0aa', 'Taak van weg',
          '00000000-0000-4000-8000-00000000f001', 'weg',
          '00000000-0000-4000-8000-00000000f001');
delete from auth.users where id = '00000000-0000-4000-8000-00000000f001';
select '12. medewerker weg' as test,
  (select count(*) from auth.users where id = '00000000-0000-4000-8000-00000000f001') as gebruiker,
  (select count(*) from public.gebruikers where id = '00000000-0000-4000-8000-00000000f001') as in_lijst,
  (select eigenaar is null from public.taken where tekst = 'Taak van weg') as taak_los,
  (select eigenaar_naam from public.taken where tekst = 'Taak van weg') as naam_bewaard,
  (select gewijzigd_door is null from public.projecten where naam = 'Project van iemand') as project_los;
