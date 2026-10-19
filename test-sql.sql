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

-- ══════════════ v91 ══════════════

-- 13. VSG 10.10.x krijgt 20 mm en 50 kg/m²; de rest van glas_data blijft.
--     verwacht: 20 | 50 | 20 | 50 | 20 | 50 | 4 (Enkel glas 4 mm ongemoeid)
insert into public.app_data (key, waarde) values ('glas_data', '{"lookup": {
  "Gelaagd glas (VSG)|1010.2": {"glasOnly": 2, "totaal": 2, "kg_m2": 5},
  "Gehard gelaagd (ESG+VSG)|1010.2 ESG": {"glasOnly": 2, "totaal": 2, "kg_m2": 5},
  "Gehard gelaagd (ESG+VSG)|1010.4 ESG": {"glasOnly": 2, "totaal": 2, "kg_m2": 5},
  "Enkel glas|4 mm": {"glasOnly": 4, "totaal": 4, "kg_m2": 10}}, "ral_kleuren": ["RAL 9010"]}'::jsonb);
\i 17_vsg_1010.sql
\i 17_vsg_1010.sql
select '13. vsg 1010' as test,
  waarde->'lookup'->'Gelaagd glas (VSG)|1010.2'->>'totaal' as vsg_mm,
  waarde->'lookup'->'Gelaagd glas (VSG)|1010.2'->>'kg_m2' as vsg_kg,
  waarde->'lookup'->'Gehard gelaagd (ESG+VSG)|1010.2 ESG'->>'totaal' as esg2_mm,
  waarde->'lookup'->'Gehard gelaagd (ESG+VSG)|1010.2 ESG'->>'kg_m2' as esg2_kg,
  waarde->'lookup'->'Gehard gelaagd (ESG+VSG)|1010.4 ESG'->>'totaal' as esg4_mm,
  waarde->'lookup'->'Gehard gelaagd (ESG+VSG)|1010.4 ESG'->>'kg_m2' as esg4_kg,
  waarde->'lookup'->'Enkel glas|4 mm'->>'totaal' as enkel_mm,
  jsonb_array_length(waarde->'ral_kleuren') as ral_blijft
  from public.app_data where key = 'glas_data';

-- 14. Prullenbak: weggooien en terugzetten komen elk met naam in het logboek,
--     de inhoud blijft, en het script mag twee keer.
--     verwacht: na_weggooien t | 1 | julian ; na_terugzetten f | 1 | bart ; inhoud_blijft 3
\i 18_prullenbak.sql
\i 18_prullenbak.sql
insert into public.projecten (id, naam, data, gewijzigd_door, gewijzigd_naam)
  values ('00000000-0000-4000-8000-0000000000dd', 'Prullenbaktest',
          '{"rijen":[{"id":1},{"id":2},{"id":3}]}'::jsonb,
          '00000000-0000-4000-8000-000000000001', 'julian');
update public.projecten
   set verwijderd_op = now(), verwijderd_door = '00000000-0000-4000-8000-000000000001',
       verwijderd_naam = 'julian',
       gewijzigd_door = '00000000-0000-4000-8000-000000000001', gewijzigd_naam = 'julian'
 where id = '00000000-0000-4000-8000-0000000000dd';
select '14a. naar de prullenbak' as test,
  (select verwijderd_op is not null from public.projecten where naam = 'Prullenbaktest') as weg,
  (select count(*) from public.projectgeschiedenis
    where project_id = '00000000-0000-4000-8000-0000000000dd' and samenvatting = 'project naar de prullenbak') as regels,
  (select wie_naam from public.projectgeschiedenis
    where project_id = '00000000-0000-4000-8000-0000000000dd' and samenvatting = 'project naar de prullenbak') as wie;
update public.projecten
   set verwijderd_op = null, verwijderd_door = null, verwijderd_naam = null,
       gewijzigd_door = '00000000-0000-4000-8000-000000000002', gewijzigd_naam = 'bart'
 where id = '00000000-0000-4000-8000-0000000000dd';
select '14b. teruggezet' as test,
  (select verwijderd_op is not null from public.projecten where naam = 'Prullenbaktest') as weg,
  (select count(*) from public.projectgeschiedenis
    where project_id = '00000000-0000-4000-8000-0000000000dd' and samenvatting like 'project teruggezet%') as regels,
  (select wie_naam from public.projectgeschiedenis
    where project_id = '00000000-0000-4000-8000-0000000000dd' and samenvatting like 'project teruggezet%') as wie,
  (select jsonb_array_length(data->'rijen') from public.projecten where naam = 'Prullenbaktest') as inhoud_blijft;

-- 15. De bestelmail (Edge Function, v91) stuurt spoor_vervolg = false mee:
--     dan krijgt hij een eigen regel en blijft de regel ervoor staan.
--     verwacht: 2 ruiten gewijzigd | bestelmail verstuurd naar x@y.nl
update public.projecten
   set data = '{"rijen":[{"id":1,"b":1},{"id":2,"b":1},{"id":3}]}'::jsonb,
       samenvatting = '2 ruiten gewijzigd', spoor_vervolg = false,
       gewijzigd_door = '00000000-0000-4000-8000-000000000001', gewijzigd_naam = 'julian'
 where id = '00000000-0000-4000-8000-0000000000dd';
update public.projecten
   set status = 'besteld', besteld_op = now(), samenvatting = 'bestelmail verstuurd naar x@y.nl',
       spoor_vervolg = false,
       gewijzigd_door = '00000000-0000-4000-8000-000000000001', gewijzigd_naam = 'julian'
 where id = '00000000-0000-4000-8000-0000000000dd';
select '15. bestelmail eigen regel' as test, samenvatting
  from public.projectgeschiedenis
 where project_id = '00000000-0000-4000-8000-0000000000dd'
   and samenvatting in ('2 ruiten gewijzigd', 'bestelmail verstuurd naar x@y.nl')
 order by moment, id;

-- 15b. Daarna slaat de app op met spoor_vervolg = true (zelfde persoon, zelfde
--      tekst): dat werkt de regel van de mailfunctie bij, er komt er geen bij.
--      verwacht: 1
update public.projecten
   set data = jsonb_set(data, '{info}', '{"status":"besteld"}'::jsonb),
       samenvatting = 'bestelmail verstuurd naar x@y.nl', spoor_vervolg = true,
       gewijzigd_door = '00000000-0000-4000-8000-000000000001', gewijzigd_naam = 'julian'
 where id = '00000000-0000-4000-8000-0000000000dd';
