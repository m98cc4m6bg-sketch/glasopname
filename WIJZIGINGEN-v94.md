# Glasopname v94 — geen fotomelding bij levering op de werkplaats

*13 oktober 2026. Gevraagd door Jan.*

## Installeren

Dit is het **complete pakket** (de hele app, alle bibliotheken, SQL en
tests), zonder `config.js`. Geen nieuw SQL-script.

1. Staat `19_originelen.sql` (v93) al in Supabase? Dan hoeft er niets. Zo
   niet: eerst dat script draaien.
2. Open de map `glasopname` uit de zip, **selecteer alles wat erín staat**
   (Cmd+A) en sleep dat naar je repomap. Kies overal *Vervang*. Sleep níet
   de map `glasopname` zelf over je repomap heen: dan is `config.js` weg.
3. Commit en push. Daarna op elk apparaat ↻ Bijwerken; linksboven staat v94.

**Let op:** de repo mist op dit moment nog de vijf bibliotheken die bij het
plaatsen van v93 wegvielen (stand 13 oktober 07:10). Dit pakket zet ze
terug; daarna is de app weer verbonden.

## Wat er verandert

* Kies je bij *Afleveren op* de **Werkplaats**, dan vraagt de controle vóór
  het exporteren (bestellijst, alles, CSV, bestelmail) niet meer om een foto
  van de leverlocatie. Niets gekozen telt als werkplaats, net als op het
  scherm.
* Op de leverpagina van de bestellijst staat bij de werkplaats zonder foto
  ook geen grijs vak meer met "Geen foto van de leverlocatie toegevoegd".
* Bij het **Werkadres** blijft alles zoals het was: zonder foto komt de
  melding, en op de leverpagina staat dat de foto ontbreekt.
* Een ontbrekende instructie voor de chauffeur wordt bij beide nog gemeld
  (keuze van Jan: die blijft ook bij de werkplaats verplicht).

## Getest

Twee keer de hele batterij, alles groen. `test-leverpagina.js` en `.py`
uitgebreid:
* werkplaats zonder foto → geen melding, pdf zonder vak over een foto;
* niets gekozen → geldt als werkplaats, geen melding;
* werkadres met adres en instructie maar zonder foto → precies één punt in
  de melding: de foto.

Verder ook getest: het complete pakket draait los in een schone map (app in
Chromium, offline opstarten, bibliotheken op hun plek).

## Niet getest

Safari op iPad/iPhone. Er is niets aan opmaak of bediening veranderd, alleen
aan wanneer de melding komt en wat er op de leverpagina staat.
