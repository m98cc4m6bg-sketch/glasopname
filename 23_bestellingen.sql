-- ══════════════════════════════════════════════════════════════
--  Glasopname v104/v105 – een bestelling gaat nooit verloren
--  (v105: ook als je de versie van v104 al gedraaid had, deze nog eens
--  draaien; hij rekent nu met aanvullingen.)
--  Plak dit in Supabase → SQL Editor → Run. Vóór je de bestanden
--  van v104 in GitHub zet.
--
--  Sinds v104 legt de app elke bestellijst die echt naar de
--  leverancier gaat vast in data.info.bestellingen ('Ja, verstuurd',
--  of een bestelmail). Het project staat dan op 'besteld'.
--
--  Het risico: een tweede apparaat dat de bestelling nog niet kende.
--  Een iPad die offline aan hetzelfde project werkte, stuurt bij
--  terugkomst het hele project op, zonder die bestelling, met de
--  oude status en zonder slot. Dan was de bestelling weg, zonder dat
--  iemand het zag (gevonden bij de beoordeling van v104).
--
--  Deze trigger voegt samen in plaats van te overschrijven:
--  - een bestelling die in de database stond en in de nieuwe stand
--    ontbreekt, komt terug (herkend aan het tijdstip 'op');
--  - een ingetrokken versie wint van een niet-ingetrokken;
--  - de nummers worden opnieuw op volgorde van tijdstip gezet;
--  - info.besteld (de oude vorm, voor apparaten op v103) is wat er in
--    totaal besteld is: de 1e bestellijst plus de aanvullingen, min wat
--    er geannuleerd is (v105; zelfde rekensom als besteldBijwerken() in
--    de app);
--  - kwam er een geldige bestelling terug, dan zakt de status niet en
--    blijft het slot zoals het in de database stond;
--  - kende het apparaat een intrekking niet en is er geen geldige
--    bestelling meer, dan zet het de status niet terug op 'besteld'.
--  De ruiten zelf (wat het apparaat wijzigde) blijven van het
--  apparaat: die zie je in de app als 'anders dan besteld' (geel).
--
--  Veilig om nog eens te draaien.
-- ══════════════════════════════════════════════════════════════

create or replace function public.glas_status_rang(s text)
returns integer
language sql
immutable
as $$
  select case coalesce(s, '')
           when 'besteld' then 2 when 'geleverd' then 3
           when 'gemonteerd' then 4 when 'afgerond' then 5
           when 'ingemeten' then 1 when 'bezig met inmeten/verwerken' then 1
           else 0 end;
$$;

create or replace function public.bestellingen_samenvoegen()
returns trigger
language plpgsql
as $$
declare
  oud jsonb := old.data #> '{info,bestellingen}';
  nieuw jsonb := new.data #> '{info,bestellingen}';
  samen jsonb;
  laatste jsonb;
  kenmerken jsonb;
  best jsonb;
  sleutel text;
  waarde jsonb;
  aantal_besteld integer;
  ontbrak boolean;
  geldig_terug boolean;
  intrekking_onbekend boolean;
  geldig_over boolean;
