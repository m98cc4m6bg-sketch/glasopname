-- ══════════════════════════════════════════════════════════════
--  Glasopname v93 – ruimte voor de originele foto's
--  Plak dit in Supabase → SQL Editor → Run. Vóór je de bestanden
--  van v93 in GitHub zet.
--
--  Waarom: sinds v93 bewaart de app bij elke foto ook het origineel,
--  zoals het van de camera kwam, in <project>/origineel/. De opslagmap
--  'projectfotos' nam tot nu toe alleen bestanden tot 8 MB aan, en
--  alleen jpg, png en webp (04_projectfotos.sql). Een foto van een
--  nieuwe iPhone is al snel groter, en kan een HEIC-bestand zijn.
--
--  Dit script:
--    • zet de grens per bestand op 50 MB — het maximum van het gratis
--      plan van Supabase;
--    • laat naast jpg, png en webp ook heic, heif, avif, gif en tiff
--      toe.
--  Verder verandert er niets: de map blijft privé, en de toegangsregels
--  (alleen wie ingelogd is) blijven zoals ze zijn.
--
--  Let op de ruimte: het gratis plan heeft 1 GB opslag in totaal. Bij
--  3 à 5 MB per origineel zijn dat een paar honderd foto's, en daar
--  gaan de verkleinde foto's nog vanaf. Kijk af en toe in Supabase →
--  Storage (of Settings → Usage) hoe vol het is.
--
--  Niet gedraaid? Dan werkt de app gewoon; alleen worden de originelen
--  die te groot of van een ander soort zijn geweigerd. Ze blijven dan
--  op het apparaat in de wachtrij staan (rode teller bovenaan), en gaan
--  alsnog mee zodra dit script gedraaid is en de app opnieuw start.
--
--  Veilig om nog eens te draaien.
-- ══════════════════════════════════════════════════════════════

update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp',
                                  'image/heic', 'image/heif', 'image/avif',
                                  'image/gif', 'image/tiff']
 where id = 'projectfotos';

-- Controle: hoort één regel te geven, met public = false, 52428800 en
-- acht soorten bestanden.
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
 where id = 'projectfotos';
