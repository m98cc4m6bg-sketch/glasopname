-- ═══════════════════════════════════════════════════════════════════
-- 30_rollen_en_beheer.sql — Glasopname v124 (26-10-2026)
--
-- Draaien in Supabase: SQL Editor → New query → dit hele bestand plakken
-- → Run. Hoort na script 26, 27, 28 (en 29). Nog een keer draaien kan
-- geen kwaad: wat al goed staat, blijft staan.
--
-- ▶ EERST: vul hieronder (stap 0) het e-mailadres in van de eerste
--   beheerder (jijzelf), op de plek van VUL-HIER-JE-EMAILADRES-IN.
--   Bij een tweede keer draaien hoeft dat niet meer.
--
-- Wat het doet, in gewone woorden (keuzes van Jan, 26-10-2026):
--  1. Elk account krijgt een rol:
--       beheerder  mag alles, en ziet in de app het tabblad Beheer
--                  (gebruikers, back-up, prullenbak legen, opslag);
--       collega    werkt zoals tot nu toe; de beheerder kan per persoon
--                  vier dingen uitzetten: bestellen, ontgrendelen, een
--                  nieuw project maken, een project weggooien;
--       werkvloer  kan alles bekijken, foto's toevoegen en zijn eigen
--                  taken afvinken; verder niets.
--     Wie er nu al is, wordt collega; het e-mailadres van stap 0 wordt
--     beheerder; een account dat je later in Supabase aanmaakt, begint
--     als werkvloer. Het back-upaccount blijft op "alleen lezen".
--  2. De database houdt dat zelf tegen (niet alleen de knoppen in de app).
--     ‹Apart bewaren› (werk dat niet in het project kon) mag altijd, ook
--     voor wie geen nieuw project mag maken: zo raakt er nooit werk kwijt.
--  3. Definitief verwijderen uit de prullenbak: alleen een beheerder. Het
--     automatisch opruimen na 30 dagen blijft lopen: dat mag ook een
--     collega (de klok van de server beslist).
--  4. Je eigen rol en rechten kun je niet zelf veranderen, en er blijft
--     altijd minstens één beheerder.
--  5. Een foto die de werkvloer toevoegt, gaat via een aparte functie het
--     project in, zonder het werk van wie het project bewerkt te
--     overschrijven (en zonder dat diens werk apart moet).
--  6. Beheer: wie is er (laatst ingelogd, laatst actief, app-versie, bezig
--     in welk project), en de opslag nakijken op foto's die nergens meer
--     bij horen.
--  7. Een foto in de opslag mag alleen weg als geen enkel project hem nog
--     noemt (ook een apart bewaarde kopie of een project in de prullenbak
--     niet), of door de beheerder. Daarvoor houdt de database per project
--     een lijst bij van de bestanden die het noemt (glas_foto_pad).
--  8. Ontgrendelen (zonder dat recht) houdt de database op elke manier
--     tegen, ook door de status terug te zetten; een apparaat dat een
--     bestelling nog niet kende, wordt daarbij niet geweigerd.
--  9. Foto's van de werkvloer: na elkaar van dezelfde persoon één regel in
--     het logboek; om en om van verschillende mensen hoogstens 20 nieuwe
--     regels per uur (de rest wacht op het apparaat en gaat er later in).
--
-- Het hele script is één geheel (begin … commit): stopt het ergens, dan is
-- er niets veranderd. Zegt de editor daarna "current transaction is
-- aborted": eerst alleen  rollback;  draaien, dan opnieuw.
--
-- Terugdraaien: 30_terug.sql (zip "niet-in-repo" en de projectkennis).
-- Er gaan dan geen gegevens verloren; de kolommen blijven staan.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ─── 0. Het e-mailadres van de eerste beheerder ───────────────────
create temporary table glas30_instelling on commit drop as
select lower(trim('VUL-HIER-JE-EMAILADRES-IN')) as beheerder_email;

-- ─── Veiligheidsstop ──────────────────────────────────────────────
do $$
declare
  em text := (select beheerder_email from glas30_instelling);
  heeft_rol boolean := exists (select 1 from information_schema.columns
                                where table_schema = 'public' and table_name = 'gebruikers' and column_name = 'rol');
  al_beheerder boolean := false;
begin
  if to_regprocedure('public.is_lid()') is null
     or to_regprocedure('public.mag_schrijven()') is null
     or to_regprocedure('public.glas_ids_fout(jsonb)') is null then
    raise exception 'Script gestopt; er is niets veranderd. Draai eerst script 26, 27 en 28.';
  end if;
  if heeft_rol then
    execute 'select exists (select 1 from public.gebruikers where rol = ''beheerder'' and actief and not alleen_lezen)'
      into al_beheerder;
  end if;
  if not al_beheerder then
    if em = '' or em like 'vul-hier%' then
      raise exception 'Script gestopt; er is niets veranderd. Vul bovenaan (stap 0) het e-mailadres van de eerste beheerder in.';
    end if;
    if not exists (select 1 from public.gebruikers g where lower(g.email) = em and g.actief and not g.alleen_lezen) then
      raise exception 'Script gestopt; er is niets veranderd. Er is geen actief account met het e-mailadres %. Kijk het adres na (Authentication → Users).', em;
    end if;
  end if;
end $$;

-- ─── 1. Rollen en rechten in gebruikers ───────────────────────────
-- Iedereen uit auth.users heeft een regel (zoals in script 26), vóórdat
-- de standaard "werkvloer" wordt: wie er nu al is, is een collega.
insert into public.gebruikers (id, naam, email)
select u.id, split_part(coalesce(u.email, ''), '@', 1), coalesce(u.email, '')
from auth.users u
where coalesce(u.is_anonymous, false) = false
on conflict (id) do nothing;

alter table public.gebruikers add column if not exists rol text;
update public.gebruikers set rol = 'collega' where rol is null;
alter table public.gebruikers alter column rol set default 'werkvloer';
alter table public.gebruikers alter column rol set not null;
alter table public.gebruikers drop constraint if exists gebruikers_rol_geldig;
alter table public.gebruikers add constraint gebruikers_rol_geldig
  check (rol in ('beheerder', 'collega', 'werkvloer'));

