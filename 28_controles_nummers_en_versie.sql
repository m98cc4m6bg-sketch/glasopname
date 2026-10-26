-- ═══════════════════════════════════════════════════════════════════
-- 28_controles_nummers_en_versie.sql — Glasopname v123 (26-10-2026)
--
-- Draaien in Supabase: SQL Editor → New query → dit hele bestand plakken
-- → Run. Hoort na script 27. Nog een keer draaien kan geen kwaad.
--
-- Wat het doet, in gewone woorden (akkoord Jan, 26-10-2026):
--  1. De ruimtemeter op het startscherm (glas_gebruik) geeft alleen nog
--     antwoord aan collega's die op actief staan, net als de rest van de
--     database sinds script 26.
--  2. De controle op de nummers van ruiten en foto's (script 26) wordt
--     volledig: ook een ruit zonder nummer, een bolletje zonder
--     ruitnummer en een ruit met een ongeldig fotonummer worden
--     geweigerd. De app zet dit bij het openen van een project al zelf
--     recht (sinds v120); dit is de controle aan de kant van de database.
--  3. Het versienummer van de app: de grens van script 26 (hoogstens vier
--     cijfers) geldt nu ook bij een nieuw project, en een getal van vijf
--     of meer cijfers dat al in een project staat, telt als 0. Zo kan een
--     project nooit vast komen te zitten.
--
-- Veiligheidsstop: staat er nu al een project in de database dat de
-- strengere controle uit punt 2 niet haalt, dan stopt het script en noemt
-- het die projecten. Het hele script is één geheel (begin … commit): bij
-- de stop wordt niets veranderd, ook niet wat er vóór de stop stond.
-- Open zo'n project dan één keer in de app met v123: de app zet de
-- nummers recht en slaat op. Draai daarna dit script opnieuw. (Zegt de SQL
-- Editor dan "current transaction is aborted", draai eerst alleen:
-- rollback;  en daarna het script.)
--
-- Merk je het als gebruiker? Nee. Weigert de database toch eens een
-- opslag, dan zegt de app "Tik op ↻ Bijwerken; je werk blijft op dit
-- apparaat staan" en gaat er niets verloren.
--
-- Terugdraaien: 28_terug.sql (in de zip "niet-in-repo" en de
-- projectkennis). Zet de controles terug zoals script 26 ze zette.
-- ═══════════════════════════════════════════════════════════════════

-- Alles of niets: gaat er onderweg iets mis (of grijpt de veiligheidsstop
-- in), dan blijft de database precies zoals hij was.
begin;

