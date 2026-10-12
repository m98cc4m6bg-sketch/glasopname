-- ══════════════════════════════════════════════════════════════
--  Glasopname v91 – prullenbak voor projecten
--  Plak dit in Supabase → SQL Editor → Run. EERST dit script, dan de
--  bestanden van v91 op GitHub.
--
--  Waarom: tot v90 haalde 'project verwijderen' alles in één keer weg, voor
--  iedereen: de projectrij, de taken, het logboek mét de bewaarde
--  momentopnames (die hangen er met 'on delete cascade' aan), en daarna de
--  foto's. Op het gratis plan is er geen back-up, dus één verkeerde tik
--  was onherstelbaar.
--
--  Nu (keuze van Jan): een verwijderd project gaat 30 dagen naar een
--  prullenbak op het startscherm. Iedereen kan het daar terugzetten. Na 30
--  dagen ruimt de app het zelf op, foto's inbegrepen. Dat opruimen doet de
--  app en niet de database, omdat foto's alleen via de Storage-API weg
--  kunnen (zie OVERDRACHT §5.10).
--
--  Draai je de bestanden van v91 zonder dit script, dan merkt de app dat de
--  kolom ontbreekt en verwijdert hij zoals vroeger — definitief, met de
--  oude waarschuwing. Veilig om nog eens te draaien.
-- ══════════════════════════════════════════════════════════════

alter table public.projecten
  add column if not exists verwijderd_op   timestamptz,
  add column if not exists verwijderd_door uuid,
  add column if not exists verwijderd_naam text;

-- Net als de andere verwijzingen naar gebruikers (zie 16): een vertrokken
-- medewerker moet verwijderd kunnen worden zonder dat dit in de weg zit.
alter table public.projecten drop constraint if exists projecten_verwijderd_door_fkey;
alter table public.projecten
  add constraint projecten_verwijderd_door_fkey
  foreign key (verwijderd_door) references auth.users(id) on delete set null;

create index if not exists projecten_verwijderd_op_idx
  on public.projecten (verwijderd_op) where verwijderd_op is not null;

-- ─── in het logboek ──────────────────────────────────────────
-- Het logboek (log_project, script 14) schrijft alleen bij een wijziging
-- van de inhoud of de status. Naar de prullenbak en terug verandert geen
-- van beide, dus daar een eigen, kleine trigger voor. Hij staat los van
-- log_project, zodat die niet opnieuw geschreven hoeft te worden.

create or replace function public.log_prullenbak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.verwijderd_op is not distinct from new.verwijderd_op then
    return new;
  end if;
  insert into public.projectgeschiedenis (project_id, moment, wie, wie_naam, samenvatting, data)
  -- gewijzigd_door/-naam: de app zet die bij weggooien én bij terugzetten
  -- op wie het deed.
  values (new.id, now(), new.gewijzigd_door, coalesce(new.gewijzigd_naam, ''),
          case when new.verwijderd_op is not null
               then 'project naar de prullenbak'
               else 'project teruggezet uit de prullenbak' end,
          null);
  return new;
end;
$$;

drop trigger if exists projecten_prullenbak on public.projecten;
create trigger projecten_prullenbak
  after update of verwijderd_op on public.projecten
  for each row execute function public.log_prullenbak();

-- ─── Controle ────────────────────────────────────────────────
-- Hoort drie regels te geven: verwijderd_op, verwijderd_door, verwijderd_naam.
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'projecten'
   and column_name like 'verwijderd%'
 order by column_name;