begin
  if oud is null or jsonb_typeof(oud) <> 'array' or jsonb_array_length(oud) = 0 then
    return new;
  end if;
  if nieuw is null or jsonb_typeof(nieuw) <> 'array' then
    nieuw := '[]'::jsonb;
  end if;

  -- Ontbreekt er iets, of is een intrekking verloren gegaan?
  select exists (
           select 1 from jsonb_array_elements(oud) o
            where not exists (select 1 from jsonb_array_elements(nieuw) n where n ->> 'op' = o ->> 'op')
         ) or exists (
           select 1 from jsonb_array_elements(oud) o
            join jsonb_array_elements(nieuw) n on n ->> 'op' = o ->> 'op'
            where o -> 'ingetrokken' is not null and n -> 'ingetrokken' is null
         ),
         exists (
           select 1 from jsonb_array_elements(oud) o
            where o -> 'ingetrokken' is null
              and not exists (select 1 from jsonb_array_elements(nieuw) n where n ->> 'op' = o ->> 'op')
         ),
         exists (
           select 1 from jsonb_array_elements(oud) o
            join jsonb_array_elements(nieuw) n on n ->> 'op' = o ->> 'op'
            where o -> 'ingetrokken' is not null and n -> 'ingetrokken' is null
         )
    into ontbrak, geldig_terug, intrekking_onbekend;

  if not ontbrak then
    return new;
  end if;

  -- Samenvoegen: per tijdstip één; een ingetrokken versie wint, anders
  -- die van het apparaat (bron 0).
  with alle as (
    select e, 0 as bron from jsonb_array_elements(nieuw) e
    union all
    select e, 1 as bron from jsonb_array_elements(oud) e
  ), per_op as (
    select distinct on (e ->> 'op') e
      from alle
     order by e ->> 'op', (e -> 'ingetrokken' is not null) desc, bron
  ), genummerd as (
    -- Volgorde op tijdstip. De app legt nooit een tijdstip vóór een
    -- bestelling vast die hij kent (ook niet met een achterlopende klok).
    select jsonb_set(e, '{nr}', to_jsonb(row_number() over (order by e ->> 'op'))) as e,
           e ->> 'op' as op
      from per_op
  )
  select coalesce(jsonb_agg(e order by op), '[]'::jsonb) into samen from genummerd;

  if new.data -> 'info' is null or jsonb_typeof(new.data -> 'info') <> 'object' then
    new.data := jsonb_set(new.data, '{info}', '{}'::jsonb, true);
  end if;
  new.data := jsonb_set(new.data, '{info,bestellingen}', samen, true);

  -- info.besteld = wat er in totaal besteld is, in de oude vorm (v105).
  -- Per geldige bestelling op volgorde: een bestelling die geen aanvulling
  -- is, begint opnieuw; de ruiten die erop stonden komen erbij (of
  -- vervangen de eerdere); wat geannuleerd is (vervallen) gaat eraf.
  -- Daarbij de ruiten die bij de laatste bestelling bekend waren maar niet
  -- besteld (niet compleet), zoals de app dat ook doet.
  kenmerken := '{}'::jsonb;
  laatste := null;
  for best in select x from jsonb_array_elements(samen) as t(x) loop
    continue when best -> 'ingetrokken' is not null;
    if coalesce(best ->> 'soort', '') <> 'aanvulling' then
      kenmerken := '{}'::jsonb;
    end if;
    for sleutel, waarde in select key, value from jsonb_each(coalesce(best -> 'ruiten', '{}'::jsonb)) loop
      if jsonb_typeof(waarde) = 'object' then
        if coalesce((waarde ->> 'opLijst')::boolean, false) then
          kenmerken := kenmerken || jsonb_build_object(sleutel, waarde -> 'k');
        end if;
      else
        kenmerken := kenmerken || jsonb_build_object(sleutel, waarde);
      end if;
    end loop;
    for sleutel in select jsonb_object_keys(coalesce(best -> 'vervallen', '{}'::jsonb)) loop
      kenmerken := kenmerken - sleutel;
    end loop;
    laatste := best;
  end loop;
  geldig_over := laatste is not null;
  if laatste is not null then
    select count(*) into aantal_besteld from jsonb_object_keys(kenmerken);
    -- Bekend maar niet besteld (uit de laatste bestelling), zonder iets
    -- te overschrijven dat wel besteld is.
    for sleutel, waarde in select key, value from jsonb_each(coalesce(laatste -> 'ruiten', '{}'::jsonb)) loop
      if jsonb_typeof(waarde) = 'object' and not coalesce((waarde ->> 'opLijst')::boolean, false)
         and not kenmerken ? sleutel then
        kenmerken := kenmerken || jsonb_build_object(sleutel, waarde -> 'k');
      end if;
    end loop;
    new.data := jsonb_set(new.data, '{info,besteld}',
      jsonb_build_object('op', laatste -> 'op', 'door', coalesce(laatste -> 'door', '""'::jsonb),
                         'aantal', aantal_besteld,
                         'ruiten', kenmerken), true);
  else
    new.data := new.data #- '{info,besteld}';
  end if;

  -- Een apparaat dat een bestelling niet kende: zijn status en slot zijn
  -- van daarvóór. Status niet laten zakken, en het slot van de database
  -- houden (anders gaat een project na 'Ja' weer open).
  if geldig_terug then
    if public.glas_status_rang(new.status) < public.glas_status_rang(old.status) then
      new.status := old.status;
      new.data := jsonb_set(new.data, '{info,status}', to_jsonb(old.status), true);
    end if;
    new.data := jsonb_set(new.data, '{info,slot}', coalesce(old.data #> '{info,slot}', 'null'::jsonb), true);
  end if;

  -- Een apparaat dat een intrekking niet kende, mag het project niet weer
  -- op 'besteld' zetten als er geen geldige bestelling meer is.
  if intrekking_onbekend and not geldig_over
     and public.glas_status_rang(old.status) < 2 and public.glas_status_rang(new.status) >= 2 then
    new.status := old.status;
    new.data := jsonb_set(new.data, '{info,status}', to_jsonb(old.status), true);
    new.data := jsonb_set(new.data, '{info,slot}', coalesce(old.data #> '{info,slot}', 'null'::jsonb), true);
  end if;

  return new;
end;
$$;

drop trigger if exists projecten_bestellingen_samenvoegen on public.projecten;
create trigger projecten_bestellingen_samenvoegen
  before update of data on public.projecten
  for each row execute function public.bestellingen_samenvoegen();

-- ─── Controle ────────────────────────────────────────────────
-- select naam, jsonb_array_length(data #> '{info,bestellingen}') as bestellingen, status
--   from public.projecten where data #> '{info,bestellingen}' is not null;
