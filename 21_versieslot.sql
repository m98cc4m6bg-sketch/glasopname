-- ══════════════════════════════════════════════════════════════
--  Glasopname v99 – slot tegen oude app-versies
--  Plak dit in Supabase → SQL Editor → Run. Vóór je de bestanden
--  van v99 in GitHub zet.
--
--  Waarom (harde eis van Jan: nooit gegevens kwijt):
--  de app stuurt bij elke opslag het hele project. Een apparaat met
--  een oudere versie kent onderdelen niet die een nieuwere versie
--  erbij heeft gezet, en schrijft het project dan terug zónder die
--  onderdelen — stil verlies.
--
--  Vanaf v99 zet de app zijn versienummer in het project
--  (data._versieNr, bijv. 99). Deze trigger weigert een opslag
--  waarvan het versienummer lager is dan wat er al staat. Het oudere
--  apparaat krijgt een foutmelding, houdt zijn werk op het apparaat
--  en stuurt het alsnog op zodra het bijgewerkt is.
--
--  Een project zonder versienummer (alles van vóór v99) telt als 0:
--  daar mag iedereen in opslaan, tot de eerste opslag met v99.
--  Alleen een wijziging van de inhoud (kolom data) telt; de status,
--  de prullenbak en de tellingen gaan zoals altijd.
--
--  Veilig om nog eens te draaien.
-- ══════════════════════════════════════════════════════════════

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
  -- Een versienummer dat geen getal is, telt als 0.
  oud := case when coalesce(old.data ->> '_versieNr', '') ~ '^[0-9]+$'
              then (old.data ->> '_versieNr')::int else 0 end;
  nieuw := case when coalesce(new.data ->> '_versieNr', '') ~ '^[0-9]+$'
                then (new.data ->> '_versieNr')::int else 0 end;
  if nieuw < oud then
    -- Deze tekst ziet een oud apparaat in zijn statusbalk; hou hem kort
    -- en zeg wat er moet gebeuren. De app van v99 herkent hem aan
    -- 'Verouderde app-versie'.
    raise exception 'Verouderde app-versie: tik op ↻ Bijwerken. Je werk blijft op dit apparaat staan.'
      using errcode = 'P0001',
            detail = format('project heeft versie %s, dit apparaat %s', oud, nieuw);
  end if;
  return new;
end;
$$;

drop trigger if exists projecten_versie_niet_terug on public.projecten;
create trigger projecten_versie_niet_terug
  before update on public.projecten
  for each row execute function public.versie_niet_terug();

-- ─── Controle ────────────────────────────────────────────────
-- select tgname from pg_trigger where tgname = 'projecten_versie_niet_terug';
-- select naam, data->>'_versieNr' as versie from public.projecten order by updated_at desc;
