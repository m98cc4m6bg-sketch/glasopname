-- ══════════════════════════════════════════════════════════════
--  Glasopname v87 – taken met een eigenaar, en een logboek
--
--  Twee nieuwe tabellen:
--    • taken               – één rij per taak, met eigenaar en datums.
--      Taken stonden tot nu toe in het project zelf; daardoor kon de
--      app niet laten zien wat er voor jóu openstaat zonder elk
--      project in te laden.
--    • projectgeschiedenis – wie wanneer wat wijzigde, met de vórige
--      inhoud erbij. Daarmee is terug te draaien wat er misging.
--
--  Plak dit in Supabase → SQL Editor → Run. Eén keer draaien.
--  Bestaande taken worden onderaan automatisch overgezet.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Taken ────────────────────────────────────────────────

create table if not exists public.taken (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projecten(id) on delete cascade,
  tekst            text not null default '',
  klaar            boolean not null default false,
  eigenaar         uuid references auth.users(id),
  eigenaar_naam    text not null default '',
  volgorde         integer not null default 0,
  aangemaakt_op    timestamptz not null default now(),
  aangemaakt_door  uuid references auth.users(id),
  afgerond_op      timestamptz,
  afgerond_door    uuid references auth.users(id),
  updated_at       timestamptz not null default now()
);

create index if not exists taken_project_idx  on public.taken (project_id);
create index if not exists taken_eigenaar_idx on public.taken (eigenaar) where klaar = false;

drop trigger if exists taken_updated_at on public.taken;
create trigger taken_updated_at
  before update on public.taken
  for each row execute function public.set_updated_at();

alter table public.taken enable row level security;

drop policy if exists taken_select on public.taken;
drop policy if exists taken_insert on public.taken;
drop policy if exists taken_update on public.taken;
drop policy if exists taken_delete on public.taken;

create policy taken_select on public.taken
  for select to authenticated using (true);
create policy taken_insert on public.taken
  for insert to authenticated with check (true);
create policy taken_update on public.taken
  for update to authenticated using (true) with check (true);
create policy taken_delete on public.taken
  for delete to authenticated using (true);

-- Het aantal openstaande taken staat ook op de projectrij, zodat de
-- projectenlijst dat kan tonen zonder alle taken op te halen.
create or replace function public.tel_open_taken()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid := coalesce(new.project_id, old.project_id);
begin
  update public.projecten p
     set open_taken = (
           select count(*) from public.taken t
            where t.project_id = pid and t.klaar = false)
   where p.id = pid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists taken_tellen on public.taken;
create trigger taken_tellen
  after insert or update or delete on public.taken
  for each row execute function public.tel_open_taken();

-- ─── 2. Logboek: wie wijzigde wat, en wat er daarvoor stond ──

create table if not exists public.projectgeschiedenis (
  id            bigserial primary key,
  project_id    uuid not null references public.projecten(id) on delete cascade,
  moment        timestamptz not null default now(),
  wie           uuid references auth.users(id),
  wie_naam      text not null default '',
  samenvatting  text not null default '',
  data          jsonb                      -- de stand van vlak vóór deze wijziging
);

create index if not exists geschiedenis_project_idx
  on public.projectgeschiedenis (project_id, moment desc);

alter table public.projectgeschiedenis enable row level security;

drop policy if exists geschiedenis_select on public.projectgeschiedenis;
drop policy if exists geschiedenis_insert on public.projectgeschiedenis;

create policy geschiedenis_select on public.projectgeschiedenis
  for select to authenticated using (true);
create policy geschiedenis_insert on public.projectgeschiedenis
  for insert to authenticated with check (true);
-- Bewust geen update- of delete-policy: een logboek dat je kunt
-- bijwerken is geen logboek. Opruimen doet de trigger zelf.

-- De app schrijft bij elke opslag in het kort op wat er veranderd is.
alter table public.projecten
  add column if not exists samenvatting text not null default '',
  add column if not exists gewijzigd_naam text not null default '';

-- Bij elke wijziging van een project de vórige inhoud wegschrijven.
-- Niet bij élke opslag: tijdens het typen slaat de app elke paar
-- seconden op, en dan staat het logboek binnen een minuut vol met
-- twintig keer 'één ruit gewijzigd'. Alleen als de vorige wijziging
-- langer dan twee minuten geleden was, of van iemand anders.
create or replace function public.log_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.data is not distinct from new.data then
    return new;
  end if;

  if (now() - old.updated_at) > interval '2 minutes'
     or old.gewijzigd_door is distinct from new.gewijzigd_door then

    -- Eén regel per wijziging: wie hem nú doet, wat hij deed, en de
    -- inhoud zoals die er vlak daarvóór stond (om op terug te kunnen
    -- vallen). Wie en samenvatting horen dus bij dezelfde wijziging;
    -- `data` is de stand van vóór die wijziging.
    insert into public.projectgeschiedenis (project_id, moment, wie, wie_naam, samenvatting, data)
    values (old.id, now(), new.gewijzigd_door,
            coalesce(new.gewijzigd_naam, ''), coalesce(new.samenvatting, ''), old.data);

    -- Niet eindeloos bewaren: de laatste twintig standen per project.
    delete from public.projectgeschiedenis g
     where g.project_id = old.id
       and g.id not in (
         select id from public.projectgeschiedenis
          where project_id = old.id
          order by moment desc
          limit 20
       );
  end if;

  return new;
end;
$$;

drop trigger if exists projecten_logboek on public.projecten;
create trigger projecten_logboek
  before update on public.projecten
  for each row execute function public.log_project();

-- ─── 3. Bestaande taken overzetten ───────────────────────────
-- Taken die nu nog in het project zelf staan verhuizen naar de
-- tabel. Er is nog geen eigenaar bekend; die vul je gewoon in als je
-- de taak de eerstvolgende keer openmaakt.

insert into public.taken (project_id, tekst, klaar, volgorde, aangemaakt_op)
select p.id,
       coalesce(t ->> 'tekst', ''),
       coalesce((t ->> 'klaar')::boolean, false),
       (row_number() over (partition by p.id order by ordinaliteit))::int,
       p.created_at
from public.projecten p
cross join lateral jsonb_array_elements(coalesce(p.data -> 'taken', '[]'::jsonb))
     with ordinality as e(t, ordinaliteit)
where coalesce(t ->> 'tekst', '') <> ''
  and not exists (select 1 from public.taken x where x.project_id = p.id);

-- Tellingen gelijktrekken.
update public.projecten p
   set open_taken = coalesce((
         select count(*) from public.taken t
          where t.project_id = p.id and t.klaar = false), 0);

-- ─── Controle ────────────────────────────────────────────────
-- select naam, open_taken from public.projecten order by updated_at desc;
-- select project_id, tekst, klaar, eigenaar_naam from public.taken order by project_id, volgorde;
-- select project_id, moment, wie_naam, samenvatting from public.projectgeschiedenis order by moment desc limit 20;
