-- ═══════════════════════════════════════════════════════════════════
-- 27_alleen_lezen_en_nummering.sql — Glasopname v122 (24-10-2026)
--
-- Draaien in Supabase: SQL Editor → New query → dit hele bestand plakken
-- → Run. Nog een keer draaien kan geen kwaad. Hoort na script 26.
--
-- Wat het doet, in gewone woorden:
--  1. Een account kan op "alleen lezen" staan (kolom alleen_lezen in
--     gebruikers). Zo'n account kan alles zien wat een collega ziet, maar
--     niets toevoegen, wijzigen of weggooien: niet in de tabellen en niet
--     in de foto's. Bedoeld voor de automatische back-up.
--     Aanzetten (na het aanmaken van het account in Supabase):
--       update public.gebruikers set alleen_lezen = true
--        where email = 'backup@…';
--     Gewone collega's merken niets: voor hen staat het op false.
--  2. De nummering van de bestellingen. Mist een apparaat een bestelling,
--     dan voegt de database ze samen en nummert opnieuw. Een ingetrokken
--     lijst telt daarbij nu niet meer mee, net als in de app (v120).
--
-- Terugdraaien: 27_terug.sql (in de zip "niet-in-repo" en de
-- projectkennis).
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Alleen lezen ───────────────────────────────────────────────
alter table public.gebruikers add column if not exists alleen_lezen boolean not null default false;
-- Een gebruiker kan dit niet zelf veranderen: na script 26 mag de app in
-- gebruikers alleen naam en telefoon wijzigen.

create or replace function public.mag_schrijven()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not coalesce((select g.alleen_lezen from public.gebruikers g
                        where g.id = (select auth.uid())), false);
$$;
revoke all on function public.mag_schrijven() from public, anon;
grant execute on function public.mag_schrijven() to authenticated;

-- Een "restrictive" regel komt bovenop de bestaande regels (en vervangt
-- ze niet): schrijven mag alleen als de bestaande regels het toestaan én
-- het account niet op alleen lezen staat. De bestaande regels blijven
-- precies zoals script 26 ze zette.
do $$
declare
  t text;
begin
  foreach t in array array['projecten', 'app_data', 'taken', 'projectgeschiedenis',
                           'gebruikers', 'mailadressen', 'mailverzonden', 'bewerkslot']
  loop
    execute format('drop policy if exists alleen_lezen_toevoegen on public.%I', t);
    execute format('drop policy if exists alleen_lezen_wijzigen on public.%I', t);
    execute format('drop policy if exists alleen_lezen_weggooien on public.%I', t);
    execute format('create policy alleen_lezen_toevoegen on public.%I as restrictive for insert to authenticated with check ((select public.mag_schrijven()))', t);
    execute format('create policy alleen_lezen_wijzigen on public.%I as restrictive for update to authenticated using ((select public.mag_schrijven())) with check ((select public.mag_schrijven()))', t);
    execute format('create policy alleen_lezen_weggooien on public.%I as restrictive for delete to authenticated using ((select public.mag_schrijven()))', t);
  end loop;
end $$;

-- De foto's (alleen de map van de app; andere opslagmappen blijven zoals ze zijn).
drop policy if exists projectfotos_alleen_lezen_toevoegen on storage.objects;
drop policy if exists projectfotos_alleen_lezen_wijzigen on storage.objects;
drop policy if exists projectfotos_alleen_lezen_weggooien on storage.objects;
create policy projectfotos_alleen_lezen_toevoegen on storage.objects as restrictive
  for insert to authenticated
  with check (bucket_id <> 'projectfotos' or (select public.mag_schrijven()));
create policy projectfotos_alleen_lezen_wijzigen on storage.objects as restrictive
  for update to authenticated
  using (bucket_id <> 'projectfotos' or (select public.mag_schrijven()))
  with check (bucket_id <> 'projectfotos' or (select public.mag_schrijven()));
create policy projectfotos_alleen_lezen_weggooien on storage.objects as restrictive
  for delete to authenticated
  using (bucket_id <> 'projectfotos' or (select public.mag_schrijven()));

-- ─── 2. Nummering na samenvoegen (gelijk aan de app) ───────────────
-- De functie uit script 23, met alleen het nummeren anders.
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
  hoogste integer;
  eigen_nr integer;
  nr integer;
  genummerd jsonb;
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
  )
  select coalesce(jsonb_agg(e order by e ->> 'op'), '[]'::jsonb) into samen from per_op;

  -- v122 (script 27, akkoord Jan 22-10): nummeren zoals de app sinds v120
  -- (bestellingenSamenvoegen in index.html). Volgorde op tijdstip; een
  -- ingetrokken lijst telt niet mee en houdt zijn eigen nummer; een geldige
  -- krijgt het volgende nummer, maar nooit lager dan wat hij al had (de
  -- leverancier kreeg dat nummer). Tot script 27 telde de database de
  -- ingetrokken lijsten wel mee: dan heette de "2e" van de leverancier
  -- hier na het samenvoegen de "3e".
  hoogste := 0;
  genummerd := '[]'::jsonb;
  for best in select x from jsonb_array_elements(samen) as t(x) loop
    eigen_nr := case when jsonb_typeof(best -> 'nr') = 'number'
                     then floor((best ->> 'nr')::numeric)::integer else 0 end;
    if best -> 'ingetrokken' is not null then
      nr := case when eigen_nr > 0 then eigen_nr else hoogste + 1 end;
    else
      nr := greatest(hoogste + 1, eigen_nr);
      hoogste := nr;
    end if;
    genummerd := genummerd || jsonb_build_array(jsonb_set(best, '{nr}', to_jsonb(nr)));
  end loop;
  samen := genummerd;

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


-- De trigger zelf blijft die van script 23 (projecten_bestellingen_samenvoegen).

-- ─── Controle ──────────────────────────────────────────────────────
-- Wie staat op alleen lezen? (meestal alleen het back-upaccount)
select email, actief, alleen_lezen from public.gebruikers order by alleen_lezen desc, email;
