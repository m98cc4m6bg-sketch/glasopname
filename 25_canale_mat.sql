-- ══════════════════════════════════════════════════════════════
--  Glasopname v109 – "Figuurglas — Canale mat blank" alsnog in de
--  keuzelijst Glasbewerking in de database
--
--  Waarom: script 12 (v76) beloofde deze optie als 43e bewerking, maar de
--  lijst in dat script had er 42, zonder Canale mat blank. De app ziet een
--  lijst zonder deze optie als "oud" (cloud.js, oudeBewerkingslijst) en
--  gebruikt dan zijn eigen lijst uit index.html. Dat ging goed, maar had
--  een verborgen gevolg: een wijziging van de bewerkingen in de database
--  werd genegeerd. Na dit script haalt de app de lijst weer uit de
--  database, zoals bedoeld. Voor de gebruiker verandert er niets: de lijst
--  is daarna precies dezelfde als die de app nu al laat zien.
--
--  Wat het doet: alleen de sleutel 'glasbewerking' in app_data.glas_data.
--  Ontbreekt "Figuurglas — Canale mat blank", dan komt hij direct na
--  "Figuurglas — Canale blank" (zoals in de app). Staat hij er al, dan
--  gebeurt er niets. Mag dus vaker gedraaid worden.
--  Let op de schrijfwijze: zonder accent op de e, met een lang streepje
--  (—), precies zoals in de app en in de bestaande projecten.
--
--  Draaien: Supabase → SQL Editor → plakken → Run.
--  Terugdraaien is niet nodig (de app had deze optie al).
-- ══════════════════════════════════════════════════════════════

update public.app_data
   set waarde = jsonb_set(
         waarde,
         '{glasbewerking}',
         (select jsonb_agg(x.e order by x.o)
            from (
              -- de bestaande opties, in hun volgorde
              select t.e, t.o::numeric as o
                from jsonb_array_elements(waarde->'glasbewerking') with ordinality as t(e, o)
              union all
              -- Canale mat blank, direct na Canale blank (of achteraan als
              -- die er onverhoopt niet in staat)
              select to_jsonb('Figuurglas — Canale mat blank'::text),
                     coalesce((select c.o + 0.5
                                 from jsonb_array_elements_text(waarde->'glasbewerking') with ordinality as c(e, o)
                                where c.e = 'Figuurglas — Canale blank'
                                limit 1),
                              1000000)
            ) x))
 where key = 'glas_data'
   and jsonb_typeof(waarde->'glasbewerking') = 'array'
   and not (waarde->'glasbewerking' ? 'Figuurglas — Canale mat blank');

-- Controle: verwacht 43 opties, en Canale mat blank op plek 5 (na Helder,
-- Byzanthijn fijn, Byzanthijn grof en Canale blank).
select jsonb_array_length(waarde->'glasbewerking') as aantal_opties,
       (select c.o from jsonb_array_elements_text(waarde->'glasbewerking') with ordinality as c(e, o)
         where c.e = 'Figuurglas — Canale mat blank') as plek_canale_mat
  from public.app_data
 where key = 'glas_data';