select '15b. geen dubbele regel' as test, count(*) as regels_bestelmail
  from public.projectgeschiedenis
 where project_id = '00000000-0000-4000-8000-0000000000dd'
   and samenvatting = 'bestelmail verstuurd naar x@y.nl';

-- 16. Originele foto's (v93): de opslagmap gaat naar 50 MB en neemt ook HEIC
--     aan; de rest (privé) blijft. Het script mag twee keer.
--     Supabase brengt storage.buckets zelf mee; hier een namaak met dezelfde
--     kolommen, gevuld zoals 04_projectfotos.sql dat deed.
--     verwacht: f | 52428800 | 8 | t | t
drop schema if exists storage cascade;
create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
insert into storage.buckets values ('projectfotos', 'projectfotos', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp']);
insert into storage.buckets values ('anders', 'anders', true, 1000, array['text/plain']);
\i 19_originelen.sql
\i 19_originelen.sql
select '16. originelen' as test, public, file_size_limit,
       array_length(allowed_mime_types, 1) as soorten,
       'image/heic' = any(allowed_mime_types) as heic,
       'image/jpeg' = any(allowed_mime_types) as jpeg
  from storage.buckets where id = 'projectfotos';
select '16b. andere map ongemoeid' as test, file_size_limit, allowed_mime_types
  from storage.buckets where id = 'anders';

-- 17. Opbouwlijsten (v96): dubbelen weg, omdraaien naar dun-binnen, HR++ geen
--     spouw > 16, triple alleen spouw >= 9 en middenblad 4; gelaagd blijft;
--     de lookup volgt de omgedraaide namen. Twee keer draaien = zelfde uitkomst.
--     verwacht:
--       17a. ["4-13-4", "4-13-5", "4-13-8"]
--       17b. ["4-16-4-16-6"]
--       17c. ["33.1-13-4", "4-13-33.1"]
--       17d. ["4-13-6 ZW", "33.1-13-4 ZW"]
--       17e. {"kg_m2": 30, "totaal": 25, "glasOnly": 12} | t (oude naam blijft)
--       17f. ["3 mm", "4 mm"] (ander type ongemoeid)
update public.app_data
   set waarde = waarde || '{"opbouw_per_type": {
         "HR++ glas": ["4-13-4", "4-13-5", "5-13-4", "8-13-4", "4-20-4"],
         "HR+++ glas (Triple)": ["4-8-4-8-4", "6-16-4-16-4", "4-16-4-16-6", "4-16-6-16-4"],
         "Gelaagd glas (VSG)": ["33.1-13-4", "4-13-33.1"],
         "Zonwerend glas": ["6-13-4 ZW", "33.1-13-4 ZW"],
         "Enkel glas": ["3 mm", "4 mm"]}}'::jsonb
 where key = 'glas_data';
update public.app_data
   set waarde = jsonb_set(waarde, '{lookup,HR++ glas|8-13-4}', '{"glasOnly": 12, "totaal": 25, "kg_m2": 30}'::jsonb)
 where key = 'glas_data';
\i 20_opbouwlijsten.sql
\i 20_opbouwlijsten.sql
select '17a. HR++' as test, waarde->'opbouw_per_type'->'HR++ glas' as lijst from public.app_data where key = 'glas_data';
select '17b. triple' as test, waarde->'opbouw_per_type'->'HR+++ glas (Triple)' as lijst from public.app_data where key = 'glas_data';
select '17c. gelaagd' as test, waarde->'opbouw_per_type'->'Gelaagd glas (VSG)' as lijst from public.app_data where key = 'glas_data';
select '17d. zonwerend' as test, waarde->'opbouw_per_type'->'Zonwerend glas' as lijst from public.app_data where key = 'glas_data';
select '17e. lookup' as test, waarde->'lookup'->'HR++ glas|4-13-8' as nieuw,
       (waarde->'lookup') ? 'HR++ glas|8-13-4' as oud_blijft
  from public.app_data where key = 'glas_data';
select '17f. enkel' as test, waarde->'opbouw_per_type'->'Enkel glas' as lijst from public.app_data where key = 'glas_data';

-- 18. Slot tegen oude app-versies (v99): een opslag met een lager
--     versienummer dan wat er staat wordt geweigerd; zonder nummer telt
--     als 0; alleen de kolom data telt. Twee keer draaien mag.
--     verwacht:
--       18a. ok  (geen nummer → 99)
--       18b. geweigerd: Verouderde app-versie… (98 over 99)
--       18c. geweigerd (geen nummer over 99: een app van vóór v99)
--       18d. ok  (alleen de status, data gelijk)
--       18e. ok  (99 → 100) en daarna 18f. geweigerd (99 over 100)
--       18g. geweigerd ('abc' telt als 0)
--       18h. versie 100, status 'gemonteerd' (niets overschreven)
\i 21_versieslot.sql
\i 21_versieslot.sql
insert into public.projecten (id, naam, status, data) values
  ('00000000-0000-4000-8000-0000000000ee', 'Versieproject', 'aangemaakt',
   '{"info":{"status":"aangemaakt"},"rijen":[]}'::jsonb);
create temp table versie_uitkomst (stap text, uitkomst text);
do $$
declare
  pid uuid := '00000000-0000-4000-8000-0000000000ee';
