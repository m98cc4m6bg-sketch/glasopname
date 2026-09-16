-- ══════════════════════════════════════════════════════════════
--  Glasopname v73 – Glasbewerking: de maten uit de namen
--  Plak dit in Supabase → SQL Editor → Run.
--
--  Waarom dit moet: cloud.js haalt de keuzelijsten uit app_data en die
--  overschrijven wat er in index.html staat. Zonder dit script blijft de
--  app de lijst mét maten tonen ('Satijnglas (4/5/6/8/10/12 mm)'), hoe
--  vaak je index.html ook ververst — en dan komen die maten ook weer op
--  de bestellijst terecht.
--
--  De maten zijn niet verdwenen: ze staan in naslag.js bij de catalogus
--  en worden gebruikt om te controleren of een bewerking in de gekozen
--  opbouw kán zitten. Alleen de naam is opgeschoond.
--
--  Alleen de sleutel 'glasbewerking' wordt vervangen; de rest van
--  glas_data (opbouw, lookup, roosters, RAL, roeden) blijft ongemoeid.
--  Bestaande projecten worden door de app zelf omgezet bij het openen.
-- ══════════════════════════════════════════════════════════════

update public.app_data
   set waarde = jsonb_set(waarde, '{glasbewerking}', $$["Helder (standaard)","Figuurglas — Byzanthijn fijn blank","Figuurglas — Byzanthijn grof blank","Figuurglas — Canale blank","Figuurglas — Carre blank 13 x 13","Figuurglas — Cathedraal groot gehamerd / Brute blank","Figuurglas — Cathedraal klein Duits blank","Figuurglas — Chinchilla blank","Figuurglas — Cotswold blank","Figuurglas — Crepi blank","Figuurglas — Deltha blank","Figuurglas — Gothic blank","Figuurglas — Guss antiek blank","Figuurglas — Ijsbloemglas","Figuurglas — Jan Hagel blank","Figuurglas — Master carre","Figuurglas — Master ligne","Figuurglas — Master point","Figuurglas — Moire blank","Figuurglas — Niagara blank","Figuurglas — Nylon blank","Figuurglas — Rochelino / Alt Deutch K blank","Figuurglas — Silvit blank","Draadglas — brute","Draadglas — Engels blank","Draadglas — spiegeldraadglas","Gematteerd — Satijnglas","Gematteerd — Satijnglas extra helder","Getint — Float brons","Getint — Float dark blue","Getint — Float grijs","Getint — Float groen","Extra helder — Kristal","Spiegel — Verzilverd blank","Spiegel — Verzilverd brons","Spiegel — Verzilverd grijs","Spiegel — Verzilverd Milano","Gekleurd — Starglass donkerblauw","Gekleurd — Starglass groen","Gekleurd — Starglass oranje","Gekleurd — Starglass rood","Overig (zie opmerking)"]$$::jsonb),
       updated_at = now()
 where key = 'glas_data';

-- Controle: hoort 42 te geven, en geen enkele naam mag nog 'mm)' bevatten.
select jsonb_array_length(waarde->'glasbewerking') as aantal_opties,
       (select count(*) from jsonb_array_elements_text(waarde->'glasbewerking') b
         where b like '%mm)') as namen_met_maat
  from public.app_data
 where key = 'glas_data';
