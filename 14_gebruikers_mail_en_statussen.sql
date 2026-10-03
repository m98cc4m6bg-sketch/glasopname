-- ══════════════════════════════════════════════════════════════
--  Glasopname v88 – gebruikers, mail, statussen en een nauwkeurig spoor
--
--  Wat dit script doet:
--    1. tabel `gebruikers`  – de namen waaruit je bij een taak kiest.
--       Wordt automatisch gevuld zodra jij iemand in Supabase aanmaakt.
--    2. tabel `mailadressen` – de vaste geadresseerden (leveranciers).
--    3. tabel `mailverzonden` – wat er verstuurd is, door wie, en of het
--       aankwam. Alleen de mailfunctie schrijft hierin.
--    4. twee kolommen bij `projecten` voor het bestelmoment.
--    5. de statussen: open → aangemaakt, ingemeten → bezig met
--       inmeten/verwerken.
--    6. het logboek nauwkeurig maken: élke wijziging krijgt een regel.
--       Tot nu toe werd binnen twee minuten alleen de eerste bewaard;
--       verwijderde je drie ruiten één voor één, dan stond er in het
--       logboek "1 ruit verwijderd".
--
--  Plak dit in Supabase → SQL Editor → Run. Eén keer draaien.
--  Veilig om nog eens te draaien: alles staat met `if not exists`
--  of `create or replace`.
--
--  LET OP: dit script heeft 13_taken_en_geschiedenis.sql nodig.
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Gebruikers ───────────────────────────────────────────
-- De app mag `auth.users` niet lezen (en dat hoort ook zo). Deze
-- tabel is de kopie die wél gelezen mag worden: alleen een naam en
-- een mailadres, geen wachtwoorden.

create table if not exists public.gebruikers (
  id          uuid primary key references auth.users(id) on delete cascade,
  naam        text not null default '',
  email       text not null default '',
  actief      boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table public.gebruikers enable row level security;

drop policy if exists gebruikers_select on public.gebruikers;
drop policy if exists gebruikers_update on public.gebruikers;

create policy gebruikers_select on public.gebruikers
  for select to authenticated using (true);
-- Namen mag je in de app bijwerken (bijvoorbeeld "Jan" in plaats van
-- "julian"); aanmaken en verwijderen gebeurt via Authentication.
create policy gebruikers_update on public.gebruikers
  for update to authenticated using (true) with check (true);

drop trigger if exists gebruikers_updated_at on public.gebruikers;
create trigger gebruikers_updated_at
  before update on public.gebruikers
  for each row execute function public.set_updated_at();

-- Nieuwe gebruiker in Supabase → meteen een regel hier. De naam wordt
-- het stuk vóór de @ van het mailadres; dat kun je daarna aanpassen.
create or replace function public.gebruiker_bijschrijven()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.gebruikers (id, naam, email)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data ->> 'naam', ''),
                   split_part(coalesce(new.email, ''), '@', 1)),
          coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists gebruikers_bijschrijven on auth.users;
create trigger gebruikers_bijschrijven
  after insert on auth.users
  for each row execute function public.gebruiker_bijschrijven();

-- De gebruikers die er al zijn, erbij.
insert into public.gebruikers (id, naam, email)
select u.id, split_part(coalesce(u.email, ''), '@', 1), coalesce(u.email, '')
from auth.users u
on conflict (id) do nothing;

-- ─── 2. Vaste mailadressen ───────────────────────────────────
-- De geadresseerden die de app aanbiedt bij een bestelmail. Vul ze
-- hieronder in, of voeg ze toe in de app (Projectgegevens → Bestelmail).
--   soort: 'leverancier' | 'intern' | 'overig'
--   standaard: staat bij het openen van het mailvenster al aangevinkt.

create table if not exists public.mailadressen (
  id             uuid primary key default gen_random_uuid(),
  soort          text not null default 'leverancier',
  naam           text not null default '',
  adres          text not null,
  standaard      boolean not null default false,
  actief         boolean not null default true,
  aangemaakt_op  timestamptz not null default now()
);

