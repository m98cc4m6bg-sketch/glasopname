-- ══════════════════════════════════════════════════════════════
--  Glasopname v106 – één persoon tegelijk bewerkt een project
--  Plak dit in Supabase → SQL Editor → Run. Vóór je de bestanden
--  van v106 in GitHub zet. Script 23 (23_bestellingen.sql) moet er al in
--  staan: deze gebruikt glas_status_rang daaruit.
--
--  Waarom (harde eis van Jan: nooit gegevens kwijt):
--  de app slaat bij elke opslag het hele project op; wie het laatst
--  opslaat, wint. Een iPad die offline aan een project werkte, zette
--  zo bij terugkomst een oudere stand terug over wat er intussen op
--  kantoor gedaan was. Tegelijk bewerken is niet nodig (Jan, 14 oktober
--  2026); tegelijk kijken wel.
--
--  Hoe het werkt:
--  - Per project staat in de tabel bewerkslot wie het mag bewerken:
--    een apparaat (een vaste code per apparaat), met naam en soort
--    apparaat. Wie een project als eerste opent, krijgt het.
--  - Een ander kijkt mee en kan het overnemen ("Toch bewerken"). Eerst
--    krijgt de huidige bewerker een seintje (overname_*): zijn app slaat
--    op, gaat op slot en geeft het vrij. Reageert hij niet (geen bereik),
--    dan neemt de ander het over (actie 'forceer').
--  - De trigger hieronder weigert een opslag van de inhoud van een
--    apparaat dat het project niet op zijn naam heeft. Ook een iPad die
--    na uren zonder bereik terugkomt, kan dus niets meer overschrijven.
--    De app van dat apparaat bewaart zijn werk dan apart (niets weg).
--  - Ook als het project VRIJ is, mag een apparaat geen oudere stand
--    terugzetten (gevonden bij de beoordeling): elke opslag krijgt een
--    volgnummer (data._rev). De app stuurt mee op welk volgnummer zijn werk
--    voortbouwt (data._basis). Bouwt het voort op een oudere stand, en heeft
--    intussen een ánder apparaat opgeslagen, dan weigert de database het; de
--    app bewaart het werk dan apart. Voorbeeld: de iPad werkte offline,
--    Julian nam het over, werkte en sloot het project (vrij). Zonder deze
--    controle zette de iPad bij terugkomst zijn oude stand over Julians werk.
--  - Apparaten op een versie van vóór v106 kennen het bewerkslot nog niet.
--    Daarvoor zorgen het versieslot (21_versieslot.sql) en het verplicht
--    bijwerken van de app. (Tekst bijgewerkt in v123; aan de werking van
--    dit script is niets veranderd, opnieuw draaien is niet nodig.)
--
--  Een aparte tabel, en niet een paar kolommen in projecten: het bijhouden
--  van "laatst actief" mag de wijzigingsdatum van het project niet
--  veranderen, en ook niet bij elke collega het hele project live
--  doorsturen.
--
--  Terugdraaien (er gaan geen gegevens verloren):
--    drop trigger if exists projecten_bewerkslot on public.projecten;
--    drop function if exists public.glas_bewerken(uuid, text, text, text, text);
--    drop function if exists public.glas_bestellingen_erbij(uuid, jsonb, jsonb, text, jsonb);
--  Dan werkt alles weer zoals in v105 (iedereen kan bewerken, wie het
--  laatst opslaat, wint), en het startscherm zegt "SQL-script 24 is nog niet
--  gedraaid". Alleen de trigger weghalen is niet genoeg: dan zet de app
--  meekijkers nog steeds op slot, maar houdt de database niets meer tegen.
--
--  Veilig om nog eens te draaien.
-- ══════════════════════════════════════════════════════════════

create table if not exists public.bewerkslot (
  project_id        uuid primary key references public.projecten(id) on delete cascade,
  apparaat          text,          -- wie het mag bewerken (code van het apparaat)
  naam              text,          -- naam van de gebruiker
  omschrijving      text,          -- 'iPad', 'Mac', 'Windows-pc', …
  sinds             timestamptz,
  gezien            timestamptz,   -- laatst actief (hartslag van de app)
  overname_apparaat text,          -- wie het wil overnemen
  overname_naam     text,
  overname_op       timestamptz
);

alter table public.bewerkslot enable row level security;
drop policy if exists bewerkslot_alles on public.bewerkslot;
create policy bewerkslot_alles on public.bewerkslot for all to authenticated using (true) with check (true);

