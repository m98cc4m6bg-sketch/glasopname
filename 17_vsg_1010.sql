-- ══════════════════════════════════════════════════════════════
--  Glasopname v91 – dikte en gewicht van VSG 10.10.x
--  Plak dit in Supabase → SQL Editor → Run.
--
--  Waarom: in de diktetabel (glas_data → lookup) stonden drie opbouwen
--  op 2 mm en 5 kg/m² in plaats van 20 mm en 50 kg/m²:
--    Gelaagd glas (VSG)        | 1010.2
--    Gehard gelaagd (ESG+VSG)  | 1010.2 ESG
--    Gehard gelaagd (ESG+VSG)  | 1010.4 ESG
--  Daardoor kwam zo'n ruit tien keer te licht in de samenvatting en de
--  pdf, en gaf de roostercontrole een valse waarschuwing.
--
--  De app (v91) zet deze drie zelf goed als de database nog de oude
--  waarde heeft, en zegt dat in de console. Met dit script is dat
--  vangnet niet meer nodig. Alleen deze drie sleutels worden geraakt;
--  de rest van glas_data blijft ongemoeid. Veilig om nog eens te draaien.
-- ══════════════════════════════════════════════════════════════

update public.app_data
   set waarde = jsonb_set(jsonb_set(jsonb_set(waarde,
         '{lookup,Gelaagd glas (VSG)|1010.2}',
         '{"glasOnly": 20, "totaal": 20, "kg_m2": 50}'::jsonb, true),
         '{lookup,Gehard gelaagd (ESG+VSG)|1010.2 ESG}',
         '{"glasOnly": 20, "totaal": 20, "kg_m2": 50}'::jsonb, true),
         '{lookup,Gehard gelaagd (ESG+VSG)|1010.4 ESG}',
         '{"glasOnly": 20, "totaal": 20, "kg_m2": 50}'::jsonb, true),
       updated_at = now()
 where key = 'glas_data'
   and waarde ? 'lookup';

-- Controle: hoort drie keer 20 · 50 te geven.
select s.sleutel,
       waarde->'lookup'->s.sleutel->>'totaal' as dikte_mm,
       waarde->'lookup'->s.sleutel->>'kg_m2'  as kg_per_m2
  from public.app_data,
       (values ('Gelaagd glas (VSG)|1010.2'),
               ('Gehard gelaagd (ESG+VSG)|1010.2 ESG'),
               ('Gehard gelaagd (ESG+VSG)|1010.4 ESG')) as s(sleutel)
 where key = 'glas_data';