-- ─── 0. Eén plek voor de controle op de nummers ────────────────────
-- Geeft null als alles goed is, anders in gewone woorden wat er niet
-- klopt. Gebruikt door de veiligheidsstop hieronder én door de trigger
-- (punt 2), zodat die twee nooit iets anders vinden.
create or replace function public.glas_ids_fout(d jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    -- De ruiten: een lijst van regels, elk met een heel getal als nummer
    -- (hoogstens 9 cijfers), en een fotonummer dat leeg is of alleen
    -- letters, cijfers, - en _ bevat.
    when d ? 'rijen' and jsonb_typeof(d -> 'rijen') not in ('array', 'null')
      then 'ruiten zijn geen lijst'
    when jsonb_typeof(d -> 'rijen') = 'array' and exists (
        select 1 from jsonb_array_elements(d -> 'rijen') e
         where jsonb_typeof(e) is distinct from 'object'
            or jsonb_typeof(e -> 'id') is distinct from 'number'
            or coalesce(e ->> 'id', '') !~ '^[0-9]{1,9}$'
            or (coalesce(e ->> 'fotoId', '') <> ''
                and (e ->> 'fotoId') !~ '^[A-Za-z0-9_-]{1,64}$'))
      then 'ruit'
    -- De foto's: een lijst van blokken, elk met een geldig nummer, en
    -- bolletjes die elk naar een ruitnummer wijzen.
    when d ? 'fotos' and jsonb_typeof(d -> 'fotos') not in ('array', 'null')
      then 'foto''s zijn geen lijst'
    when jsonb_typeof(d -> 'fotos') = 'array' and exists (
        select 1 from jsonb_array_elements(d -> 'fotos') f
         where jsonb_typeof(f) is distinct from 'object'
            or coalesce(f ->> 'id', '') !~ '^[A-Za-z0-9_-]{1,64}$'
            or (f ? 'markeringen' and jsonb_typeof(f -> 'markeringen') not in ('array', 'null'))
            or (jsonb_typeof(f -> 'markeringen') = 'array' and exists (
                  select 1 from jsonb_array_elements(f -> 'markeringen') m
                   where jsonb_typeof(m) is distinct from 'object'
                      or coalesce(m ->> 'rijId', '') !~ '^[0-9]{1,9}$')))
      then 'foto'
    else null
  end;
$$;
revoke all on function public.glas_ids_fout(jsonb) from public, anon;
grant execute on function public.glas_ids_fout(jsonb) to authenticated;

-- ─── Veiligheidsstop ───────────────────────────────────────────────
do $$
declare
  n int;
  namen text;
begin
  select count(*), string_agg(coalesce(nullif(naam, ''), '(zonder naam)') || ' [' || id || ']', ', ')
    into n, namen
    from public.projecten
   -- De prullenbak telt niet mee: terugzetten verandert de inhoud niet (dat
   -- gaat dus altijd door), en bij het openen zet de app de nummers recht.
   where verwijderd_op is null
     and public.glas_ids_fout(data) is not null;
  if n > 0 then
    raise exception 'Script gestopt; er is niets veranderd. % project(en) hebben nummers die de nieuwe controle niet haalt: %. Open ze één keer in de app (v123) en draai dit script daarna opnieuw.', n, namen;
  end if;
end $$;

-- ─── 1. Ruimtemeter alleen voor collega's op actief ────────────────
create or replace function public.glas_gebruik()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- v123: zoals de rest van de database sinds script 26.
  if not coalesce(public.is_lid(), false) then
    return null;
  end if;
  return json_build_object(
    'database_bytes', pg_catalog.pg_database_size(pg_catalog.current_database()),
    'opslag_bytes', coalesce((
        select sum(coalesce((o.metadata ->> 'size')::bigint, 0))
          from storage.objects o
         where o.bucket_id = 'projectfotos'), 0),
    'opslag_bestanden', coalesce((
        select count(*) from storage.objects o where o.bucket_id = 'projectfotos'), 0),
    'gemeten_op', pg_catalog.now()
  );
end;
$$;
revoke all on function public.glas_gebruik() from public, anon;
grant execute on function public.glas_gebruik() to authenticated;

-- ─── 2. Nummers van ruiten en foto's: de volledige controle ────────
-- Zelfde trigger als in script 26 (projecten_ids), nu met de controle van
-- hierboven. Een opslag die niets aan de inhoud verandert, gaat altijd door.
create or replace function public.ids_controleren()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  fout text;
begin
  if tg_op = 'UPDATE' and new.data is not distinct from old.data then
    return new;
  end if;
  fout := public.glas_ids_fout(new.data);
  if fout like 'foto%' then
    raise exception 'Ongeldig nummer van een foto. Tik op ↻ Bijwerken; je werk blijft op dit apparaat staan.'
      using errcode = 'P0001';
  elsif fout is not null then
    raise exception 'Ongeldig nummer van een ruit. Tik op ↻ Bijwerken; je werk blijft op dit apparaat staan.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists projecten_ids on public.projecten;
create trigger projecten_ids
  before insert or update on public.projecten
  for each row execute function public.ids_controleren();

-- ─── 3. Versienummer: ook bij een nieuw project ────────────────────
-- Zoals script 21 en 26: een opslag mag het versienummer niet verlagen,
-- en een versie van vijf of meer cijfers wordt geweigerd. Nieuw (v123):
--  - dat laatste geldt ook bij het aanmaken van een project;
--  - een getal van vijf of meer cijfers dat al in een project staat,
--    telt als 0 (dat stond al in de uitleg bij script 26, maar alleen
--    zeven of meer cijfers telden toen als 0).
create or replace function public.versie_niet_terug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  oud int;
  nieuw int;
begin
  if tg_op = 'UPDATE' and new.data is not distinct from old.data then
    return new;
  end if;
  if coalesce(new.data ->> '_versieNr', '') ~ '^[0-9]{5,}$' then
    raise exception 'Onbekend versienummer %', new.data ->> '_versieNr' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    return new;
  end if;
  oud := case when coalesce(old.data ->> '_versieNr', '') ~ '^[0-9]{1,4}$'
              then (old.data ->> '_versieNr')::int else 0 end;
  nieuw := case when coalesce(new.data ->> '_versieNr', '') ~ '^[0-9]{1,4}$'
                then (new.data ->> '_versieNr')::int else 0 end;
  if nieuw < oud then
    raise exception 'Verouderde app-versie: tik op ↻ Bijwerken. Je werk blijft op dit apparaat staan.'
      using errcode = 'P0001',
            detail = format('project heeft versie %s, dit apparaat %s', oud, nieuw);
  end if;
  return new;
end;
$$;
drop trigger if exists projecten_versie_niet_terug on public.projecten;
create trigger projecten_versie_niet_terug
  before insert or update on public.projecten
  for each row execute function public.versie_niet_terug();

commit;

-- ─── Klaar. Controle: drie regels met 'ja' ─────────────────────────
select 'controle op nummers (ruit, foto, bolletje)' as wat,
       case when exists (select 1 from pg_trigger where tgname = 'projecten_ids') then 'ja' else 'NEE' end as staat_aan
union all
select 'versiegrens ook bij een nieuw project',
       case when exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                          where t.tgname = 'projecten_versie_niet_terug' and c.relname = 'projecten'
                            and (t.tgtype & 4) = 4) then 'ja' else 'NEE' end
union all
select 'ruimtemeter alleen voor collega''s op actief',
       case when pg_get_functiondef('public.glas_gebruik()'::regprocedure) like '%is_lid%' then 'ja' else 'NEE' end;
