-- ══════════════════════════════════════════════════════════════
--  Glasopname v63 – keuzelijst Glasbewerking vervangen
--  Plak dit in Supabase → SQL Editor → Run.
--
--  Waarom dit moet: cloud.js haalt de keuzelijsten uit app_data en die
--  overschrijven wat er in index.html staat. Zonder dit script blijft de
--  app de oude lijst van 21 waarden tonen, hoe vaak je index.html ook
--  ververst.
--
--  Alleen de sleutel 'glasbewerking' wordt vervangen; de rest van
--  glas_data (opbouw, lookup, roosters, RAL, roeden) blijft ongemoeid.
--  Bron van de lijst: online showroom Van Noordenne, 15 september 2026.
-- ══════════════════════════════════════════════════════════════

update public.app_data
   set waarde = jsonb_set(waarde, '{glasbewerking}', $$["Helder (standaard)","Figuurglas — Byzanthijn fijn blank (4 mm)","Figuurglas — Byzanthijn grof blank (4 mm)","Figuurglas — Canale blank (4 mm)","Figuurglas — Carre blank 13 x 13 (4/5 mm)","Figuurglas — Cathedraal groot gehamerd / Brute blank (4/6 mm)","Figuurglas — Cathedraal klein Duits blank (4 mm)","Figuurglas — Chinchilla blank (4 mm)","Figuurglas — Cotswold blank (4 mm)","Figuurglas — Crepi blank (4/6/8/10 mm)","Figuurglas — Deltha blank (4 mm)","Figuurglas — Gothic blank (4 mm)","Figuurglas — Guss antiek blank (4 mm)","Figuurglas — Ijsbloemglas (4 mm)","Figuurglas — Jan Hagel blank (4 mm)","Figuurglas — Master carre (4/6 mm)","Figuurglas — Master ligne (4 mm)","Figuurglas — Master point (4/6 mm)","Figuurglas — Moire blank (4 mm)","Figuurglas — Niagara blank (5 mm)","Figuurglas — Nylon blank (4 mm)","Figuurglas — Rochelino / Alt Deutch K blank (4 mm)","Figuurglas — Silvit blank (4 mm)","Draadglas — brute (6 mm)","Draadglas — Engels blank (6 mm)","Draadglas — spiegeldraadglas (7 mm)","Gematteerd — Satijnglas (4/5/6/8/10/12 mm)","Gematteerd — Satijnglas extra helder (6/8/10 mm)","Getint — Float brons (4/6/8/10 mm)","Getint — Float dark blue (6/8/10 mm)","Getint — Float grijs (4/6/8/10/12 mm)","Getint — Float groen (4/6/8/10 mm)","Extra helder — Kristal (4/5/6/8/10/12/15/19 mm)","Spiegel — Verzilverd blank (3/4/5/6/8 mm)","Spiegel — Verzilverd brons (4/6 mm)","Spiegel — Verzilverd grijs (4/6 mm)","Spiegel — Verzilverd Milano (4 mm)","Gekleurd — Starglass donkerblauw (3 mm)","Gekleurd — Starglass groen (3 mm)","Gekleurd — Starglass oranje (3 mm)","Gekleurd — Starglass rood (3 mm)","Overig (zie opmerking)"]$$::jsonb),
       updated_at = now()
 where key = 'glas_data';

-- Controle: hoort 42 te geven.
select jsonb_array_length(waarde->'glasbewerking') as aantal_opties
  from public.app_data
 where key = 'glas_data';