-- Live doorsturen naar de apps (zoals 07_realtime.sql voor projecten).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bewerkslot') then
    alter publication supabase_realtime add table public.bewerkslot;
  end if;
end $$;
alter table public.bewerkslot replica identity full;

-- Alles wat de app met het slot doet, gaat via deze ene functie, zodat
-- twee apparaten die tegelijk iets doen elkaar niet in de weg zitten
-- (de rij wordt even vastgehouden). De tijd is die van de server.
--   'stand'     alleen lezen
--   'claim'     nemen als het vrij is of al van mij
--   'hartslag'  laatst actief bijwerken (alleen als het van mij is)
--   'vraag'     vrij of van mij: nemen; anders de bewerker een seintje geven
--   'forceer'   overnemen (de ander reageerde niet)
--   'vrijgeven' loslaten (alleen als het van mij is)
--   'intrekken' mijn vraag om over te nemen intrekken (Annuleren)
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
  insert into public.bewerkslot (project_id) values (p_project) on conflict (project_id) do nothing;
  select * into r from public.bewerkslot where project_id = p_project for update;
  vorige := r.naam;

  if p_actie = 'claim' or p_actie = 'vraag' then
    if r.apparaat is null or r.apparaat = p_apparaat then
      update public.bewerkslot
         set apparaat = p_apparaat, naam = p_naam, omschrijving = p_omschrijving,
             sinds = case when r.apparaat = p_apparaat then r.sinds else now() end,
             gezien = now(),
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
           sinds = now(), gezien = now(),
           overname_apparaat = null, overname_naam = null, overname_op = null
     where project_id = p_project;
  elsif p_actie = 'vrijgeven' then
    update public.bewerkslot
       set apparaat = null, naam = null, omschrijving = null, sinds = null, gezien = null
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

-- De bewaking: een opslag van de inhoud mag alleen van het apparaat dat
-- het project op zijn naam heeft. Is het vrij, dan neemt de eerste die
-- opslaat het (zo werkt ook een nieuw project, en een apparaat dat bij de
-- start geen bereik had). Daarnaast het volgnummer (zie bovenaan): geen
-- oudere stand terugzetten, ook niet in een vrij project.
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
  -- Wie het laatst opsloeg: apparaat én sessie (één keer de app laden). Per
  -- sessie, zodat ook twee tabbladen op één apparaat elkaar niet
  -- overschrijven; het slot zelf blijft per apparaat.
  schrijver text := coalesce(old.data ->> '_apparaat', '') || '/' || coalesce(old.data ->> '_sessie', '');
  ik text := coalesce(new.data ->> '_apparaat', '') || '/' || coalesce(new.data ->> '_sessie', '');
  houder text;
  houder_naam text;
begin
  if new.data is not distinct from old.data then
    return new;
  end if;
  -- Het volgnummer gaat bij elke opslag van de inhoud één omhoog, ook bij
  -- een oude app. Zo merkt een apparaat met v106 dat er iets veranderd is.
  new.data := jsonb_set(new.data, '{_rev}', to_jsonb(coalesce(rev_oud, 0) + 1));
  -- Een bestelling die alsnog in het project gezet wordt (glas_bestellingen_erbij,
  -- hieronder): die mag altijd, ook als een ander het project bewerkt.
  -- Het volgnummer blijft dan staan: de bewerker bouwt nog steeds voort op
  -- dezelfde stand (zijn volgende opslag mist de bestelling hooguit, en die
  -- zet trigger 23 terug). Anders werd zijn eigen opslag daarna geweigerd
  -- (beoordeling v106).
  if current_setting('glas.bestellingen_erbij', true) = '1' then
    new.data := jsonb_set(new.data, '{_rev}', coalesce(old.data -> '_rev', 'null'::jsonb));
    if new.data -> '_rev' = 'null'::jsonb then new.data := new.data #- '{_rev}'; end if;
    return new;
  end if;
  -- Een app van vóór v106 kent het slot niet (zie bovenaan).
  if versie < 106 or van is null or van = '' then
    return new;
  end if;
  select apparaat, naam into houder, houder_naam from public.bewerkslot where project_id = new.id for update;
  if houder is not null and houder <> van then
    -- De app herkent deze fout aan 'Bewerkslot' en bewaart zijn werk apart.
    raise exception 'Bewerkslot: % bewerkt dit project nu. Je werk blijft op dit apparaat en wordt apart bewaard.',
      coalesce(houder_naam, 'een collega')
      using errcode = 'P0001', detail = format('houder %s, dit apparaat %s', houder, van);
  end if;
  -- Bouwt dit werk voort op een oudere stand, terwijl een ander apparaat
  -- (of een ander tabblad) intussen opsloeg? Dan niet (ook niet als het
  -- project vrij is). Zonder volgnummer (werk van vóór v106 op het
  -- apparaat) telt het als ouder. Kwam de vorige opslag van deze zelfde
  -- sessie, dan is er niets van een ander tussengekomen (bijvoorbeeld: de
  -- opslag kwam aan, maar het antwoord niet).
  if rev_oud is not null and schrijver <> ik
     and (basis is null or basis !~ '^[0-9]+$' or basis::int <> rev_oud) then
    raise exception 'Bewerkslot: % heeft dit project intussen gewijzigd. Je werk blijft op dit apparaat en wordt apart bewaard.',
      coalesce(old.data ->> '_apparaatNaam', 'een collega')
      using errcode = 'P0001', detail = format('stand %s, dit werk bouwt voort op %s', rev_oud, coalesce(basis, '?'));
  end if;
  if houder is null then
    insert into public.bewerkslot (project_id, apparaat, naam, omschrijving, sinds, gezien)
    values (new.id, van, new.data ->> '_apparaatNaam', new.data ->> '_apparaatSoort', now(), now())
    on conflict (project_id) do update
      set apparaat = excluded.apparaat, naam = excluded.naam, omschrijving = excluded.omschrijving,
          sinds = now(), gezien = now();
    return new;
  end if;
  update public.bewerkslot set gezien = now() where project_id = new.id;
  return new;
