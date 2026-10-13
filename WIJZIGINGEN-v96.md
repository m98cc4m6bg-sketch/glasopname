# Glasopname v96 — opbouwlijsten opgeschoond

*13 oktober 2026. Keuzes van Jan, na het onderzoek naar opbouw en
coating (`ONDERZOEK-opbouw-en-grenzen.md`).*

## Installeren — in deze volgorde

1. **Eerst SQL:** Supabase → SQL Editor, plak `20_opbouwlijsten.sql`,
   *Run*. Onderaan staat per glastype het aantal opbouwen. Was de lijst in
   de database gelijk aan die van de app, dan: HR glas 32, HR+ glas 30,
   HR++ glas 45, HR+++ glas (Triple) 70, Zonwerend glas 50, de rest
   ongewijzigd. Veilig om nog eens te draaien.
2. **Dan de bestanden:** dit is het **complete pakket**, zonder
   `config.js`. Open de map `glasopname` uit de zip, druk eerst op
   **Cmd+Shift+.** (dan zie je ook de verborgen bestanden), selecteer alles
   wat erín staat en sleep het naar je repomap. Kies overal *Vervang*. Sleep
   níet de map `glasopname` zelf over je repomap heen.
3. Commit en push, daarna op elk apparaat ↻ Bijwerken; linksboven staat v96.

Vergeet je het script, dan gebruikt de app tot die tijd zijn eigen
(nieuwe) lijst en meldt hij in de console dat het script nog moet.

## Uitgangspunt

Jullie lezen een opbouw **van binnen naar buiten**: in 4-13-5 is de 4 het
binnenblad met de HR-coating, de 5 het buitenblad. Dat is ook de gangbare
praktijk: dun gecoat blad binnen, dikker blad buiten.

## Wat er verandert

Alleen bij opbouwen die buiten én binnen floatglas zijn. **Gelaagd glas
blijft ongemoeid:** daar betekent de richting iets (gelaagd binnen voor
letsel- of doorvalveiligheid, buiten voor inbraak).

| Glastype | Was | Wordt | Wat |
|---|---|---|---|
| HR++ glas | 67 | 45 | 15 dubbelen weg (5-13-4 = 4-13-5 enz.), 15 omgedraaid (8-13-4 → 4-13-8, 10-14-6 → 6-14-10 …), 7 met spouw 18/20/24 weg |
| HR+++ glas (Triple) | 432 | 70 | 180 dubbelen weg; daarna alleen spouwen vanaf 9 mm (spouw 8 is geen HR+++) en alleen middenblad 4 mm |
| HR+ glas | 34 | 30 | 4 dubbelen weg, 14 omgedraaid |
| HR glas | 32 | 32 | 17 omgedraaid, geen dubbelen |
| Zonwerend glas | 50 | 50 | 13 omgedraaid (6-13-4 ZW → 4-13-6 ZW …), geen dubbelen |
| Gelaagd, gehard gelaagd, akoestisch, enkel, gehard | — | ongewijzigd | |

* **Omdraaien** bewaart de combinatie, alleen in jullie leesrichting.
  Dikte en gewicht van de omgedraaide naam zijn gelijk aan die van de oude.
* **Spouw boven 16 mm bij HR++**: afstandhouders bestaan tot 24 mm, dus
  leverbaar is het wel, maar het is geen standaard en de isolatie wordt
  slechter (Saint-Gobain: U 1,0 bij 16 mm, 1,1 bij 20 mm). Glaskoning
  levert maximaal 16.
* De lijsten staan nu geordend: eerst op de bladen, dan op de spouw.

## Bestaande projecten

Die blijven precies zoals ze zijn. Staat er in een project een opbouw die
uit de lijst ging (bijvoorbeeld 5-13-4), dan blijft die staan en staat hij
als oude waarde onderaan de keuzelijst. Dikte en gewicht kloppen nog, want
de oude namen blijven in de diktetabel. Bij een import komt een onbekende
opbouw zoals altijd in de opmerking.

## Getest

Twee keer de hele batterij, alles groen, en `test-sql.sql` twee keer tegen
een echte PostgreSQL 16.
* **Het script tegen de echte lijst:** de lijst van v95 in een lege
  database, het script twee keer gedraaid, de uitkomst vergeleken met de
  nieuwe lijst in de app: alle tien glastypen gelijk, ook de volgorde; de
  diktetabel 887 sleutels, waarden gelijk.
* `test-sql.sql` §17: dubbelen, omdraaien (met dikte), spouw > 16, triple,
  gelaagd ongemoeid, zonwerend, ander type ongemoeid, twee keer draaien.
* `test-index.js` §2b: de regels gelden voor de hele lijst, elke opbouw
  heeft een dikte en gewicht.
* `test-v93.js` §11, in Chromium: oude lijst in de database → de app houdt
  zijn eigen lijst en mist geen diktes; een project met 5-13-4 houdt die
  waarde; nieuwe lijst in de database → die wint.

## Niet getest

* Het script in de echte Supabase. Getest tegen de lijst uit de app; heeft
  iemand de lijst in Supabase met de hand aangepast, dan past het script
  dezelfde regels toe op wat er staat (het controleoverzicht onderaan laat
  de aantallen zien).
* Safari op iPad/iPhone. Er is niets aan opmaak of bediening veranderd.

## Nog open

Navragen bij Van Noordenne of zij "4-13-5" ook van binnen naar buiten
lezen (zie het onderzoek). Lezen zij het andersom, dan zit de coating bij
jullie bestellingen op positie 2 in plaats van 3.