begin
  begin
    update public.projecten set data = '{"rijen":[1],"_versieNr":99}'::jsonb where id = pid;
    insert into versie_uitkomst values ('18a', 'ok');
  exception when others then insert into versie_uitkomst values ('18a', 'geweigerd: ' || sqlerrm); end;
  begin
    update public.projecten set data = '{"rijen":[2],"_versieNr":98}'::jsonb where id = pid;
    insert into versie_uitkomst values ('18b', 'ok');
  exception when others then insert into versie_uitkomst values ('18b', 'geweigerd: ' || sqlerrm); end;
  begin
    update public.projecten set data = '{"rijen":[3]}'::jsonb where id = pid;
    insert into versie_uitkomst values ('18c', 'ok');
  exception when others then insert into versie_uitkomst values ('18c', 'geweigerd: ' || left(sqlerrm, 24)); end;
  begin
    update public.projecten set status = 'gemonteerd' where id = pid;
    insert into versie_uitkomst values ('18d', 'ok');
  exception when others then insert into versie_uitkomst values ('18d', 'geweigerd: ' || sqlerrm); end;
  begin
    update public.projecten set data = '{"rijen":[4],"_versieNr":100}'::jsonb where id = pid;
    insert into versie_uitkomst values ('18e', 'ok');
  exception when others then insert into versie_uitkomst values ('18e', 'geweigerd: ' || sqlerrm); end;
  begin
    update public.projecten set data = '{"rijen":[5],"_versieNr":99}'::jsonb where id = pid;
    insert into versie_uitkomst values ('18f', 'ok');
  exception when others then insert into versie_uitkomst values ('18f', 'geweigerd: ' || left(sqlerrm, 24)); end;
  begin
    update public.projecten set data = '{"rijen":[6],"_versieNr":"abc"}'::jsonb where id = pid;
    insert into versie_uitkomst values ('18g', 'ok');
  exception when others then insert into versie_uitkomst values ('18g', 'geweigerd: ' || left(sqlerrm, 24)); end;
end $$;
select stap as test, uitkomst from versie_uitkomst order by stap;
select '18h. eindstand' as test, data->>'_versieNr' as versie, data->'rijen' as rijen, status
  from public.projecten where id = '00000000-0000-4000-8000-0000000000ee';

-- 19. Ruimte en prullenbak op de klok van de server (v103).
--     verwacht:
--       19a. database > 0, opslag 3000 (alleen projectfotos), 2 bestanden
--       19b. t  (een apparaat met de klok een maand vooruit: toch now())
--       19c. t  (een gezet tijdstip kan niet verschoven worden)
--       19d. alleen 'Oud in prullenbak' is opruimbaar
--       19e. terugzetten (null) mag
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text, metadata jsonb
);
insert into storage.objects (bucket_id, name, metadata) values
  ('projectfotos', 'a/1.jpg', '{"size": 1000}'), ('projectfotos', 'a/2.jpg', '{"size": 2000}'),
  ('anders', 'x', '{"size": 99999}');
\i 22_gebruik_en_prullenbak.sql
\i 22_gebruik_en_prullenbak.sql
select '19a. gebruik' as test,
       (public.glas_gebruik() ->> 'database_bytes')::bigint > 0 as database,
       public.glas_gebruik() ->> 'opslag_bytes' as opslag,
       public.glas_gebruik() ->> 'opslag_bestanden' as bestanden;
insert into public.projecten (id, naam, data) values
  ('00000000-0000-4000-8000-0000000000f1', 'Klok vooruit', '{}'::jsonb);
insert into public.projecten (id, naam, data, verwijderd_op) values
  ('00000000-0000-4000-8000-0000000000f2', 'Oud in prullenbak', '{}'::jsonb, now() - interval '40 days'),
  ('00000000-0000-4000-8000-0000000000f3', 'Net in prullenbak', '{}'::jsonb, now() - interval '2 days');
update public.projecten set verwijderd_op = now() + interval '31 days'
 where id = '00000000-0000-4000-8000-0000000000f1';
select '19b. servertijd' as test, verwijderd_op <= now() + interval '1 minute' as klopt
  from public.projecten where id = '00000000-0000-4000-8000-0000000000f1';
update public.projecten set verwijderd_op = now() - interval '400 days'
 where id = '00000000-0000-4000-8000-0000000000f3';
select '19c. niet te verschuiven' as test, verwijderd_op > now() - interval '3 days' as klopt
  from public.projecten where id = '00000000-0000-4000-8000-0000000000f3';
select '19d. opruimbaar' as test, p.naam
  from public.prullenbak_opruimbaar(30) o join public.projecten p on p.id = o.id
 where p.id in ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f2',
                '00000000-0000-4000-8000-0000000000f3');
update public.projecten set verwijderd_op = null where id = '00000000-0000-4000-8000-0000000000f3';
select '19e. terugzetten' as test, verwijderd_op is null as teruggezet
  from public.projecten where id = '00000000-0000-4000-8000-0000000000f3';

-- 20. Een bestelling gaat nooit verloren (v104, 23_bestellingen.sql).
--     Situatie: op kantoor 'Ja, verstuurd' (1 bestelling, status besteld).
--     Een iPad die offline was, stuurt daarna het project zonder die
--     bestelling, met status 'bezig' en een gewijzigde ruit.
--     verwacht:
--       20a. 1 bestelling terug, status besteld (kolom én info), slot null,
--            besteld.ruiten in de oude vorm (kenmerk), de ruit van de iPad blijft
--       20b. een 2e van een ander apparaat met hetzelfde nummer: 2 stuks, nr 1 en 2
--       20c. een intrekking gaat niet verloren door een apparaat dat hem niet kende
--       20d. bewust intrekken (lagere status) mag gewoon
--       20e. zonder bestellingen verandert er niets (gewone opslag)
\i 23_bestellingen.sql
\i 23_bestellingen.sql
insert into public.projecten (id, naam, status, data) values
  ('00000000-0000-4000-8000-0000000000b1', 'Bestelproef', 'besteld',
   '{"rijen":[{"id":1,"merk":"K1","breedte":"1200"}],
     "info":{"status":"besteld","slot":null,
       "besteld":{"op":"2026-10-14T08:00:00Z","door":"julian","aantal":1,"ruiten":{"1":"abc"}},
       "bestellingen":[{"nr":1,"op":"2026-10-14T08:00:00Z","door":"julian","aantal":1,
                        "ruiten":{"1":{"k":"abc","opLijst":true,"breedte":"1200"}}}]}}'::jsonb);
update public.projecten
   set status = 'bezig met inmeten/verwerken',
       data = '{"rijen":[{"id":1,"merk":"K1","breedte":"1210"}],
                "info":{"status":"bezig met inmeten/verwerken","slot":{"open":true,"door":"bart"}}}'::jsonb
 where id = '00000000-0000-4000-8000-0000000000b1';
