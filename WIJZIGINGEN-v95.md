# Glasopname v95 — taken en logboek van het vorige project

*13 oktober 2026. Gemeld door Jan: bij het openen van een nieuw project
stond het logboek van het vorige project er nog.*

## Installeren

Dit is het **complete pakket** (de hele app, alle bibliotheken, SQL en
tests), zonder `config.js`. Geen nieuw SQL-script.

1. Open de map `glasopname` uit de zip, **selecteer alles wat erín staat**
   (Cmd+A) en sleep dat naar je repomap. Kies overal *Vervang*. Sleep níet
   de map `glasopname` zelf over je repomap heen: dan is `config.js` weg.
2. Commit en push. Daarna op elk apparaat ↻ Bijwerken; linksboven staat v95.

v94 (geen fotomelding bij de werkplaats) zit hier ook in. Heb je v94 nog
niet geplaatst, dan is dit pakket genoeg.

## Wat er misging

Taken en logboek worden apart opgehaald, niet met de rest van het project.
Bij het **openen van een bestaand project** gebeurde dat wel, maar bij een
**nieuw project** niet. Het scherm liet dan de lijsten van het vorige
project zien, tot er toevallig iets ververste: een bewerking, of het
tabblad Project info opnieuw openen.

Bij het logboek was dat alleen verwarrend. Bij de **taken** was het erger:
een taak van het vorige project die zo op het scherm stond, kon je
aanvinken of verwijderen, en die wijziging kwam dan in het vorige project
terecht.

## Wat er nu gebeurt

* Taken en logboek worden opnieuw opgehaald **bij elke projectwissel**,
  langs welke weg ook: nieuw project, bestaand project openen, of opstarten
  met werk dat nog openstond. Geregeld op één plek (`renderProject`), zodat
  een nieuwe weg het niet kan vergeten.
* Komt het antwoord van de server binnen nadat je al een ander project hebt
  geopend (traag 4G), dan wordt het niet meer getoond.
* Tijdens het ophalen staan de oude taken er niet meer.

## Getest

Twee keer de hele batterij, alles groen. Nieuw in `test-v93.js` (§10), in
Chromium met het echte venster:
* project 1 openen met een logboekregel en een taak;
* via *Nieuw project* een project aanmaken;
* logboek en taken zijn leeg, de regels van project 1 staan er niet;
* terug naar project 1: logboek en taak zijn er weer.

Met de code van v94 faalt deze test op precies jouw melding (logboek én
taak van het vorige project zichtbaar).

## Niet getest

Safari op iPad/iPhone. Het gaat om wanneer de lijsten opgehaald worden, niet
om opmaak of bediening.