create unique index if not exists mailadressen_adres_idx on public.mailadressen (lower(adres));

alter table public.mailadressen enable row level security;

drop policy if exists mailadressen_select on public.mailadressen;
drop policy if exists mailadressen_insert on public.mailadressen;
drop policy if exists mailadressen_update on public.mailadressen;
drop policy if exists mailadressen_delete on public.mailadressen;

create policy mailadressen_select on public.mailadressen
  for select to authenticated using (true);
create policy mailadressen_insert on public.mailadressen
  for insert to authenticated with check (true);
create policy mailadressen_update on public.mailadressen
  for update to authenticated using (true) with check (true);
create policy mailadressen_delete on public.mailadressen
  for delete to authenticated using (true);

-- Vul hier je eigen adressen in en haal de commentaartekens weg:
-- insert into public.mailadressen (soort, naam, adres, standaard) values
--   ('leverancier', 'Van Noordenne — verkoop', 'VUL_IN@example.com', true),
--   ('intern',      'Kantoor Jelier Bouw',     'VUL_IN@jelierbouw.nl', true)
-- on conflict do nothing;

-- ─── 3. Wat er verstuurd is ──────────────────────────────────
-- Alleen de mailfunctie schrijft hierin (die werkt met de service-rol
-- en gaat buiten RLS om). Lezen mag iedereen die is ingelogd.

create table if not exists public.mailverzonden (
  id          bigserial primary key,
  project_id  uuid references public.projecten(id) on delete set null,
  soort       text not null default 'bestelling',   -- bestelling | taak
  aan         text not null default '',
  onderwerp   text not null default '',
  gelukt      boolean not null default false,
  fout        text,
  dienst_id   text,                                  -- id van de maildienst
  wie         uuid references auth.users(id),
  wie_naam    text not null default '',
  moment      timestamptz not null default now()
);

create index if not exists mailverzonden_project_idx
  on public.mailverzonden (project_id, moment desc);

alter table public.mailverzonden enable row level security;

drop policy if exists mailverzonden_select on public.mailverzonden;
create policy mailverzonden_select on public.mailverzonden
  for select to authenticated using (true);
-- Bewust geen insert-, update- of delete-policy: dit is een logboek.

-- ─── 4. Het bestelmoment op de projectrij ────────────────────
-- Zodat de projectenlijst kan laten zien wanneer er besteld is zonder
-- het hele project op te halen.

alter table public.projecten
  add column if not exists besteld_op   timestamptz,
  add column if not exists besteld_door uuid references auth.users(id);

-- ─── 5. De statussen ─────────────────────────────────────────
-- Aangemaakt → bezig met inmeten/verwerken → besteld → geleverd →
-- gemonteerd → afgerond. De status staat zowel in de kolom (voor de
-- lijst) als in de opname zelf (`data -> info -> status`), dus beide
-- worden bijgewerkt.

alter table public.projecten alter column status set default 'aangemaakt';

update public.projecten
   set status = 'aangemaakt'
 where coalesce(status, '') in ('', 'open');

update public.projecten
   set status = 'bezig met inmeten/verwerken'
 where status = 'ingemeten';

update public.projecten
   set data = jsonb_set(data, '{info,status}', to_jsonb('aangemaakt'::text), true)
 where coalesce(data -> 'info' ->> 'status', '') in ('', 'open');

update public.projecten
   set data = jsonb_set(data, '{info,status}', to_jsonb('bezig met inmeten/verwerken'::text), true)
 where data -> 'info' ->> 'status' = 'ingemeten';