select '20a. terug' as test,
       jsonb_array_length(data #> '{info,bestellingen}') as aantal,
       status, data #>> '{info,status}' as info_status,
       data #> '{info,slot}' = 'null'::jsonb as slot_dicht,
       data #>> '{info,besteld,ruiten,1}' as kenmerk,
       data #>> '{rijen,0,breedte}' as ruit_van_ipad
  from public.projecten where id = '00000000-0000-4000-8000-0000000000b1';
update public.projecten
   set data = jsonb_set(data, '{info,bestellingen}',
     '[{"nr":2,"op":"2026-10-14T09:00:00Z","door":"bart","aantal":1,"ruiten":{"1":{"k":"def","opLijst":true}}}]'::jsonb)
 where id = '00000000-0000-4000-8000-0000000000b1';
select '20b. twee' as test,
       jsonb_array_length(data #> '{info,bestellingen}') as aantal,
       (select string_agg(e ->> 'nr', ',' order by e ->> 'op') from jsonb_array_elements(data #> '{info,bestellingen}') e) as nummers,
       data #>> '{info,besteld,op}' as laatste
  from public.projecten where id = '00000000-0000-4000-8000-0000000000b1';
-- iemand trekt de 2e in
update public.projecten
   set data = jsonb_set(data, '{info,bestellingen,1,ingetrokken}', '{"op":"2026-10-14T10:00:00Z","door":"julian"}'::jsonb)
 where id = '00000000-0000-4000-8000-0000000000b1';
-- een apparaat dat de intrekking niet kende, stuurt de 2e zonder
update public.projecten
   set data = jsonb_set(data, '{info,bestellingen,1}', (data #> '{info,bestellingen,1}') - 'ingetrokken')
 where id = '00000000-0000-4000-8000-0000000000b1';
select '20c. intrekking blijft' as test,
       data #> '{info,bestellingen,1,ingetrokken}' is not null as ingetrokken,
       data #>> '{info,besteld,op}' as besteld_volgt_de_1e
  from public.projecten where id = '00000000-0000-4000-8000-0000000000b1';
-- bewust: de 1e ook ingetrokken, status terug
update public.projecten
   set status = 'bezig met inmeten/verwerken',
       data = jsonb_set(jsonb_set(data, '{info,bestellingen,0,ingetrokken}', '{"op":"2026-10-14T11:00:00Z"}'::jsonb),
                        '{info,status}', '"bezig met inmeten/verwerken"')
 where id = '00000000-0000-4000-8000-0000000000b1';
select '20d. bewust intrekken' as test, status,
       jsonb_array_length(data #> '{info,bestellingen}') as nog_in_geschiedenis
  from public.projecten where id = '00000000-0000-4000-8000-0000000000b1';
update public.projecten set data = '{"rijen":[],"info":{}}'::jsonb, status = 'open'
 where id = '00000000-0000-4000-8000-0000000000f1';
select '20e. gewone opslag' as test, data, status
  from public.projecten where id = '00000000-0000-4000-8000-0000000000f1';
--       20f. drie bestellingen over twee apparaten: volgorde op tijdstip
--            (kantoor 09:00 en 09:30, iPad 10:00 als 'nr 2'): de iPad als laatste
--       20g. een apparaat dat ontgrendeld was, opent het slot niet na een 'Ja' elders
--       20h. een apparaat dat een intrekking niet kende, zet de status niet terug op besteld
--            (status bezig, info ook, ingetrokken blijft, geen info.besteld)
update public.projecten set status = 'besteld', data = '{"rijen":[],"info":{"status":"besteld","slot":null,
  "bestellingen":[{"nr":1,"op":"2026-10-14T08:00:00Z","ruiten":{"1":{"k":"a","opLijst":true}}},
                  {"nr":2,"op":"2026-10-14T09:00:00Z","ruiten":{"1":{"k":"b","opLijst":true}}},
                  {"nr":3,"op":"2026-10-14T09:30:00Z","ruiten":{"1":{"k":"c","opLijst":true}}}]}}'::jsonb
 where id = '00000000-0000-4000-8000-0000000000b1';
update public.projecten set data = jsonb_set(data, '{info,bestellingen}',
  '[{"nr":1,"op":"2026-10-14T08:00:00Z","ruiten":{"1":{"k":"a","opLijst":true}}},
    {"nr":2,"op":"2026-10-14T10:00:00Z","ruiten":{"1":{"k":"ipad","opLijst":true}}}]'::jsonb)
 where id = '00000000-0000-4000-8000-0000000000b1';
select '20f. volgorde' as test, data #>> '{info,besteld,ruiten,1}' as laatste_kenmerk,
       (select string_agg(e ->> 'nr', ',') from jsonb_array_elements(data #> '{info,bestellingen}') e) as nummers
  from public.projecten where id = '00000000-0000-4000-8000-0000000000b1';
update public.projecten set data = jsonb_set(jsonb_set(data, '{info,bestellingen}',
  '[{"nr":1,"op":"2026-10-14T08:00:00Z","ruiten":{"1":{"k":"a","opLijst":true}}}]'::jsonb),
  '{info,slot}', '{"open":true,"door":"bart"}'::jsonb)
 where id = '00000000-0000-4000-8000-0000000000b1';
select '20g. slot blijft dicht' as test, data #> '{info,slot}' = 'null'::jsonb as dicht, status
  from public.projecten where id = '00000000-0000-4000-8000-0000000000b1';
insert into public.projecten (id, naam, status, data) values
  ('00000000-0000-4000-8000-0000000000b2', 'Ingetrokken', 'bezig met inmeten/verwerken',
   '{"rijen":[],"info":{"status":"bezig met inmeten/verwerken",
     "bestellingen":[{"nr":1,"op":"2026-10-14T08:00:00Z","ingetrokken":{"op":"2026-10-14T12:00:00Z"},"ruiten":{}}]}}'::jsonb);
update public.projecten set status = 'besteld', data = '{"rijen":[],"info":{"status":"besteld",
  "besteld":{"op":"2026-10-14T08:00:00Z","ruiten":{}},
  "bestellingen":[{"nr":1,"op":"2026-10-14T08:00:00Z","ruiten":{}}]}}'::jsonb
 where id = '00000000-0000-4000-8000-0000000000b2';
select '20h. intrekking blijft gelden' as test, status, data #>> '{info,status}' as info_status,
       data #> '{info,bestellingen,0,ingetrokken}' is not null as ingetrokken, data #> '{info,besteld}' is null as geen_besteld
  from public.projecten where id = '00000000-0000-4000-8000-0000000000b2';
--       20i. v105: aanvullingen. De 1e (K1 a, K2 b, K3 c), dan een aanvulling
--            (K2 vervangen door b2, K4 nieuw, K3 geannuleerd, K5 bekend maar
--            niet compleet). Een apparaat zonder de aanvulling slaat op: die
--            komt terug, en info.besteld = alles wat besteld is.
--            Verwacht: 2 bestellingen; besteld K1 a, K2 b2, K4 d, K5 e (bekend),
--            geen K3; aantal 3.
insert into public.projecten (id, naam, status, data) values
  ('00000000-0000-4000-8000-0000000000b3', 'Aanvulling', 'besteld',
   '{"rijen":[],"info":{"status":"besteld","slot":null,
     "bestellingen":[
       {"nr":1,"op":"2026-10-14T08:00:00Z","soort":"volledig","ruiten":{"1":{"k":"a","opLijst":true},"2":{"k":"b","opLijst":true},"3":{"k":"c","opLijst":true}}},
       {"nr":2,"op":"2026-10-15T08:00:00Z","soort":"aanvulling","ruiten":{"2":{"k":"b2","opLijst":true,"vervangt":1},"4":{"k":"d","opLijst":true},"5":{"k":"e","opLijst":false}},
        "vervallen":{"3":{"k":"c","nr":1,"kort":1}}}]}}'::jsonb);
update public.projecten set data = '{"rijen":[],"info":{"status":"besteld","slot":null,
  "bestellingen":[{"nr":1,"op":"2026-10-14T08:00:00Z","soort":"volledig","ruiten":{"1":{"k":"a","opLijst":true},"2":{"k":"b","opLijst":true},"3":{"k":"c","opLijst":true}}}]}}'::jsonb
 where id = '00000000-0000-4000-8000-0000000000b3';
select '20i. aanvulling' as test,
       jsonb_array_length(data #> '{info,bestellingen}') as aantal,
       data #> '{info,besteld,ruiten}' as besteld,
       data #>> '{info,besteld,aantal}' as besteld_aantal
  from public.projecten where id = '00000000-0000-4000-8000-0000000000b3';
--       20j. de aanvulling ingetrokken (bewust, door een apparaat dat hem kende):
--            besteld = weer de 1e (K1 a, K2 b, K3 c)
update public.projecten
   set data = jsonb_set(data, '{info,bestellingen,1,ingetrokken}', '{"op":"2026-10-15T09:00:00Z"}'::jsonb)
 where id = '00000000-0000-4000-8000-0000000000b3';
update public.projecten set data = jsonb_set(data, '{info,bestellingen}', '[]'::jsonb)
 where id = '00000000-0000-4000-8000-0000000000b3';
select '20j. aanvulling ingetrokken' as test,
       data #> '{info,besteld,ruiten}' as besteld,
       data #>> '{info,besteld,aantal}' as besteld_aantal
  from public.projecten where id = '00000000-0000-4000-8000-0000000000b3';
-- ─── v106: bewerkslot (24_bewerkslot.sql) ─────────────────────
--       21a. A slaat op (v106, slot vrij): A krijgt het slot
--       21b. B slaat op: geweigerd 'Bewerkslot: julian bewerkt …'
--       21c. A slaat opnieuw op: ok
--       21d. een app van v105 (geen apparaatcode, versie 105): niet door het
--            bewerkslot, wel door het versieslot geweigerd (Verouderde …)
--       21e. alleen de status wijzigen (geen inhoud) door wie dan ook: ok
--       21f. B 'claim' terwijl A het heeft: blijft A
--       21g. B 'vraag': A houdt het, overname_naam = bart
--       21h. B 'hartslag': verandert niets aan het slot (blijft A)
--       21i. A 'vrijgeven' en B 'claim': B heeft het, het seintje is weg
--       21j. nu A opslaan: geweigerd; B opslaan: ok
--       21k. A 'forceer': A heeft het weer, vorige = bart
--       21l. een project verwijderen haalt zijn slot mee weg
--       21m. B 'vraag', dan B 'intrekken': het seintje is weg, A houdt het;
--            'intrekken' door een ander (C) haalt B's vraag niet weg
--       21n. het project is VRIJ en C komt terug met werk op een oudere stand
--            (voortgebouwd op 2, terwijl bart intussen opsloeg): geweigerd
--            'bart heeft dit project intussen gewijzigd'; met de juiste
--            basis: ok, C heeft het slot; het volgnummer telt door
--       21o. hetzelfde apparaat met een oude basis (zijn eigen opslag kwam
--            aan, het antwoord niet): ok
--       21q. hetzelfde apparaat, ander tabblad (andere sessie), oude basis:
--            geweigerd (twee tabbladen overschrijven elkaar niet)
--       21p. de overgang: een app van v105 slaat op vóór de eerste opslag
--            met v106, terwijl een v106-apparaat het slot heeft. De volgende
--            opslag van dat apparaat gaat apart (er kwam iets tussen); niets
--            overschreven
\i 24_bewerkslot.sql
\i 24_bewerkslot.sql
insert into public.projecten (id, naam, status, data) values
  ('00000000-0000-4000-8000-0000000000c1', 'Slotproject', 'aangemaakt',
   '{"info":{"status":"aangemaakt"},"rijen":[]}'::jsonb);
create temp table slot_uitkomst (stap text, uitkomst text);
do $$
declare
  pid uuid := '00000000-0000-4000-8000-0000000000c1';
  r jsonb;
begin
  begin
    update public.projecten set data = '{"rijen":[1],"_versieNr":106,"_apparaat":"A","_apparaatNaam":"julian","_apparaatSoort":"Mac"}'::jsonb where id = pid;
    insert into slot_uitkomst select '21a', 'ok, houder ' || apparaat || ' ' || naam || ' ' || omschrijving from public.bewerkslot where project_id = pid;
  exception when others then insert into slot_uitkomst values ('21a', 'geweigerd: ' || sqlerrm); end;
  begin
    update public.projecten set data = '{"rijen":[2],"_versieNr":106,"_apparaat":"B","_apparaatNaam":"bart"}'::jsonb where id = pid;
    insert into slot_uitkomst values ('21b', 'ok');
  exception when others then insert into slot_uitkomst values ('21b', 'geweigerd: ' || left(sqlerrm, 40)); end;
  begin
    update public.projecten set data = '{"rijen":[3],"_versieNr":106,"_apparaat":"A"}'::jsonb where id = pid;
    insert into slot_uitkomst values ('21c', 'ok');
  exception when others then insert into slot_uitkomst values ('21c', 'geweigerd: ' || sqlerrm); end;
  begin
    update public.projecten set data = '{"rijen":[4],"_versieNr":105}'::jsonb where id = pid;
    insert into slot_uitkomst values ('21d', 'ok');
  exception when others then insert into slot_uitkomst values ('21d', 'geweigerd: ' || left(sqlerrm, 24)); end;
  begin
    update public.projecten set status = 'besteld' where id = pid;
    insert into slot_uitkomst values ('21e', 'ok');
  exception when others then insert into slot_uitkomst values ('21e', 'geweigerd: ' || sqlerrm); end;
  r := public.glas_bewerken(pid, 'B', 'bart', 'iPad', 'claim');
  insert into slot_uitkomst values ('21f', 'houder ' || (r ->> 'apparaat'));
  r := public.glas_bewerken(pid, 'B', 'bart', 'iPad', 'vraag');
  insert into slot_uitkomst values ('21g', 'houder ' || (r ->> 'apparaat') || ', seintje van ' || (r ->> 'overname_naam'));
  r := public.glas_bewerken(pid, 'B', 'bart', 'iPad', 'hartslag');
  insert into slot_uitkomst values ('21h', 'houder ' || (r ->> 'apparaat'));
  r := public.glas_bewerken(pid, 'A', 'julian', 'Mac', 'vrijgeven');
  r := public.glas_bewerken(pid, 'B', 'bart', 'iPad', 'claim');
  insert into slot_uitkomst values ('21i', 'houder ' || (r ->> 'apparaat') || ', seintje ' || coalesce(r ->> 'overname_naam', 'weg'));
  begin
    update public.projecten set data = '{"rijen":[5],"_versieNr":106,"_apparaat":"A"}'::jsonb where id = pid;
    insert into slot_uitkomst values ('21j', 'A ok');
  exception when others then insert into slot_uitkomst values ('21j', 'A geweigerd'); end;
  begin
    update public.projecten set data = '{"rijen":[6],"_versieNr":106,"_apparaat":"B","_apparaatNaam":"bart","_basis":"2"}'::jsonb where id = pid;
    insert into slot_uitkomst values ('21j', 'B ok');
  exception when others then insert into slot_uitkomst values ('21j', 'B geweigerd: ' || sqlerrm); end;
  r := public.glas_bewerken(pid, 'A', 'julian', 'Mac', 'forceer');
  insert into slot_uitkomst values ('21k', 'houder ' || (r ->> 'apparaat') || ', vorige ' || (r ->> 'vorige'));
  r := public.glas_bewerken(pid, 'B', 'bart', 'iPad', 'vraag');
  r := public.glas_bewerken(pid, 'C', 'kees', 'Windows-pc', 'intrekken');
  insert into slot_uitkomst values ('21m', '1 na C: seintje ' || coalesce(r ->> 'overname_naam', 'weg'));
  r := public.glas_bewerken(pid, 'B', 'bart', 'iPad', 'intrekken');
  insert into slot_uitkomst values ('21m', '2 na B: houder ' || (r ->> 'apparaat') || ', seintje ' || coalesce(r ->> 'overname_naam', 'weg'));
  r := public.glas_bewerken(pid, 'A', 'julian', 'Mac', 'vrijgeven');
  insert into slot_uitkomst select '21n', '0 vrij: houder ' || coalesce(apparaat, 'niemand') || ', stand ' || (p.data ->> '_rev')
    from public.bewerkslot s join public.projecten p on p.id = s.project_id where s.project_id = pid;
  begin
    update public.projecten set data = '{"rijen":[7],"_versieNr":106,"_apparaat":"C","_apparaatNaam":"kees","_basis":"2"}'::jsonb where id = pid;
    insert into slot_uitkomst values ('21n', '1 C basis 2: ok');
  exception when others then insert into slot_uitkomst values ('21n', '1 C basis 2: geweigerd: ' || left(sqlerrm, 52)); end;
  begin
    update public.projecten set data = '{"rijen":[8],"_versieNr":106,"_apparaat":"C","_apparaatNaam":"kees","_basis":"3"}'::jsonb where id = pid;
    insert into slot_uitkomst select '21n', '2 C basis 3: ok, houder ' || s.apparaat || ', stand ' || (p.data ->> '_rev')
      from public.bewerkslot s join public.projecten p on p.id = s.project_id where s.project_id = pid;
  exception when others then insert into slot_uitkomst values ('21n', '2 C basis 3: geweigerd: ' || sqlerrm); end;
  begin
    update public.projecten set data = '{"rijen":[9],"_versieNr":106,"_apparaat":"C","_apparaatNaam":"kees","_basis":"3"}'::jsonb where id = pid;
    insert into slot_uitkomst select '21o', 'C basis 3 (eigen opslag was 4): ok, stand ' || (data ->> '_rev') from public.projecten where id = pid;
  exception when others then insert into slot_uitkomst values ('21o', 'geweigerd: ' || sqlerrm); end;
  begin
    update public.projecten set data = '{"rijen":[10],"_versieNr":106,"_apparaat":"C","_apparaatNaam":"kees","_sessie":"tab2","_basis":"4"}'::jsonb where id = pid;
    insert into slot_uitkomst values ('21q', 'C tab2 basis 4: ok');
  exception when others then insert into slot_uitkomst values ('21q', 'C tab2 basis 4: geweigerd: ' || left(sqlerrm, 46)); end;
end $$;
-- 21p: een nieuw project, v106-apparaat D heeft het slot (nog niet opgeslagen)
insert into public.projecten (id, naam, status, data) values
  ('00000000-0000-4000-8000-0000000000c2', 'Overgang', 'aangemaakt',
   '{"info":{"status":"aangemaakt"},"rijen":[1],"_versieNr":105,"_rev":3}'::jsonb);
do $$
declare
  pid uuid := '00000000-0000-4000-8000-0000000000c2';
  r jsonb;
begin
  r := public.glas_bewerken(pid, 'D', 'julian', 'Mac', 'claim');
  begin
    update public.projecten set data = '{"rijen":[1,2],"_versieNr":105}'::jsonb where id = pid;
    insert into slot_uitkomst select '21p', '1 v105 slaat op: ok, stand ' || (data ->> '_rev') from public.projecten where id = pid;
  exception when others then insert into slot_uitkomst values ('21p', '1 v105: geweigerd: ' || sqlerrm); end;
  begin
    update public.projecten set data = '{"rijen":[9],"_versieNr":106,"_apparaat":"D","_apparaatNaam":"julian","_sessie":"s1","_basis":"3"}'::jsonb where id = pid;
    insert into slot_uitkomst values ('21p', '2 D (basis 3): ok');
  exception when others then insert into slot_uitkomst values ('21p', '2 D (basis 3): geweigerd: ' || left(sqlerrm, 50)); end;
  insert into slot_uitkomst select '21p', '3 eindstand ' || (data -> 'rijen')::text from public.projecten where id = pid;
end $$;
delete from public.projecten where id = '00000000-0000-4000-8000-0000000000c2';
-- 21r: een bestelling alsnog in het project (glas_bestellingen_erbij), terwijl
--      een ander apparaat (K) het bewerkt: de bestelling komt erin, de status
--      gaat naar besteld, het slot blijft van K, het volgnummer telt door.
--      Een tweede keer met een lijst zonder de eerste: die blijft (trigger 23).
insert into public.projecten (id, naam, status, data) values
  ('00000000-0000-4000-8000-0000000000c3', 'Erbij', 'bezig met inmeten/verwerken',
   '{"info":{"status":"bezig met inmeten/verwerken"},"rijen":[1],"_versieNr":106,"_rev":7,"_apparaat":"K","_sessie":"k1"}'::jsonb);
do $$
declare
  pid uuid := '00000000-0000-4000-8000-0000000000c3';
  r jsonb;
begin
  r := public.glas_bewerken(pid, 'K', 'kees', 'Windows-pc', 'claim');
  r := public.glas_bestellingen_erbij(pid,
    '[{"op":"2026-10-14T10:12:00Z","nr":1,"soort":"volledig","door":"bart","ruiten":{"1":"k1"}}]'::jsonb,
    '{"op":"2026-10-14T10:12:00Z","door":"bart","aantal":1,"ruiten":{"1":"k1"}}'::jsonb, 'besteld', null);
  insert into slot_uitkomst select '21r', '1 ' || jsonb_array_length(p.data #> '{info,bestellingen}') || ' bestelling, status ' ||
    p.status || ', houder ' || s.apparaat || ', stand ' || (p.data ->> '_rev')
    from public.projecten p join public.bewerkslot s on s.project_id = p.id where p.id = pid;
  r := public.glas_bestellingen_erbij(pid,
    '[{"op":"2026-10-14T11:00:00Z","nr":1,"soort":"aanvulling","door":"bart","ruiten":{}}]'::jsonb, null, 'besteld', null);
  insert into slot_uitkomst select '21r', '2 ' || jsonb_array_length(data #> '{info,bestellingen}') || ' bestellingen (de 1e bleef)'
    from public.projecten where id = pid;
  begin
    update public.projecten set data = '{"rijen":[2],"_versieNr":106,"_apparaat":"K","_sessie":"k1","_basis":"7"}'::jsonb where id = pid;
    insert into slot_uitkomst select '21r', '3 K slaat op (zonder de bestellingen): ok, ' ||
      jsonb_array_length(data #> '{info,bestellingen}') || ' bestellingen' from public.projecten where id = pid;
  exception when others then insert into slot_uitkomst values ('21r', '3 K: geweigerd: ' || sqlerrm); end;
end $$;
delete from public.projecten where id = '00000000-0000-4000-8000-0000000000c3';
-- 21s: hetzelfde, maar Kees nam het over en sloeg nog niets op (de laatste
--      opslag in het project is van Bart zelf): ook dan komt de bestelling erin.
insert into public.projecten (id, naam, status, data) values
  ('00000000-0000-4000-8000-0000000000c4', 'Erbij2', 'bezig met inmeten/verwerken',
   '{"info":{"status":"bezig met inmeten/verwerken"},"rijen":[1],"_versieNr":106,"_rev":3,"_apparaat":"B","_sessie":"b1"}'::jsonb);
do $$
declare
  pid uuid := '00000000-0000-4000-8000-0000000000c4';
  r jsonb;
begin
  r := public.glas_bewerken(pid, 'K', 'kees', 'Windows-pc', 'forceer');
  begin
    r := public.glas_bestellingen_erbij(pid,
      '[{"op":"2026-10-14T10:12:00Z","nr":1,"soort":"volledig","door":"bart","ruiten":{"1":"k1"}}]'::jsonb, null, 'besteld', null);
    insert into slot_uitkomst select '21s', '1 ok: ' || jsonb_array_length(data #> '{info,bestellingen}') || ' bestelling, status ' || status ||
      ', stand ' || (data ->> '_rev') from public.projecten where id = pid;
  exception when others then insert into slot_uitkomst values ('21s', '1 geweigerd: ' || left(sqlerrm, 50)); end;
  -- Kees (die stand 3 laadde) slaat daarna op, zonder de bestelling te kennen.
  begin
    update public.projecten set data = '{"rijen":[5],"_versieNr":106,"_apparaat":"K","_apparaatNaam":"kees","_sessie":"k1","_basis":"3"}'::jsonb where id = pid;
    insert into slot_uitkomst select '21s', '2 Kees slaat op: ok, ' || jsonb_array_length(data #> '{info,bestellingen}') || ' bestelling, status ' || status
      from public.projecten where id = pid;
  exception when others then insert into slot_uitkomst values ('21s', '2 Kees: geweigerd: ' || left(sqlerrm, 60)); end;
end $$;
delete from public.projecten where id = '00000000-0000-4000-8000-0000000000c4';
select stap as test, uitkomst from slot_uitkomst order by stap, uitkomst;
select '21 eindstand' as test, data->'rijen' as rijen, status
  from public.projecten where id = '00000000-0000-4000-8000-0000000000c1';
delete from public.projecten where id = '00000000-0000-4000-8000-0000000000c1';
select '21l. slot weg met het project' as test, count(*) as slotrijen
  from public.bewerkslot where project_id = '00000000-0000-4000-8000-0000000000c1';

-- ══════════════════════════════════════════════════════════════
-- 22. Script 25 (v109): "Figuurglas — Canale mat blank" alsnog in de lijst
--     Glasbewerking. Uitgangspunt: precies de lijst die script 12 zette (42).
--     Verwacht na 25: precies de lijst van de app (DATA.glasbewerking in
--     index.html, 43), ook na twee keer draaien; de rest van glas_data
--     ongemoeid. Hard getoetst: bij een afwijking stopt dit script met een fout.
-- ══════════════════════════════════════════════════════════════
update public.app_data
   set waarde = jsonb_set(waarde, '{glasbewerking}', $$["Helder (standaard)","Figuurglas — Byzanthijn fijn blank","Figuurglas — Byzanthijn grof blank","Figuurglas — Canale blank","Figuurglas — Carre blank 13 x 13","Figuurglas — Cathedraal groot gehamerd / Brute blank","Figuurglas — Cathedraal klein Duits blank","Figuurglas — Chinchilla blank","Figuurglas — Cotswold blank","Figuurglas — Crepi blank","Figuurglas — Deltha blank","Figuurglas — Gothic blank","Figuurglas — Guss antiek blank","Figuurglas — Ijsbloemglas","Figuurglas — Jan Hagel blank","Figuurglas — Master carre","Figuurglas — Master ligne","Figuurglas — Master point","Figuurglas — Moire blank","Figuurglas — Niagara blank","Figuurglas — Nylon blank","Figuurglas — Rochelino / Alt Deutch K blank","Figuurglas — Silvit blank","Draadglas — brute","Draadglas — Engels blank","Draadglas — spiegeldraadglas","Gematteerd — Satijnglas","Gematteerd — Satijnglas extra helder","Getint — Float brons","Getint — Float dark blue","Getint — Float grijs","Getint — Float groen","Extra helder — Kristal","Spiegel — Verzilverd blank","Spiegel — Verzilverd brons","Spiegel — Verzilverd grijs","Spiegel — Verzilverd Milano","Gekleurd — Starglass donkerblauw","Gekleurd — Starglass groen","Gekleurd — Starglass oranje","Gekleurd — Starglass rood","Overig (zie opmerking)"]$$::jsonb)
 where key = 'glas_data';
create temp table voor25 as select waarde - 'glasbewerking' as rest from public.app_data where key = 'glas_data';
\i 25_canale_mat.sql
\i 25_canale_mat.sql
do $$
declare w jsonb; rest jsonb;
begin
  select waarde into w from public.app_data where key = 'glas_data';
  select v.rest into rest from voor25 v;
  if w->'glasbewerking' <> $l$["Helder (standaard)","Figuurglas — Byzanthijn fijn blank","Figuurglas — Byzanthijn grof blank","Figuurglas — Canale blank","Figuurglas — Canale mat blank","Figuurglas — Carre blank 13 x 13","Figuurglas — Cathedraal groot gehamerd / Brute blank","Figuurglas — Cathedraal klein Duits blank","Figuurglas — Chinchilla blank","Figuurglas — Cotswold blank","Figuurglas — Crepi blank","Figuurglas — Deltha blank","Figuurglas — Gothic blank","Figuurglas — Guss antiek blank","Figuurglas — Ijsbloemglas","Figuurglas — Jan Hagel blank","Figuurglas — Master carre","Figuurglas — Master ligne","Figuurglas — Master point","Figuurglas — Moire blank","Figuurglas — Niagara blank","Figuurglas — Nylon blank","Figuurglas — Rochelino / Alt Deutch K blank","Figuurglas — Silvit blank","Draadglas — brute","Draadglas — Engels blank","Draadglas — spiegeldraadglas","Gematteerd — Satijnglas","Gematteerd — Satijnglas extra helder","Getint — Float brons","Getint — Float dark blue","Getint — Float grijs","Getint — Float groen","Extra helder — Kristal","Spiegel — Verzilverd blank","Spiegel — Verzilverd brons","Spiegel — Verzilverd grijs","Spiegel — Verzilverd Milano","Gekleurd — Starglass donkerblauw","Gekleurd — Starglass groen","Gekleurd — Starglass oranje","Gekleurd — Starglass rood","Overig (zie opmerking)"]$l$::jsonb then
    raise exception '22a FOUT: lijst na script 25 is niet gelijk aan die van de app: %', w->'glasbewerking';
  end if;
  if (w - 'glasbewerking') <> rest then
    raise exception '22b FOUT: script 25 veranderde iets anders dan glasbewerking';
  end if;
  raise notice '22a/b ok: 43 opties, gelijk aan de app; rest ongemoeid';
end $$;
-- 22c: staat Canale blank er (onverhoopt) niet in, dan komt Canale mat blank achteraan.
update public.app_data
   set waarde = jsonb_set(waarde, '{glasbewerking}', '["Helder (standaard)", "Overig (zie opmerking)"]'::jsonb)
 where key = 'glas_data';
\i 25_canale_mat.sql
do $$
begin
  if (select waarde->'glasbewerking' from public.app_data where key = 'glas_data')
     <> '["Helder (standaard)", "Overig (zie opmerking)", "Figuurglas — Canale mat blank"]'::jsonb then
    raise exception '22c FOUT: %', (select waarde->'glasbewerking' from public.app_data where key = 'glas_data');
  end if;
  raise notice '22c ok: zonder Canale blank achteraan';
end $$;
-- 22d: zonder glas_data-rij of zonder lijst: niets, en geen fout.
update public.app_data set waarde = waarde - 'glasbewerking' where key = 'glas_data';
\i 25_canale_mat.sql
do $$
begin
  if (select waarde ? 'glasbewerking' from public.app_data where key = 'glas_data') then
    raise exception '22d FOUT: script 25 maakte een lijst aan waar er geen was';
  end if;
  raise notice '22d ok: geen lijst, niets gedaan';
end $$;
