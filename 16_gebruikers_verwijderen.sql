-- ══════════════════════════════════════════════════════════════
--  Glasopname v89 – een vertrokken medewerker kunnen verwijderen
--
--  Het probleem: zodra iemand ooit een project heeft gewijzigd of een
--  taak op zijn naam had, kon hij niet meer uit Supabase verwijderd
--  worden:
--
--    ERROR: update or delete on table "users" violates foreign key
--           constraint "projecten_gewijzigd_door_fkey" on table "projecten"
--
--  De verwijzingen stonden op 'no action': de database weigert dan de
--  verwijdering. Dat hoort 'set null' te zijn — de verwijzing wordt
--  leeggemaakt en de rest blijft staan. De namen in oude taken en in het
--  logboek zijn apart als tekst bewaard (`eigenaar_naam`, `wie_naam`,
--  `gewijzigd_naam`), dus daar blijft zichtbaar wie het was.
--
--  Plak dit in Supabase → SQL Editor → Run. Eén keer draaien, mag zo
--  vaak als je wilt.
-- ══════════════════════════════════════════════════════════════

-- ─── projecten ───────────────────────────────────────────────
alter table public.projecten
  drop constraint if exists projecten_gewijzigd_door_fkey;
alter table public.projecten
  add constraint projecten_gewijzigd_door_fkey
  foreign key (gewijzigd_door) references auth.users(id) on delete set null;

alter table public.projecten
  drop constraint if exists projecten_besteld_door_fkey;
alter table public.projecten
  add constraint projecten_besteld_door_fkey
  foreign key (besteld_door) references auth.users(id) on delete set null;

-- ─── taken ───────────────────────────────────────────────────
alter table public.taken drop constraint if exists taken_eigenaar_fkey;
alter table public.taken
  add constraint taken_eigenaar_fkey
  foreign key (eigenaar) references auth.users(id) on delete set null;

alter table public.taken drop constraint if exists taken_aangemaakt_door_fkey;
alter table public.taken
  add constraint taken_aangemaakt_door_fkey
  foreign key (aangemaakt_door) references auth.users(id) on delete set null;

alter table public.taken drop constraint if exists taken_afgerond_door_fkey;
alter table public.taken
  add constraint taken_afgerond_door_fkey
  foreign key (afgerond_door) references auth.users(id) on delete set null;

-- ─── logboek en maillogboek ──────────────────────────────────
alter table public.projectgeschiedenis drop constraint if exists projectgeschiedenis_wie_fkey;
alter table public.projectgeschiedenis
  add constraint projectgeschiedenis_wie_fkey
  foreign key (wie) references auth.users(id) on delete set null;

alter table public.mailverzonden drop constraint if exists mailverzonden_wie_fkey;
alter table public.mailverzonden
  add constraint mailverzonden_wie_fkey
  foreign key (wie) references auth.users(id) on delete set null;

-- `gebruikers.id` staat al op 'on delete cascade': de naam verdwijnt uit
-- de keuzelijst zodra je de gebruiker verwijdert. Wil je iemand uit de
-- lijst halen zonder hem te verwijderen, zet dan `actief` op false:
--   update public.gebruikers set actief = false where email = '…';

-- Controle: hierna hoort bij elke regel 'SET NULL' te staan.
-- select tc.table_name, tc.constraint_name, rc.delete_rule
--   from information_schema.table_constraints tc
--   join information_schema.referential_constraints rc
--     on rc.constraint_name = tc.constraint_name
--  where tc.constraint_type = 'FOREIGN KEY'
--    and tc.table_schema = 'public'
--    and tc.constraint_name like any (array['%gewijzigd_door%','%besteld_door%','%eigenaar%',
--                                           '%aangemaakt_door%','%afgerond_door%','%_wie_%'])
--  order by tc.table_name;