alter table public.gebruikers add column if not exists mag_bestellen boolean not null default true;
alter table public.gebruikers add column if not exists mag_ontgrendelen boolean not null default true;
alter table public.gebruikers add column if not exists mag_nieuw boolean not null default true;
alter table public.gebruikers add column if not exists mag_weggooien boolean not null default true;
-- Wie is er (voor het tabblad Beheer); de app zet dit zelf (glas_aanwezig).
alter table public.gebruikers add column if not exists gezien_op timestamptz;
alter table public.gebruikers add column if not exists app_versie text;
alter table public.gebruikers add column if not exists apparaat text;

update public.gebruikers set rol = 'beheerder'
 where lower(email) = (select beheerder_email from glas30_instelling)
   and actief and not alleen_lezen;

-- Wie heeft een project open (voor "bezig in" op Beheer).
alter table public.bewerkslot add column if not exists wie uuid;

-- ─── 2. Wie mag wat ───────────────────────────────────────────────
-- De rol van wie nu ingelogd is (null: geen collega, of uitgezet).
create or replace function public.glas_rol()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then null
    else (select g.rol from public.gebruikers g where g.id = (select auth.uid()) and g.actief) end;
$$;

create or replace function public.is_beheerder()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select g.rol = 'beheerder' and not g.alleen_lezen
                     from public.gebruikers g
                    where g.id = (select auth.uid()) and g.actief), false)
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- Mag wie nu ingelogd is dit? (bestellen, ontgrendelen, nieuw, weggooien)
create or replace function public.glas_mag(p_recht text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
             when g.rol = 'beheerder' then true
             when g.rol = 'collega' then case p_recht
               when 'bestellen' then g.mag_bestellen
               when 'ontgrendelen' then g.mag_ontgrendelen
               when 'nieuw' then g.mag_nieuw
               when 'weggooien' then g.mag_weggooien
               else false end
             else false end
      from public.gebruikers g
     where g.id = (select auth.uid()) and g.actief and not g.alleen_lezen), false)
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

revoke all on function public.glas_rol() from public, anon;
revoke all on function public.is_beheerder() from public, anon;
revoke all on function public.glas_mag(text) from public, anon;
grant execute on function public.glas_rol() to authenticated;
grant execute on function public.is_beheerder() to authenticated;
grant execute on function public.glas_mag(text) to authenticated;

-- ─── 3. De controle op projecten ──────────────────────────────────
-- De naam begint met "0": triggers lopen op alfabet; deze gaat vóór de
-- rest, zodat je de duidelijke melding krijgt (en niets anders gebeurt).
-- Geen ingelogde gebruiker (SQL Editor, de mailfunctie, de database zelf):
-- dan geen controle.
create or replace function public.rechten_bewaken()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  r text;
  oud_b jsonb;
  nieuw_b jsonb;
  vrij text[] := array['open_taken', 'updated_at', 'gewijzigd_door', 'gewijzigd_naam'];