end;
$$;

-- Een bestelling die nog niet in het project staat, alsnog erin zetten
-- (gevonden bij de beoordeling). Situatie: Bart kiest op de bouw zonder
-- bereik "Ja, verstuurd"; intussen neemt Kees het project over. Barts opslag
-- wordt dan geweigerd en zijn werk gaat apart, maar de bestelling moet in
-- het project, anders bestelt Kees alles nog een keer. De app voegt de
-- bestellingen samen zoals altijd (bestellingenSamenvoegen) en zet met deze
-- functie alleen het bestel-deel in het project: de lijst, wat er besteld
-- is, en de status en het slot als die daardoor omhoog gaan. Niets anders.
-- Trigger 23 zorgt er daarbij voor dat er nooit een bestelling verdwijnt.
create or replace function public.glas_bestellingen_erbij(
  p_project uuid, p_bestellingen jsonb, p_besteld jsonb, p_status text, p_slot jsonb)
returns jsonb
language plpgsql
as $$
declare
  d jsonb;
  st text;
begin
  if p_bestellingen is null or jsonb_typeof(p_bestellingen) <> 'array' then
    raise exception 'glas_bestellingen_erbij: geen lijst';
  end if;
  select data, status into d, st from public.projecten where id = p_project for update;
  if not found then
    return null;
  end if;
  d := coalesce(d, '{}'::jsonb);
  if d -> 'info' is null or jsonb_typeof(d -> 'info') <> 'object' then
    d := jsonb_set(d, '{info}', '{}'::jsonb, true);
  end if;
  d := jsonb_set(d, '{info,bestellingen}', p_bestellingen, true);
  if p_besteld is null or jsonb_typeof(p_besteld) <> 'object' then
    d := d #- '{info,besteld}';
  else
    d := jsonb_set(d, '{info,besteld}', p_besteld, true);
  end if;
  if public.glas_status_rang(p_status) > public.glas_status_rang(st) then
    st := p_status;
    d := jsonb_set(d, '{info,status}', to_jsonb(p_status), true);
    d := jsonb_set(d, '{info,slot}', coalesce(p_slot, 'null'::jsonb), true);
  end if;
  perform set_config('glas.bestellingen_erbij', '1', true);
  update public.projecten set data = d, status = st where id = p_project;
  perform set_config('glas.bestellingen_erbij', '', true);
  select data, status into d, st from public.projecten where id = p_project;
  return jsonb_build_object('rev', d -> '_rev', 'status', st,
    'aantal', jsonb_array_length(coalesce(d #> '{info,bestellingen}', '[]'::jsonb)));
end;
$$;

drop trigger if exists projecten_bewerkslot on public.projecten;
create trigger projecten_bewerkslot
  before update of data on public.projecten
  for each row execute function public.bewerkslot_bewaken();

-- ─── Controle ────────────────────────────────────────────────
-- select p.naam, s.naam as bewerker, s.omschrijving, s.gezien
--   from public.bewerkslot s join public.projecten p on p.id = s.project_id;
