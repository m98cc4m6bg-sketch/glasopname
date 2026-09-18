-- ══════════════════════════════════════════════════════════════
--  Glasopname v76 – roeden opgeschoond, Canale mat blank erbij
--  Plak dit in Supabase → SQL Editor → Run.
--
--  Drie lijsten in app_data.glas_data worden vervangen:
--
--   • roedenverdeling — de opplakroeden zijn eruit. Die worden niet
--     besteld, en hun profielbreedtes hoorden alleen bij hen.
--   • roedenbreedte   — 28 en 38 mm waren opplakmaten en gaan eruit;
--     20 en 24 mm komen erbij voor wienersprossen. Welke breedte bij
--     welk stelsel hoort staat in naslag.js (ROEDE_BREEDTES) en bepaalt
--     wat de app in de kolom Breedte toont.
--   • glasbewerking   — Canale mat blank erbij (43 in plaats van 42).
--
--  Zonder dit script duwt de database de oude lijsten er weer in en
--  staan de opplakroeden terug in de keuzelijst.
--  Bestaande projecten houden hun waarde: een verdeling of breedte die
--  niet meer in de lijst staat blijft in de regel zichtbaar onder een
--  eigen kopje, zodat je hem zelf kunt nakijken.
-- ══════════════════════════════════════════════════════════════

update public.app_data
   set waarde = jsonb_set(
                  jsonb_set(
                    jsonb_set(waarde, '{roedenverdeling}', $$["Geen roedenverdeling","Wienersprossen - 1 kruising (+ vorm)","Wienersprossen - 2 horizontaal","Wienersprossen - 3 horizontaal","Wienersprossen - 2 verticaal","Wienersprossen - 3 verticaal","Wienersprossen - 2H x 2V (raster)","Wienersprossen - 3H x 2V (raster)","Wienersprossen - 3H x 3V (raster)","Wienersprossen - opgeven (zie opmerking)","Kruisroeden in glas","Overig (zie opmerking)"]$$::jsonb),
                    '{roedenbreedte}', $$["18 mm","20 mm","24 mm","26 mm","30 mm","45 mm","Overig (zie opmerking)"]$$::jsonb),
                  '{glasbewerking}', $$["Helder (standaard)","Figuurglas — Byzanthijn fijn blank","Figuurglas — Byzanthijn grof blank","Figuurglas — Canale blank","Figuurglas — Carre blank 13 x 13","Figuurglas — Cathedraal groot gehamerd / Brute blank","Figuurglas — Cathedraal klein Duits blank","Figuurglas — Chinchilla blank","Figuurglas — Cotswold blank","Figuurglas — Crepi blank","Figuurglas — Deltha blank","Figuurglas — Gothic blank","Figuurglas — Guss antiek blank","Figuurglas — Ijsbloemglas","Figuurglas — Jan Hagel blank","Figuurglas — Master carre","Figuurglas — Master ligne","Figuurglas — Master point","Figuurglas — Moire blank","Figuurglas — Niagara blank","Figuurglas — Nylon blank","Figuurglas — Rochelino / Alt Deutch K blank","Figuurglas — Silvit blank","Draadglas — brute","Draadglas — Engels blank","Draadglas — spiegeldraadglas","Gematteerd — Satijnglas","Gematteerd — Satijnglas extra helder","Getint — Float brons","Getint — Float dark blue","Getint — Float grijs","Getint — Float groen","Extra helder — Kristal","Spiegel — Verzilverd blank","Spiegel — Verzilverd brons","Spiegel — Verzilverd grijs","Spiegel — Verzilverd Milano","Gekleurd — Starglass donkerblauw","Gekleurd — Starglass groen","Gekleurd — Starglass oranje","Gekleurd — Starglass rood","Overig (zie opmerking)"]$$::jsonb),
       updated_at = now()
 where key = 'glas_data';

-- Controle: 12 verdelingen, 7 breedtes, 43 bewerkingen, en nergens nog
-- een opplakroede of een 28 mm.
select jsonb_array_length(waarde->'roedenverdeling') as verdelingen,
       jsonb_array_length(waarde->'roedenbreedte')   as breedtes,
       jsonb_array_length(waarde->'glasbewerking')   as bewerkingen,
       (select count(*) from jsonb_array_elements_text(waarde->'roedenverdeling') v
         where v like 'Opplak%')                     as opplakroeden,
       (select count(*) from jsonb_array_elements_text(waarde->'roedenbreedte') b
         where b in ('28 mm','38 mm'))               as opplakbreedtes
  from public.app_data
 where key = 'glas_data';
