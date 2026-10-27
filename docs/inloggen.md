# Inloggen, wachtwoord en herstellink

*Onderdeel van Glasopname. Lees dit alleen als je wens dit onderdeel raakt. Verhuisd uit `CLAUDE.md` op 27-10-2026 (stap 1 van de strategie); het verhaal achter een fout staat in het bugboek in de projectkennis (`claude/BUGBOEK.md`).*

**Wat het doet.** Het inlogformulier (wachtwoord bewaren in de browser), "Wachtwoord vergeten?" (alleen een melding) en het venster "Kies een nieuw wachtwoord" na een herstellink van Jan.

**Bestanden.** `cloud.js` (`cloudLoginVerstuur`, `wachtwoordAanbieden`, `leesHerstelLink`, `herstelSessie`, `herstelOpslaan`), `leeg.html`.

## Valkuilen

* Inloggen is een echt `<form>` (`cloudLoginVerstuur`,
  `wachtwoordAanbieden`): geen eigen Enter-afhandeling erbij. Het "verstuurt"
  na een geslaagde inlog naar `leeg.html` (https, eigen site; `about:blank`
  gaf in Safari een waarschuwing, v109) in een kader met `sandbox`. De
  velden hebben bewust **geen `name`**: anders staan e-mail en wachtwoord in
  het adres (GET). Elke knop in zo'n formulier die niet inlogt: `type="button"`.

* Een herstellink (v109): `leesHerstelLink()` leest het adres vóór
  `createClient` en haalt het leeg met `replaceState`; de bibliotheek leest
  het adres NIET zelf (`detectSessionInUrl: false`, anders komt de code via
  de terug-knop terug). `herstelSessie()` zet de sessie. Het venster
  `#cloudHerstel` komt terug (herladen, nieuw tabblad) via localStorage
  `glasopname_herstel` = id van de gebruiker; een gewone inlog wist die vlag.
  `same_password` van Supabase = gelukt (het getypte wachtwoord IS het
  wachtwoord).

## Het verhaal erbij

* **Het formulier** (v108/v109, bugboek, valkuilen 21 en 23): voeg geen eigen Enter-afhandeling toe; de eerste verzending houdt `cloudLoginVerstuur` tegen, pas na een geslaagde inlog volgt de echte (naar het verborgen kader) of `PasswordCredential`. De gedeelde vlag heet `echtVersturen` (ook voor het herstelformulier). Het formulier is `method="get"`: een veld mét naam zou e-mail en wachtwoord in het adres zetten (logboeken van GitHub, cache van de service worker). GitHub Pages weigert `post` (405). `about:blank` als doel gaf in Safari "niet beveiligd". Het kader heeft `sandbox`. `minlength` op een wachtwoordveld niet gebruiken: de browser houdt het formulier dan tegen vóór de app iets zegt.

* **De herstellink** (v109, bugboek valkuil 24): de bibliotheek (impliciete flow) zou `#access_token=…` zelf lezen en `location.hash = ''` zetten; dat is een nieuwe stap in de geschiedenis, en met de terug-knop stond de code weer in het adres. `herstelSessie()` zet de sessie met `setSession` (die leest de vervaltijd uit het token: het moet een JWT zijn, ook in tests). Er komt daardoor geen seintje `PASSWORD_RECOVERY` meer (wel `SIGNED_IN`). Andere links van Supabase (uitnodiging, magische link) moeten dan ook via `leesHerstelLink`.

* **Wat de browser zelf toont** (de vraag "Wachtwoord bewaren?", een Safari-waarschuwing) ziet geen test hier. Zeg dan uitdrukkelijk dat Jans proef op het echte apparaat beslist, en beschrijf die proef concreet (les van v108 → v109).