begin
  -- Het merkje _erbijVan (zie §8) zet alleen de database; nooit bij het
  -- aanmaken meegeven (anders een vrijbrief voor een oude stand).
  if tg_op = 'INSERT' and jsonb_typeof(new.data) = 'object' then new.data := new.data - '_erbijVan'; end if;
  if uid is null then return new; end if;
  -- Een foto van de werkvloer (glas_foto_erbij, hieronder) controleert zelf.
  if current_setting('glas.foto_erbij', true) = '1' then return new; end if;
  r := public.glas_rol();
  if r is null or r = 'beheerder' then return new; end if;

  if tg_op = 'INSERT' then
    -- ‹Apart bewaren›: werk dat niet in het project kon. Mag altijd.
    if coalesce(new.data ->> '_apart', '') = 'true' then return new; end if;
    if not public.glas_mag('nieuw') then
      raise exception 'Geen recht: je account mag geen nieuwe projecten maken. Vraag de beheerder.'
        using errcode = 'P0001';
    end if;
    return new;
  end if;

  if r = 'werkvloer' then
    -- Alleen kijken. Het aantal open taken mag alleen veranderen naar wat
    -- de database zelf telt (tel_open_taken, als hij een taak afvinkt).
    if (to_jsonb(new) - vrij) is distinct from (to_jsonb(old) - vrij)
       or (new.open_taken is distinct from old.open_taken
           and new.open_taken is distinct from (select count(*)::int from public.taken t
                                                 where t.project_id = new.id and t.klaar = false)) then
      raise exception 'Geen recht: je account staat op werkvloer (kijken, foto''s toevoegen en je eigen taken afvinken). Je werk blijft op dit apparaat staan.'
        using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- collega
  if old.verwijderd_op is null and new.verwijderd_op is not null and not public.glas_mag('weggooien') then
    raise exception 'Geen recht: je account mag geen projecten weggooien. Vraag de beheerder.'
      using errcode = 'P0001';
  end if;
  -- Bestellen: een nieuwe bestelling, een intrekking (zoals script 23/27 het
  -- telt: de sleutel "ingetrokken" bestaat, ook met null), of de inhoud van een
  -- bestaande bestelling (zelfde tijdstip) veranderen. Het nummer telt niet
  -- (dat zet het samenvoegen van script 23 zelf). Een apparaat dat een
  -- bestelling niet kent, stuurt hem gewoon niet mee: dat is geen wijziging.
  -- Ontgrendelen: de trigger projecten_bestellingen_zz_ontgrendelen
  -- (hieronder, ná het samenvoegen).
  if new.data is distinct from old.data and not public.glas_mag('bestellen') then
    oud_b := case when jsonb_typeof(old.data #> '{info,bestellingen}') = 'array'
                  then old.data #> '{info,bestellingen}' else '[]'::jsonb end;
    nieuw_b := case when jsonb_typeof(new.data #> '{info,bestellingen}') = 'array'
                    then new.data #> '{info,bestellingen}' else '[]'::jsonb end;
    if exists (select 1 from jsonb_array_elements(nieuw_b) n
                where not exists (select 1 from jsonb_array_elements(oud_b) o where o ->> 'op' = n ->> 'op'))
       or exists (select 1 from jsonb_array_elements(nieuw_b) n
                    join jsonb_array_elements(oud_b) o on o ->> 'op' = n ->> 'op'
                   where (jsonb_typeof(n) = 'object' and jsonb_typeof(o) = 'object'
                          and (n - 'nr' - 'ingetrokken') is distinct from (o - 'nr' - 'ingetrokken'))
                      or (jsonb_typeof(n) is distinct from jsonb_typeof(o))
                      or (n -> 'ingetrokken' is not null and o -> 'ingetrokken' is null)) then
      raise exception 'Geen recht: je account mag geen bestelling vastleggen of intrekken. Vraag de beheerder.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists projecten_0_rechten on public.projecten;
create trigger projecten_0_rechten
  before insert or update on public.projecten
  for each row execute function public.rechten_bewaken();

-- Ontgrendelen. Zoals de app het ziet: op slot = status besteld of verder
-- (glas_status_rang >= 2) en slot.open niet "waar" in JavaScript (1, "ja",
-- een object… tellen als waar). Een collega zonder dat recht mag een project
-- op slot niet van het slot halen: niet met slot.open, en ook niet door de
-- status terug te zetten. Deze controle draait ná het samenvoegen van
-- script 23 (de naam begint met "projecten_bestellingen_zz"): een apparaat
-- dat de bestelling nog niet kende, stuurt een oude status zonder slot mee;
-- het samenvoegen zet die eerst terug, en dan is er niets ontgrendeld.
-- Een bestelling intrekken (recht bestellen) mag het project wel openen.
create or replace function public.glas_js_waar(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case jsonb_typeof(v)
           when 'boolean' then v = 'true'::jsonb
           when 'number' then (v #>> '{}')::numeric <> 0
           when 'string' then (v #>> '{}') <> ''
           when 'object' then true
           when 'array' then true
           else false end;
$$;
create or replace function public.glas_op_slot(d jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.glas_status_rang(d #>> '{info,status}') >= 2
     and not public.glas_js_waar(d #> '{info,slot,open}');
$$;
create or replace function public.ontgrendelen_bewaken()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ingetrokken_nu boolean;
begin
  if (select auth.uid()) is null then return new; end if;
  if current_setting('glas.foto_erbij', true) = '1' then return new; end if;
  if public.glas_rol() is distinct from 'collega' then return new; end if;
  if not public.glas_op_slot(old.data) or public.glas_op_slot(new.data) or public.glas_mag('ontgrendelen') then
    return new;
  end if;
  select exists (
    select 1 from jsonb_array_elements(case when jsonb_typeof(new.data #> '{info,bestellingen}') = 'array'
                                            then new.data #> '{info,bestellingen}' else '[]' end) n
      join jsonb_array_elements(case when jsonb_typeof(old.data #> '{info,bestellingen}') = 'array'
                                     then old.data #> '{info,bestellingen}' else '[]' end) o on o ->> 'op' = n ->> 'op'
     where n -> 'ingetrokken' is not null and o -> 'ingetrokken' is null)
    into ingetrokken_nu;
  if ingetrokken_nu and public.glas_mag('bestellen') then return new; end if;
  raise exception 'Geen recht: je account mag een besteld project niet ontgrendelen. Vraag de beheerder.'
    using errcode = 'P0001';
end;
$$;
drop trigger if exists projecten_bestellingen_zz_ontgrendelen on public.projecten;
create trigger projecten_bestellingen_zz_ontgrendelen
  before update of data on public.projecten
  for each row execute function public.ontgrendelen_bewaken();

-- ─── 4. Definitief verwijderen ────────────────────────────────────
-- Alleen uit de prullenbak (script 26), en dan: een beheerder, of een
-- collega als het project al 30 dagen in de prullenbak staat (het
-- automatisch opruimen; prullenbak_opruimbaar telt op dezelfde manier).
drop policy if exists projecten_delete on public.projecten;
create policy projecten_delete on public.projecten
  for delete to authenticated
  using ((select public.is_lid()) and verwijderd_op is not null
         and ((select public.is_beheerder())
              or ((select public.glas_rol()) = 'collega' and verwijderd_op < now() - interval '30 days')));

-- ─── 5. Taken: de werkvloer vinkt alleen zijn eigen taken af ──────
create or replace function public.taken_rechten()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  vrij text[] := array['klaar', 'afgerond_op', 'afgerond_door', 'updated_at'];
begin
  if uid is null then return coalesce(new, old); end if;
  -- Wie en wanneer afvinkte, zet de database (voor iedereen; de app stuurt
  -- het ook mee, maar dat telt niet).
  if tg_op = 'UPDATE' then
    if new.klaar is distinct from old.klaar then
      new.afgerond_door := case when new.klaar then uid end;
      new.afgerond_op := case when new.klaar then now() end;
    else
      new.afgerond_door := old.afgerond_door;
      new.afgerond_op := old.afgerond_op;
    end if;
  end if;
  if public.glas_rol() is distinct from 'werkvloer' then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Geen recht: je account staat op werkvloer; taken toevoegen kan niet.' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    -- Het project zelf gaat weg (opruimen): dan gaan de taken mee.
    if not exists (select 1 from public.projecten p where p.id = old.project_id) then return old; end if;
    raise exception 'Geen recht: je account staat op werkvloer; taken verwijderen kan niet.' using errcode = 'P0001';
  end if;
  if old.eigenaar is distinct from uid then
    raise exception 'Geen recht: je account staat op werkvloer; je kunt alleen je eigen taken afvinken.' using errcode = 'P0001';
  end if;
  if (to_jsonb(new) - vrij) is distinct from (to_jsonb(old) - vrij) then
    raise exception 'Geen recht: je account staat op werkvloer; je kunt een taak alleen afvinken.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists taken_0_rechten on public.taken;
create trigger taken_0_rechten
  before insert or update or delete on public.taken
  for each row execute function public.taken_rechten();

-- ─── 6. Werkvloer: niets aan mailadressen, het bewerkslot en het
--        weghalen van foto's (bovenop de bestaande regels) ───────────
do $$
declare
  t text;
begin
  foreach t in array array['mailadressen', 'bewerkslot']
  loop
    execute format('drop policy if exists werkvloer_toevoegen on public.%I', t);
    execute format('drop policy if exists werkvloer_wijzigen on public.%I', t);
    execute format('drop policy if exists werkvloer_weggooien on public.%I', t);
    execute format('create policy werkvloer_toevoegen on public.%I as restrictive for insert to authenticated with check ((select public.glas_rol()) is distinct from ''werkvloer'')', t);
    execute format('create policy werkvloer_wijzigen on public.%I as restrictive for update to authenticated using ((select public.glas_rol()) is distinct from ''werkvloer'') with check ((select public.glas_rol()) is distinct from ''werkvloer'')', t);
    execute format('create policy werkvloer_weggooien on public.%I as restrictive for delete to authenticated using ((select public.glas_rol()) is distinct from ''werkvloer'')', t);
  end loop;
end $$;
drop policy if exists projectfotos_werkvloer_weggooien on storage.objects;
create policy projectfotos_werkvloer_weggooien on storage.objects as restrictive
  for delete to authenticated
  using (bucket_id <> 'projectfotos' or (select public.glas_rol()) is distinct from 'werkvloer');

-- ─── 6b. Welke bestanden noemt een project? ───────────────────────
-- Een apart bewaarde kopie van een project noemt de foto's van het
-- origineel (zelfde pad, in de map van het origineel); "Onlangs verwijderd"
-- noemt foto's die terug kunnen. Zo'n foto mag nooit weg zolang een project
-- hem noemt, ook niet als de map van het origineel "zonder project" lijkt.
-- Per project de lijst van de paden in zijn gegevens (elke tekst die begint
-- met een projectcode en een /), bijgehouden bij elke opslag. Alleen de
-- database leest en schrijft hem.
create table if not exists public.glas_foto_pad (
  project_id uuid not null references public.projecten(id) on delete cascade,
  pad text not null,
  primary key (project_id, pad)
);
create index if not exists glas_foto_pad_pad on public.glas_foto_pad (pad);
alter table public.glas_foto_pad enable row level security;
revoke all on public.glas_foto_pad from anon, authenticated;

create or replace function public.glas_paden_van(d jsonb)
returns setof text
language sql
immutable
set search_path = ''
as $$
  select distinct v #>> '{}'
    from jsonb_path_query(coalesce(d, '{}'::jsonb),
           'lax $.** ? (@.type() == "string" && @ like_regex "^[0-9a-fA-F-]{36}/")') v;
$$;

create or replace function public.glas_paden_bijhouden()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.data is not distinct from old.data then return null; end if;
  delete from public.glas_foto_pad g where g.project_id = new.id;
  insert into public.glas_foto_pad (project_id, pad)
  select new.id, x from public.glas_paden_van(new.data) x
  on conflict do nothing;
  return null;
end;
$$;
drop trigger if exists projecten_paden on public.projecten;
create trigger projecten_paden
  after insert or update of data on public.projecten
  for each row execute function public.glas_paden_bijhouden();

-- De lijst één keer vullen voor wat er al is.
insert into public.glas_foto_pad (project_id, pad)
select p.id, x from public.projecten p, lateral public.glas_paden_van(p.data) x
on conflict do nothing;

-- Noemt een project dit pad nog? (voor de regel op de opslag)
create or replace function public.glas_pad_in_gebruik(p_pad text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.glas_foto_pad g where g.pad = p_pad);
$$;
revoke all on function public.glas_pad_in_gebruik(text) from public, anon;
grant execute on function public.glas_pad_in_gebruik(text) to authenticated;

-- Welke van deze paden noemt een project nog? Voor de app: vóór het
-- opruimen van foto's (definitief verwijderen, de prullenbak, de wachtrij).
create or replace function public.glas_foto_nog_nodig(paden text[])
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_lid() then
    coalesce((select array_agg(distinct g.pad) from public.glas_foto_pad g where g.pad = any(paden)), '{}'::text[])
  end;
$$;
revoke all on function public.glas_foto_nog_nodig(text[]) from public, anon;
grant execute on function public.glas_foto_nog_nodig(text[]) to authenticated;

-- Een foto weghalen uit de opslag: de beheerder, of als geen enkel project
-- hem nog noemt (bovenop de bestaande regels).
drop policy if exists projectfotos_definitief on storage.objects;
create policy projectfotos_definitief on storage.objects as restrictive
  for delete to authenticated
  using (bucket_id <> 'projectfotos'
         or (select public.is_beheerder())
         or not public.glas_pad_in_gebruik(name));

-- ─── 7. Het bewerkslot (script 24) met twee aanvullingen ──────────
-- a. De werkvloer neemt nooit een project (hij kijkt alleen): elke vraag
--    geeft alleen de stand terug.
-- b. Wie het project neemt, wordt onthouden (wie), voor Beheer.
create or replace function public.glas_bewerken(
  p_project uuid, p_apparaat text, p_naam text, p_omschrijving text, p_actie text)
returns jsonb
language plpgsql
as $$
declare
  r public.bewerkslot%rowtype;
  vorige text;
begin
  if p_apparaat is null or p_apparaat = '' then
    raise exception 'glas_bewerken: geen apparaat';
  end if;
  -- v124 (script 30): de werkvloer alleen de stand.
  if public.glas_rol() = 'werkvloer' then
    select * into r from public.bewerkslot where project_id = p_project;
    return jsonb_build_object(
      'apparaat', r.apparaat, 'naam', r.naam, 'omschrijving', r.omschrijving,
      'sinds', r.sinds, 'gezien', r.gezien,
      'overname_apparaat', r.overname_apparaat, 'overname_naam', r.overname_naam, 'overname_op', r.overname_op,
      'vorige', r.naam, 'nu', now());
  end if;
  insert into public.bewerkslot (project_id) values (p_project) on conflict (project_id) do nothing;
  select * into r from public.bewerkslot where project_id = p_project for update;
  vorige := r.naam;

  if p_actie = 'claim' or p_actie = 'vraag' then
    if r.apparaat is null or r.apparaat = p_apparaat then
      update public.bewerkslot
         set apparaat = p_apparaat, naam = p_naam, omschrijving = p_omschrijving,
             sinds = case when r.apparaat = p_apparaat then r.sinds else now() end,
             gezien = now(),
             wie = (select auth.uid()),
             overname_apparaat = case when r.overname_apparaat = p_apparaat then null else r.overname_apparaat end,
             overname_naam = case when r.overname_apparaat = p_apparaat then null else r.overname_naam end,
             overname_op = case when r.overname_apparaat = p_apparaat then null else r.overname_op end
       where project_id = p_project;
    elsif p_actie = 'vraag' then
      update public.bewerkslot
         set overname_apparaat = p_apparaat, overname_naam = p_naam, overname_op = now()
       where project_id = p_project;
    end if;
  elsif p_actie = 'hartslag' then
    update public.bewerkslot set gezien = now()
     where project_id = p_project and apparaat = p_apparaat;
  elsif p_actie = 'forceer' then
    update public.bewerkslot
       set apparaat = p_apparaat, naam = p_naam, omschrijving = p_omschrijving,
           sinds = now(), gezien = now(), wie = (select auth.uid()),
           overname_apparaat = null, overname_naam = null, overname_op = null
     where project_id = p_project;
  elsif p_actie = 'vrijgeven' then
    update public.bewerkslot
       set apparaat = null, naam = null, omschrijving = null, sinds = null, gezien = null, wie = null
     where project_id = p_project and apparaat = p_apparaat;
  elsif p_actie = 'intrekken' then
    update public.bewerkslot
       set overname_apparaat = null, overname_naam = null, overname_op = null
     where project_id = p_project and overname_apparaat = p_apparaat;
  elsif p_actie <> 'stand' then
    raise exception 'glas_bewerken: onbekende actie %', p_actie;
  end if;

  select * into r from public.bewerkslot where project_id = p_project;
  return jsonb_build_object(
    'apparaat', r.apparaat, 'naam', r.naam, 'omschrijving', r.omschrijving,
    'sinds', r.sinds, 'gezien', r.gezien,
    'overname_apparaat', r.overname_apparaat, 'overname_naam', r.overname_naam, 'overname_op', r.overname_op,
    'vorige', vorige, 'nu', now());
end;
$$;

-- De bewaking van script 24, met:
-- c. een foto van de werkvloer (glas_foto_erbij) mag altijd; het
--    volgnummer gaat wel omhoog;
-- d. werk dat voortbouwt op een stand van vóór zo'n foto, terwijl er
--    sindsdien alleen foto's van de werkvloer bijkwamen (data._erbijVan),
--    wordt niet geweigerd: de foto's zet de trigger hierna terug.
create or replace function public.bewerkslot_bewaken()
returns trigger
language plpgsql
as $$
declare
  van text := new.data ->> '_apparaat';
  versie int := case when coalesce(new.data ->> '_versieNr', '') ~ '^[0-9]+$'
                     then (new.data ->> '_versieNr')::int else 0 end;
  rev_oud int := case when coalesce(old.data ->> '_rev', '') ~ '^[0-9]+$'
                      then (old.data ->> '_rev')::int end;
  basis text := new.data ->> '_basis';
  schrijver text := coalesce(old.data ->> '_apparaat', '') || '/' || coalesce(old.data ->> '_sessie', '');
  ik text := coalesce(new.data ->> '_apparaat', '') || '/' || coalesce(new.data ->> '_sessie', '');
  erbij_van text := coalesce(old.data ->> '_erbijVan', '');
  houder text;
  houder_naam text;
begin
  if new.data is not distinct from old.data then
    return new;
  end if;
  new.data := jsonb_set(new.data, '{_rev}', to_jsonb(coalesce(rev_oud, 0) + 1));
  if current_setting('glas.bestellingen_erbij', true) = '1' then
    new.data := jsonb_set(new.data, '{_rev}', coalesce(old.data -> '_rev', 'null'::jsonb));
    if new.data -> '_rev' = 'null'::jsonb then new.data := new.data #- '{_rev}'; end if;
    return new;
  end if;
  -- v124 (script 30): een foto van de werkvloer.
  if current_setting('glas.foto_erbij', true) = '1' then
    return new;
  end if;
  if versie < 106 or van is null or van = '' then
    return new;
  end if;
  select apparaat, naam into houder, houder_naam from public.bewerkslot where project_id = new.id for update;
  if houder is not null and houder <> van then
    raise exception 'Bewerkslot: % bewerkt dit project nu. Je werk blijft op dit apparaat en wordt apart bewaard.',
      coalesce(houder_naam, 'een collega')
      using errcode = 'P0001', detail = format('houder %s, dit apparaat %s', houder, van);
  end if;
  if rev_oud is not null and schrijver <> ik
     and (basis is null or basis !~ '^[0-9]+$' or basis::int <> rev_oud)
     and not (erbij_van ~ '^[0-9]{1,9}$' and coalesce(basis, '') ~ '^[0-9]{1,9}$'
              and basis::int >= erbij_van::int and basis::int <= rev_oud) then
    raise exception 'Bewerkslot: % heeft dit project intussen gewijzigd. Je werk blijft op dit apparaat en wordt apart bewaard.',
      coalesce(old.data ->> '_apparaatNaam', 'een collega')
      using errcode = 'P0001', detail = format('stand %s, dit werk bouwt voort op %s', rev_oud, coalesce(basis, '?'));
  end if;
  if houder is null then
    insert into public.bewerkslot (project_id, apparaat, naam, omschrijving, sinds, gezien, wie)
    values (new.id, van, new.data ->> '_apparaatNaam', new.data ->> '_apparaatSoort', now(), now(), (select auth.uid()))
    on conflict (project_id) do update
      set apparaat = excluded.apparaat, naam = excluded.naam, omschrijving = excluded.omschrijving,
          sinds = now(), gezien = now(), wie = excluded.wie;
    return new;
  end if;
  update public.bewerkslot set gezien = now() where project_id = new.id;
  return new;
end;
$$;

-- ─── 8. Foto's van de werkvloer ───────────────────────────────────
-- De werkvloer bewerkt het project niet (hij heeft het bewerkslot niet).
-- Een foto gaat daarom via deze functie het project in: alleen die foto
-- komt erbij, de rest blijft precies zoals het staat. De foto krijgt een
-- merkje (_erbij: wie, wanneer, op welk volgnummer).
create or replace function public.glas_foto_erbij(p_project uuid, p_foto jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d jsonb;
  verw timestamptz;
  rev int;
  fotos jsonb;
  fid text := p_foto ->> 'id';
  pad text := p_foto ->> 'pad';
  nieuw jsonb;
  o jsonb;
  bestaand jsonb;
  idx int;
  wie text;
  begin_pad text := p_project::text || '/';
  alleen_origineel boolean := false;
  vorige record;
  vervolg boolean := false;
  aantal int;
  tekst text;
begin
  if not public.is_lid() or not public.mag_schrijven() then
    raise exception 'Geen recht: je kunt geen foto''s toevoegen.' using errcode = 'P0001';
  end if;
  if p_foto is null or jsonb_typeof(p_foto) <> 'object'
     or coalesce(fid, '') !~ '^[A-Za-z0-9_-]{1,64}$'
     or coalesce(pad, '') = '' or left(pad, length(begin_pad)) <> begin_pad
     or substr(pad, length(begin_pad) + 1) !~ '^[A-Za-z0-9._-]{1,120}$' or pad ~ '\.\.' then
    raise exception 'Foto onleesbaar.' using errcode = 'P0001';
  end if;
  nieuw := jsonb_build_object('id', fid, 'pad', pad, 'titel', left(coalesce(p_foto ->> 'titel', ''), 200),
                              'bron', 'foto', 'markeringen', '[]'::jsonb);
  if jsonb_typeof(p_foto -> 'breedte') = 'number' and (p_foto ->> 'breedte')::numeric between 1 and 100000 then
    nieuw := nieuw || jsonb_build_object('breedte', p_foto -> 'breedte');
  end if;
  if jsonb_typeof(p_foto -> 'hoogte') = 'number' and (p_foto ->> 'hoogte')::numeric between 1 and 100000 then
    nieuw := nieuw || jsonb_build_object('hoogte', p_foto -> 'hoogte');
  end if;
  o := p_foto -> 'origineel';
  if jsonb_typeof(o) = 'object' and left(coalesce(o ->> 'pad', ''), length(begin_pad || 'origineel/')) = begin_pad || 'origineel/'
     and substr(o ->> 'pad', length(begin_pad || 'origineel/') + 1) ~ '^[A-Za-z0-9._-]{1,120}$' and (o ->> 'pad') !~ '\.\.' then
    nieuw := nieuw || jsonb_build_object('origineel', jsonb_strip_nulls(jsonb_build_object(
      'pad', o ->> 'pad', 'naam', left(coalesce(o ->> 'naam', ''), 200), 'type', left(coalesce(o ->> 'type', ''), 100),
      'grootte', case when jsonb_typeof(o -> 'grootte') = 'number' then o -> 'grootte' end,
      'datum', left(coalesce(o ->> 'datum', ''), 40))));
  end if;

  select p.data, p.verwijderd_op into d, verw from public.projecten p where p.id = p_project for update;
  if not found then
    raise exception 'Dit project bestaat niet meer.' using errcode = 'P0001';
  end if;
  if verw is not null then
    raise exception 'Dit project staat in de prullenbak.' using errcode = 'P0001';
  end if;
  d := coalesce(d, '{}'::jsonb);
  fotos := case when jsonb_typeof(d -> 'fotos') = 'array' then d -> 'fotos' else '[]'::jsonb end;
  rev := case when coalesce(d ->> '_rev', '') ~ '^[0-9]{1,9}$' then (d ->> '_rev')::int else 0 end;
  select t.i - 1, t.x into idx, bestaand from jsonb_array_elements(fotos) with ordinality t(x, i)
   where t.x ->> 'id' = fid limit 1;
  if bestaand is not null then
    -- Al binnen (een tweede poging, of nu met het origineel erbij).
    if jsonb_typeof(bestaand -> '_erbij') = 'object' and bestaand ->> 'pad' = pad
       and not (bestaand ? 'origineel') and nieuw ? 'origineel' then
      fotos := jsonb_set(fotos, array[idx::text],
        bestaand || jsonb_build_object('origineel', nieuw -> 'origineel',
                                       '_erbij', (bestaand -> '_erbij') || jsonb_build_object('rev', rev + 1)));
      alleen_origineel := true;
    else
      return jsonb_build_object('ok', true, 'al', true, 'rev', rev);
    end if;
  else
    if jsonb_array_length(fotos) >= 500 then
      raise exception 'Dit project heeft al 500 foto''s.' using errcode = 'P0001';
    end if;
    select coalesce(nullif(g.naam, ''), split_part(g.email, '@', 1), '') into wie
      from public.gebruikers g where g.id = (select auth.uid());
    fotos := fotos || jsonb_build_array(nieuw || jsonb_build_object('_erbij',
      jsonb_build_object('door', coalesce(wie, ''), 'op', now(), 'rev', rev + 1)));
  end if;
  d := jsonb_set(d, '{fotos}', fotos, true);
  if coalesce(d ->> '_erbijVan', '') !~ '^[0-9]{1,9}$' then
    d := jsonb_set(d, '{_erbijVan}', to_jsonb(rev), true);
  end if;
  -- Het logboek bewaart 200 regels per project; foto's mogen het niet
  -- laten doorspoelen. Foto's na elkaar van dezelfde persoon (binnen een
  -- half uur) zijn één regel die meetelt ("12 foto's toegevoegd"; de
  -- database werkt dan de laatste regel bij, spoor_vervolg van script 14).
  -- Komen er om en om foto's van verschillende mensen, dan hoogstens 20
  -- nieuwe foto-regels per project per uur; wat daarboven komt, wacht op
  -- het apparaat en gaat er later alsnog in (de app probeert het opnieuw).
  select h.samenvatting, h.wie, h.moment into vorige
    from public.projectgeschiedenis h
   where h.project_id = p_project
   order by h.moment desc, h.id desc
   limit 1;
  if found and coalesce(vorige.samenvatting, '') ~ '^([0-9]{1,4} foto''s|foto) toegevoegd'
     and vorige.wie is not distinct from (select auth.uid())
     and now() - vorige.moment < interval '30 minutes' then
    vervolg := true;
  end if;
  if not vervolg and (select count(*) from public.projectgeschiedenis h
                       where h.project_id = p_project
                         and h.samenvatting ~ '^([0-9]{1,4} foto''s|foto) toegevoegd'
                         and h.moment > now() - interval '1 hour') >= 20 then
    raise exception 'Veel foto''s in korte tijd; deze gaat er straks alsnog in.' using errcode = 'P0001';
  end if;
  if alleen_origineel then
    tekst := case when vervolg then vorige.samenvatting else 'foto toegevoegd (origineel)' end;
  else
    aantal := case when not vervolg then 1
                   when vorige.samenvatting ~ '^[0-9]' then substring(vorige.samenvatting from '^([0-9]+)')::int + 1
                   else 2 end;
    tekst := case when aantal = 1 then 'foto toegevoegd' else aantal || ' foto''s toegevoegd' end;
  end if;
  perform set_config('glas.foto_erbij', '1', true);
  update public.projecten
     set data = d, samenvatting = tekst, spoor_vervolg = vervolg
   where id = p_project;
  perform set_config('glas.foto_erbij', '', true);
  return jsonb_build_object('ok', true, 'al', false, 'rev', rev + 1);
end;
$$;
revoke all on function public.glas_foto_erbij(uuid, jsonb) from public, anon;
grant execute on function public.glas_foto_erbij(uuid, jsonb) to authenticated;

-- Een apparaat dat de foto van de werkvloer nog niet kende (het bouwt voort
-- op een oudere stand), wist hem niet bij zijn volgende opslag: de foto
-- komt terug. Wie hem wel kende en weghaalt, haalt hem echt weg.
-- Komt hij terug, dan telt hij als nieuw ná deze opslag (het volgnummer van
-- de foto gaat mee omhoog): dat apparaat heeft hem dan nog steeds niet, en
-- zijn volgende opslag mag hem dus ook niet wissen. Pas als het apparaat de
-- foto zelf meestuurt (de app neemt hem over zodra de opslag terugkaatst),
-- kan het hem bewust weghalen.
create or replace function public.fotos_erbij_houden()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  b text := new.data ->> '_basis';
  bn int := case when coalesce(b, '') ~ '^[0-9]{1,9}$' then b::int end;
  nf jsonb;
  f jsonb;
  frev int;
  idx int;
  nu_rev int := case when coalesce(new.data ->> '_rev', '') ~ '^[0-9]{1,9}$' then (new.data ->> '_rev')::int else 0 end;
  later jsonb;
begin
  if new.data is not distinct from old.data then return new; end if;
  if current_setting('glas.foto_erbij', true) = '1'
     or current_setting('glas.bestellingen_erbij', true) = '1' then
    return new;
  end if;
  if jsonb_typeof(old.data -> 'fotos') = 'array' then
    nf := case when jsonb_typeof(new.data -> 'fotos') = 'array' then new.data -> 'fotos' else '[]'::jsonb end;
    for f in select x from jsonb_array_elements(old.data -> 'fotos') x where jsonb_typeof(x -> '_erbij') = 'object' loop
      frev := case when coalesce(f #>> '{_erbij,rev}', '') ~ '^[0-9]{1,9}$' then (f #>> '{_erbij,rev}')::int else 0 end;
      continue when bn is not null and bn >= frev;
      idx := null;
      select t.i - 1 into idx from jsonb_array_elements(nf) with ordinality t(x, i)
       where t.x ->> 'id' = f ->> 'id' limit 1;
      later := (f -> '_erbij') || jsonb_build_object('rev', nu_rev + 1);
      if idx is null then
        nf := nf || jsonb_build_array(f || jsonb_build_object('_erbij', later));
      elsif f ? 'origineel' and not ((nf -> idx) ? 'origineel') then
        nf := jsonb_set(nf, array[idx::text],
                        (nf -> idx) || jsonb_build_object('origineel', f -> 'origineel', '_erbij', later));
      end if;
    end loop;
    if nf is distinct from new.data -> 'fotos' then
      new.data := jsonb_set(new.data, '{fotos}', nf, true);
    end if;
  end if;
  new.data := new.data - '_erbijVan';
  return new;
end;
$$;
drop trigger if exists projecten_fotos_erbij on public.projecten;
create trigger projecten_fotos_erbij
  before update of data on public.projecten
  for each row execute function public.fotos_erbij_houden();

-- ─── 9. Beheer (alleen voor beheerders) ───────────────────────────
-- Wie is er: rol, rechten, laatst ingelogd, laatst actief in de app,
-- welke versie, op welk apparaat, en in welk project nu bezig.
create or replace function public.glas_beheer_gebruikers()
returns table (id uuid, naam text, email text, rol text, actief boolean, alleen_lezen boolean,
               mag_bestellen boolean, mag_ontgrendelen boolean, mag_nieuw boolean, mag_weggooien boolean,
               telefoon text, laatst_ingelogd timestamptz, gezien_op timestamptz, app_versie text,
               apparaat text, bezig_in text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_beheerder() then
    raise exception 'Geen recht: alleen voor beheerders.' using errcode = 'P0001';
  end if;
  return query
  select g.id, g.naam, g.email, g.rol, g.actief, g.alleen_lezen,
         g.mag_bestellen, g.mag_ontgrendelen, g.mag_nieuw, g.mag_weggooien,
         g.telefoon, u.last_sign_in_at, g.gezien_op, g.app_versie, g.apparaat,
         (select string_agg(p.naam, ', ' order by p.naam)
            from public.bewerkslot b join public.projecten p on p.id = b.project_id
           where b.wie = g.id and b.apparaat is not null and b.gezien > now() - interval '10 minutes')
    from public.gebruikers g
    left join auth.users u on u.id = g.id
   order by g.actief desc, case g.rol when 'beheerder' then 0 when 'collega' then 1 else 2 end, lower(g.naam), g.email;
end;
$$;

-- Eén ding van één gebruiker veranderen: rol, actief (toegang), of een
-- van de vier rechten. Niet bij jezelf, niet bij het back-upaccount, en
-- er blijft altijd een beheerder.
create or replace function public.glas_beheer_zet(p_id uuid, p_veld text, p_waarde text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.gebruikers%rowtype;
  aan boolean;
begin
  -- Twee beheerders die tegelijk elkaar wijzigen: één tegelijk.
  perform 1 from public.gebruikers x where x.rol = 'beheerder' for update;
  if not public.is_beheerder() then
    raise exception 'Geen recht: alleen voor beheerders.' using errcode = 'P0001';
  end if;
  if p_id = (select auth.uid()) then
    raise exception 'Je eigen rol en rechten kun je niet zelf veranderen; vraag een andere beheerder.' using errcode = 'P0001';
  end if;
  select * into g from public.gebruikers x where x.id = p_id for update;
  if not found then
    raise exception 'Deze gebruiker bestaat niet.' using errcode = 'P0001';
  end if;
  if g.alleen_lezen then
    raise exception 'Het back-upaccount (alleen lezen) wijzig je in de SQL Editor.' using errcode = 'P0001';
  end if;
  if p_veld = 'rol' then
    if p_waarde not in ('beheerder', 'collega', 'werkvloer') then
      raise exception 'Onbekende rol.' using errcode = 'P0001';
    end if;
    update public.gebruikers x set rol = p_waarde where x.id = p_id;
  elsif p_veld in ('actief', 'mag_bestellen', 'mag_ontgrendelen', 'mag_nieuw', 'mag_weggooien') then
    if p_waarde not in ('true', 'false') then
      raise exception 'Kies aan of uit.' using errcode = 'P0001';
    end if;
    aan := p_waarde = 'true';
    execute format('update public.gebruikers set %I = $1 where id = $2', p_veld) using aan, p_id;
  else
    raise exception 'Onbekend veld.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.gebruikers x where x.rol = 'beheerder' and x.actief and not x.alleen_lezen) then
    raise exception 'Er moet altijd een beheerder blijven.' using errcode = 'P0001';
  end if;
  select * into g from public.gebruikers x where x.id = p_id;
  return to_jsonb(g);
end;
$$;

-- De app meldt zich (bij het inloggen en af en toe): laatst actief,
-- welke versie, welk apparaat. Alleen je eigen regel.
create or replace function public.glas_aanwezig(p_versie text, p_apparaat text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_lid() or not public.mag_schrijven() then return; end if;
  update public.gebruikers g
     set gezien_op = now(), app_versie = left(coalesce(p_versie, ''), 20), apparaat = left(coalesce(p_apparaat, ''), 40)
   where g.id = (select auth.uid())
     and (g.gezien_op is null or g.gezien_op < now() - interval '1 minute'
          or g.app_versie is distinct from left(coalesce(p_versie, ''), 20)
          or g.apparaat is distinct from left(coalesce(p_apparaat, ''), 40));
end;
$$;

-- De opslag nakijken: per soort hoeveel bestanden en hoe groot.
--   1 zonder project: geen enkel project noemt hem, en zijn map hoort bij
--     een project dat niet meer bestaat; deze kunnen weg
--   2 van de prullenbak: alleen nog genoemd door (of in de map van) een
--     project in de prullenbak
--   3 weggehaald in het project (wacht tot het project weggaat; voor ↶)
--   4 alleen nog in het logboek (een oudere stand)
--   5 in gebruik: een project (ook een apart bewaarde kopie) noemt hem
create or replace function public.glas_beheer_opslag()
returns table (soort int, bestanden bigint, bytes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_beheerder() then
    raise exception 'Geen recht: alleen voor beheerders.' using errcode = 'P0001';
  end if;
  return query
  select x.soort, count(*)::bigint, coalesce(sum(x.grootte), 0)::bigint
    from (select case
                   when exists (select 1 from public.glas_foto_pad g join public.projecten q on q.id = g.project_id
                                 where g.pad = o.name and q.verwijderd_op is null) then 5
                   when exists (select 1 from public.glas_foto_pad g where g.pad = o.name) then 2
                   when p.id is null then 1
                   when p.verwijderd_op is not null then 2
                   when exists (select 1 from public.projectgeschiedenis h
                                 where h.project_id = p.id and strpos(coalesce(h.data::text, ''), o.name) > 0) then 4
                   else 3
                 end as soort,
                 case when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]{1,15}$' then (o.metadata ->> 'size')::bigint else 0 end as grootte
            from storage.objects o
            left join public.projecten p on p.id::text = split_part(o.name, '/', 1)
           where o.bucket_id = 'projectfotos') x
   group by x.soort
   order by x.soort;
end;
$$;

-- De bestanden zonder project (soort 1), om op te ruimen.
create or replace function public.glas_beheer_wees(p_max int default 1000)
returns table (naam text, bytes bigint, aangemaakt timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_beheerder() then
    raise exception 'Geen recht: alleen voor beheerders.' using errcode = 'P0001';
  end if;
  return query
  select o.name,
         case when coalesce(o.metadata ->> 'size', '') ~ '^[0-9]{1,15}$' then (o.metadata ->> 'size')::bigint else 0 end,
         o.created_at
    from storage.objects o
   where o.bucket_id = 'projectfotos'
     and not exists (select 1 from public.projecten p where p.id::text = split_part(o.name, '/', 1))
     and not exists (select 1 from public.glas_foto_pad g where g.pad = o.name)
   order by o.name
   limit greatest(1, least(coalesce(p_max, 1000), 5000));
end;
$$;

-- Wat is mijn account? Werkt ook als ik geen toegang meer heb (geblokkeerd):
-- dan kan de app dat zeggen, in plaats van een leeg startscherm.
create or replace function public.glas_mijn_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('actief', g.actief, 'rol', g.rol, 'alleen_lezen', g.alleen_lezen)
    from public.gebruikers g
   where g.id = (select auth.uid())
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- Bestaan deze projecten nog (ook in de prullenbak)? Voor de wachtrij met
-- foto's op een apparaat: een foto van een project dat definitief weg is,
-- hoeft niet meer omhoog. Geen collega: null (dan weet de app het niet).
create or replace function public.glas_project_bestaat(p_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_lid() then return null; end if;
  return jsonb_build_object('bestaan',
    coalesce((select jsonb_agg(p.id) from public.projecten p where p.id = any(p_ids)), '[]'::jsonb));
end;
$$;

revoke all on function public.glas_beheer_gebruikers() from public, anon;
revoke all on function public.glas_beheer_zet(uuid, text, text) from public, anon;
revoke all on function public.glas_aanwezig(text, text) from public, anon;
revoke all on function public.glas_beheer_opslag() from public, anon;
revoke all on function public.glas_beheer_wees(int) from public, anon;
revoke all on function public.glas_project_bestaat(uuid[]) from public, anon;
revoke all on function public.glas_mijn_status() from public, anon;
grant execute on function public.glas_beheer_gebruikers() to authenticated;
grant execute on function public.glas_beheer_zet(uuid, text, text) to authenticated;
grant execute on function public.glas_aanwezig(text, text) to authenticated;
grant execute on function public.glas_beheer_opslag() to authenticated;
grant execute on function public.glas_beheer_wees(int) to authenticated;
grant execute on function public.glas_project_bestaat(uuid[]) to authenticated;
grant execute on function public.glas_mijn_status() to authenticated;

commit;

-- ─── Controle ─────────────────────────────────────────────────────
select 'er is een beheerder' as controle,
       case when exists (select 1 from public.gebruikers where rol = 'beheerder' and actief and not alleen_lezen)
            then 'ja' else 'NEE' end as uitkomst
union all
select 'de database controleert de rechten',
       case when exists (select 1 from pg_trigger where tgname = 'projecten_0_rechten')
             and exists (select 1 from pg_trigger where tgname = 'taken_0_rechten') then 'ja' else 'NEE' end
union all
select 'een nieuw account begint als werkvloer',
       case when (select column_default from information_schema.columns
                   where table_schema = 'public' and table_name = 'gebruikers' and column_name = 'rol') like '%werkvloer%'
            then 'ja' else 'NEE' end;

-- Wie heeft welke rol?
select email, naam, rol, actief, alleen_lezen,
       mag_bestellen, mag_ontgrendelen, mag_nieuw, mag_weggooien
  from public.gebruikers
 order by actief desc, rol, email;
