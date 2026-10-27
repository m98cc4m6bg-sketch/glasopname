-- ═══════════════════════════════════════════════════════════════════
-- 31_naam_en_werkvloer.sql — Glasopname v125 (27-10-2026)
--
-- Draaien in Supabase: SQL Editor → New query → dit hele bestand plakken
-- → Run. Er hoeft niets ingevuld te worden. Hoort na script 30. Nog een
-- keer draaien kan geen kwaad.
--
-- Wat het doet (keuzes van Jan, 27-10-2026):
--  1. Een project in de prullenbak houdt zijn naam niet meer bezet: je kunt
--     meteen een nieuw project met die naam maken. Zet je het oude terug
--     terwijl de naam in gebruik is, dan krijgt het teruggezette project
--     "(2)" erachter (of "(3)" enzovoort).
--  2. De werkvloer mag ook de foto van de leverlocatie zetten (die vervangt
--     de vorige), en ook taken zonder eigenaar afvinken.
--
-- Het hele script is één geheel (begin … commit): stopt het ergens, dan is
-- er niets veranderd. Zegt de editor daarna "current transaction is
-- aborted": eerst alleen  rollback;  draaien, dan opnieuw.
--
-- Terugdraaien: 31_terug.sql (zip "niet-in-repo" en de projectkennis).
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ─── Veiligheidsstop ──────────────────────────────────────────────
do $$
declare
  dubbel text;
begin
  if to_regprocedure('public.glas_rol()') is null
     or to_regprocedure('public.glas_foto_erbij(uuid, jsonb)') is null then
    raise exception 'Script gestopt; er is niets veranderd. Draai eerst script 30.';
  end if;
  -- Twee projecten buiten de prullenbak met dezelfde naam (kan alleen als
  -- script 03 nooit gedraaid is): dan eerst één hernoemen.
  select string_agg(n, ', ') into dubbel from (
    select min(naam) as n from public.projecten where verwijderd_op is null
     group by lower(trim(naam)) having count(*) > 1 limit 10) x;
  if dubbel is not null then
    raise exception 'Script gestopt; er is niets veranderd. Deze namen staan dubbel (buiten de prullenbak): %. Geef er één een andere naam en draai het script opnieuw.', dubbel;
  end if;
end $$;

-- ─── 1. De naam: alleen buiten de prullenbak uniek ────────────────
drop index if exists public.projecten_naam_uniek;
create unique index projecten_naam_uniek
  on public.projecten (lower(trim(naam)))
  where verwijderd_op is null;

-- Terugzetten terwijl de naam in gebruik is: "(2)" erachter. Alleen de
-- kolom naam; de app neemt die bij het openen over (de inhoud zelf blijft
-- gelijk, dus het bewerkslot merkt er niets van).
create or replace function public.naam_bij_terugzetten()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  basis text := trim(coalesce(new.naam, ''));
  kandidaat text;
  n int := 2;
begin
  if old.verwijderd_op is null or new.verwijderd_op is not null or basis = '' then
    return new;
  end if;
  if not exists (select 1 from public.projecten p
                  where p.id <> new.id and p.verwijderd_op is null
                    and lower(trim(p.naam)) = lower(basis)) then
    return new;
  end if;
  loop
    kandidaat := basis || ' (' || n || ')';
    exit when not exists (select 1 from public.projecten p
                           where p.id <> new.id and p.verwijderd_op is null
                             and lower(trim(p.naam)) = lower(kandidaat));
    n := n + 1;
    exit when n > 999;
  end loop;
  new.naam := kandidaat;
  return new;
end;
$$;
drop trigger if exists projecten_naam_terugzetten on public.projecten;
create trigger projecten_naam_terugzetten
  before update of verwijderd_op on public.projecten
  for each row execute function public.naam_bij_terugzetten();

-- Voor de app: is dit script er? (dan telt de prullenbak niet bij de naam,
-- en mag de werkvloer de leverfoto en taken zonder eigenaar).
create or replace function public.glas_naam_vrij_in_prullenbak()
returns boolean
language sql
stable
set search_path = ''
as $$ select true $$;
revoke all on function public.glas_naam_vrij_in_prullenbak() from public, anon;
grant execute on function public.glas_naam_vrij_in_prullenbak() to authenticated;

-- ─── 2. Werkvloer: taken zonder eigenaar ──────────────────────────
-- (zelfde functie als in script 30, met één regel anders)
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
  -- v125 (keuze Jan): ook taken zonder eigenaar.
  if old.eigenaar is not null and old.eigenaar is distinct from uid then
    raise exception 'Geen recht: je account staat op werkvloer; je kunt alleen je eigen taken en taken zonder eigenaar afvinken.' using errcode = 'P0001';
  end if;
  if (to_jsonb(new) - vrij) is distinct from (to_jsonb(old) - vrij) then
    raise exception 'Geen recht: je account staat op werkvloer; je kunt een taak alleen afvinken.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ─── 3. Werkvloer: de leverfoto ───────────────────────────────────
-- (zelfde functie als in script 30, met de leverfoto erbij)
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
  lever boolean := coalesce(p_foto ->> 'soort', '') = 'lever';   -- v125: de leverfoto
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
     or substr(pad, length(begin_pad) + 1) !~ '^[A-Za-z0-9._-]{1,120}$' or pad ~ '\.\.'
     or (lever and left(pad, length(begin_pad || 'lever-')) <> begin_pad || 'lever-') then
    raise exception 'Foto onleesbaar.' using errcode = 'P0001';
  end if;
  nieuw := jsonb_build_object('id', fid, 'pad', pad, 'titel', left(coalesce(p_foto ->> 'titel', ''), 200),
                              'bron', 'foto', 'markeringen', '[]'::jsonb);
  if lever then
    nieuw := nieuw || jsonb_build_object('soort', 'lever', 'titel', 'Leverlocatie', 'inkt', '[]'::jsonb);
  end if;
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
    -- v125: een nieuwe leverfoto vervangt de vorige (er is er één).
    if lever then
      fotos := coalesce((select jsonb_agg(x) from jsonb_array_elements(fotos) x
                          where coalesce(x ->> 'soort', '') <> 'lever'), '[]'::jsonb);
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

commit;

-- ─── Controle ─────────────────────────────────────────────────────
select 'de naam telt alleen buiten de prullenbak' as controle,
       case when exists (select 1 from pg_indexes where indexname = 'projecten_naam_uniek'
                          and indexdef ilike '%verwijderd_op IS NULL%') then 'ja' else 'NEE' end as uitkomst
union all
select 'terugzetten met een bezette naam geeft (2)',
       case when exists (select 1 from pg_trigger where tgname = 'projecten_naam_terugzetten') then 'ja' else 'NEE' end
union all
select 'werkvloer: leverfoto en taken zonder eigenaar',
       case when position('lever' in pg_get_functiondef('public.glas_foto_erbij(uuid, jsonb)'::regprocedure)) > 0
             and position('old.eigenaar is not null' in pg_get_functiondef('public.taken_rechten()'::regprocedure)) > 0
            then 'ja' else 'NEE' end;
