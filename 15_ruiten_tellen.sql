-- ══════════════════════════════════════════════════════════════
--  Glasopname v89 – het aantal ruiten per project opnieuw tellen
--
--  De projectenlijst telde regels in plaats van ruiten: een regel met
--  Aantal 4 kwam er als één ruit in te staan. De app telt het vanaf v89
--  goed, maar bestaande projecten houden hun oude getal tot er weer in
--  opgeslagen wordt. Dit script zet ze allemaal in één keer goed.
--
--  Plak dit in Supabase → SQL Editor → Run. Eén keer draaien, mag
--  zo vaak als je wilt. Het raakt alleen de kolom `aantal_ruiten`; aan
--  de opname zelf verandert niets.
--
--  Let op: dit werkt de projectrijen bij, dus de trigger van het logboek
--  komt langs. Er staat dan één regel per project in het logboek met de
--  laatste samenvatting die er al stond; dat is geen wijziging aan de
--  maten.
-- ══════════════════════════════════════════════════════════════

update public.projecten p
   set aantal_ruiten = coalesce((
     select sum(
              greatest(
                coalesce(
                  nullif(regexp_replace(coalesce(r ->> 'aantal', ''), '[^0-9]', '', 'g'), '')::int,
                  1),
                1)
            )
       from jsonb_array_elements(coalesce(p.data -> 'rijen', '[]'::jsonb)) as r
      where coalesce(r ->> 'glasType', '') <> ''
         or coalesce(r ->> 'breedte',  '') <> ''
         or coalesce(r ->> 'hoogte',   '') <> ''
   ), 0);

-- Controle: posities (regels) naast ruiten (som van Aantal).
-- select naam, aantal_ruiten,
--        (select count(*) from jsonb_array_elements(coalesce(data -> 'rijen', '[]'::jsonb)) r
--          where coalesce(r ->> 'breedte', '') <> '' or coalesce(r ->> 'hoogte', '') <> '') as posities
--   from public.projecten order by updated_at desc;