-- ─── 6. Het logboek nauwkeurig ───────────────────────────────
-- Het oude logboek sloeg binnen twee minuten alleen de eerste wijziging
-- op. Verwijderde je drie ruiten één voor één, dan stond er "1 ruit
-- verwijderd". Dat moest anders, maar een regel per opslag is ook niets:
-- tijdens het typen slaat de app elke paar seconden op.
--
-- Daarom werken app en database nu samen. De app houdt bij wélke ruiten
-- er in deze werkgang zijn toegevoegd, gewijzigd en verwijderd, en zegt
-- met `spoor_vervolg` of dit nog dezelfde werkgang is. Zo ja, dan wordt
-- de laatste regel bijgewerkt in plaats van er een nieuwe bij te zetten —
-- die regel groeit dus mee van "1 ruit verwijderd" naar "3 ruiten
-- verwijderd". Een nieuwe werkgang (een andere persoon, een half uur
-- stilte, of iets bijzonders zoals een ontgrendeling) krijgt een eigen
-- regel.
--
-- De momentopname van de inhoud is groot en wordt apart geremd: één per
-- tien minuten per project, en altijd als er iemand anders aan het werk
-- gaat. Opruimen: hoogstens 200 regels per project en 20 momentopnames;
-- oudere regels houden hun tekst en lozen hun inhoud.

alter table public.projecten
  add column if not exists spoor_vervolg boolean not null default false;

create or replace function public.log_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  laatste   record;
  gevonden  boolean;
  snap      timestamptz;
  bewaar    boolean;
begin
  if old.data is not distinct from new.data
     and coalesce(old.status, '') = coalesce(new.status, '') then
    return new;
  end if;

  select g.id, g.wie, g.moment into laatste
    from public.projectgeschiedenis g
   where g.project_id = old.id
   order by g.moment desc, g.id desc
   limit 1;
  gevonden := found;

  -- Zelfde werkgang, zelfde persoon, en nog niet lang stil: de bestaande
  -- regel bijwerken. De app stuurt dan de bijgewerkte stand mee ("3
  -- ruiten verwijderd" in plaats van "1 ruit verwijderd").
  if coalesce(new.spoor_vervolg, false) and gevonden
     and laatste.wie is not distinct from new.gewijzigd_door
     and (now() - laatste.moment) < interval '30 minutes' then
    update public.projectgeschiedenis
       set samenvatting = coalesce(new.samenvatting, ''),
           wie_naam     = coalesce(new.gewijzigd_naam, ''),
           moment       = now()
     where id = laatste.id;
    return new;
  end if;

  select max(g.moment) into snap
    from public.projectgeschiedenis g
   where g.project_id = old.id and g.data is not null;

  bewaar := snap is null
            or (now() - snap) > interval '10 minutes'
            or old.gewijzigd_door is distinct from new.gewijzigd_door;

  -- Een nieuwe regel: wie, wat, en — als we hem bewaren — de inhoud zoals
  -- die er vlak daarvóór stond.
  insert into public.projectgeschiedenis (project_id, moment, wie, wie_naam, samenvatting, data)
  values (old.id, now(), new.gewijzigd_door,
          coalesce(new.gewijzigd_naam, ''), coalesce(new.samenvatting, ''),
          case when bewaar then old.data else null end);

  delete from public.projectgeschiedenis g
   where g.project_id = old.id
     and g.id not in (
       select id from public.projectgeschiedenis
        where project_id = old.id
        order by moment desc, id desc
        limit 200
     );

  update public.projectgeschiedenis g
     set data = null
   where g.project_id = old.id
     and g.data is not null
     and g.id not in (
       select id from public.projectgeschiedenis
        where project_id = old.id and data is not null
        order by moment desc, id desc
        limit 20
     );

  return new;
end;
$$;

drop trigger if exists projecten_logboek on public.projecten;
create trigger projecten_logboek
  before update on public.projecten
  for each row execute function public.log_project();

-- ─── Controle ────────────────────────────────────────────────
-- select naam, email, actief from public.gebruikers order by naam;
-- select soort, naam, adres, standaard, actief from public.mailadressen order by soort, naam;
-- select naam, status, besteld_op from public.projecten order by updated_at desc;
-- select moment, wie_naam, samenvatting, (data is not null) as met_momentopname
--   from public.projectgeschiedenis order by moment desc limit 30;
-- select moment, soort, aan, gelukt, fout from public.mailverzonden order by moment desc limit 20;
