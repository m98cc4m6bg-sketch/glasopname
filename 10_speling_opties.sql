-- ══════════════════════════════════════════════════════════════
--  Glasopname v68 – speling 2 en 3 mm erbij
--  Plak dit in Supabase → SQL Editor → Run.
--
--  Waarom dit moet: cloud.js haalt de keuzelijsten uit app_data en die
--  overschrijven wat er in index.html staat. Zonder dit script beginnen
--  de lijstjes in de app weer bij 4 mm.
--
--  De lijst geldt voor speling, bijtelling én de kolom Correctie.
-- ══════════════════════════════════════════════════════════════

update public.app_data
   set waarde = jsonb_set(waarde, '{speling_opties}',
         $$["2 mm","3 mm","4 mm","5 mm","6 mm","7 mm","8 mm","9 mm","10 mm","11 mm","12 mm","13 mm","14 mm","15 mm","16 mm","17 mm","18 mm","19 mm","20 mm","21 mm","22 mm","23 mm","24 mm","25 mm"]$$::jsonb),
       updated_at = now()
 where key = 'glas_data';

-- Controle: hoort 24 te geven, en de eerste waarde is 2 mm.
select jsonb_array_length(waarde->'speling_opties') as aantal,
       waarde->'speling_opties'->>0 as eerste
  from public.app_data
 where key = 'glas_data';
