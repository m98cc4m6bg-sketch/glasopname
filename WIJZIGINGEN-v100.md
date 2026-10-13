# Glasopname v100: bijwerken zonder bereik, en nooit een halve versie

*13 oktober 2026. Naar aanleiding van Jans vraag bij v99: "De app kijkt ook
elke 5 minuten. Geeft dit bij offline gebruik geen problemen?"*

## Installeren

- **v99 nog niet geplaatst?** Sla v99 over en plaats dit pakket. Het bevat
  alles van v99.
  1. Draai eerst `21_versieslot.sql` in Supabase.
  2. Plaats daarna de bestanden.
  3. Tik deze ene keer op elk apparaat op *Nu bijwerken*.
- **v99 al geplaatst?** Dan is er geen SQL nodig. Plaats de bestanden; de
  apparaten werken vanzelf bij.

Plaatsen gaat zoals altijd:
- Open de map `glasopname` uit de zip en druk op **Cmd+Shift+.** om
  verborgen bestanden te tonen.
- Selecteer alles wat erín staat, sleep het naar je repomap en kies overal
  *Vervang*.
- Sleep niet de map zelf.

## Het antwoord op de vraag

**Het controleren zelf geeft offline geen problemen.** Zonder bereik mislukt
de controle stil: er komt geen balk, er wordt niet herladen en je werkt
gewoon door. Het kost niets merkbaars.

**Bij het nalopen vond ik wel twee echte gaten.** Die zaten er al vóór v99,
maar het verplichte bijwerken maakte ze belangrijker:

1. **Een nieuwe versie kon half binnenkomen.** Bij het ophalen van een nieuwe
   versie sloeg de app een bestand dat niet binnenkwam stil over. Viel het
   bereik weg tijdens het ophalen, wat op een bouwplaats zomaar gebeurt,
   dan was de nieuwe versie toch "klaar" en verving hij de oude. Zonder
   bereik ontbrak daarna een stuk van de app.

   Ik heb dit in een test nagedaan: zonder deze reparatie werkte het
   tekenen daarna niet meer.

   **Nu:** een nieuwe versie wordt alleen klaargezet als élk bestand van de
   app binnen is. Lukt dat niet, dan blijft de vorige versie gewoon
   draaien, compleet. Bij de volgende controle, binnen 5 minuten, probeert
   de app het opnieuw. Alleen de catalogusfoto's mogen ontbreken; de app
   werkt ook zonder.
2. **Een foutmelding van de server ging vóór de kopie op het apparaat.**
   Gaf de server een fout terug in plaats van een bestand, bijvoorbeeld bij
   een storing bij GitHub, dan kreeg de app die fout. Dat gebeurde ook als
   het bestand gewoon op het apparaat stond.

   **Nu:** dan gebruikt de app de kopie op het apparaat.

**Kleiner:**
- Zonder project open zag je na het bijwerken "Bijgewerkt naar …" bijna
  nooit, want de statusbalk overschreef het meteen. Het staat nu 6
  seconden in de balk onderaan.

## Getest

Twee keer de hele batterij, alles groen. `test-v99.js` heeft twee nieuwe
onderdelen (7 en 8) en een strengere manier van "geen bereik". Tot nu toe
zette de test alleen de browser offline. Dat raakt de service worker niet:
die haalde gewoon van de server, en de test bewees dus niets over de kopie
op het apparaat. Nu is de server dan echt onbereikbaar.

Wat de test nu nagaat:
- **Zonder bereik controleren:** geen balk, geen herladen, gewoon
  doorwerken. Het werk gaat omhoog zodra er weer bereik is.
- **Eén bestand komt niet binnen:**
  - er staat geen nieuwe versie klaar;
  - zonder bereik draait de vorige versie compleet verder, inclusief
    tekenen;
  - de volgende controle met alles binnen werkt wél bij;
  - die nieuwe versie werkt ook zonder bereik.
- **Onderdeel 3 (bijwerken zonder bereik)** slaagt ook met de strengere
  "geen bereik": de nieuwe versie komt dan echt uit de kopie op het
  apparaat.

Om na te gaan dat de test het oude gedrag vangt, heb ik dat even
teruggezet. Dan slaagt de test niet: de halve versie werd geïnstalleerd en
zonder bereik ontbrak het tekenen, met een foutmelding.

**Niet getest:**
- **Echte Safari op iPad en iPhone.** Safari houdt eigen grenzen aan voor
  hoeveel een app op het apparaat mag bewaren. Dat kan hier niet nagebootst
  worden.
- **Een wifi met inlogpagina** (hotel, sommige bouwplaatsen). Die geeft op
  elke vraag zijn eigen inlogpagina terug, als "gelukt". Die vergissing kan
  een browser niet herkennen. Advies: werk niet bij op zo'n wifi zolang je
  nog niet ingelogd bent op dat netwerk. In de praktijk merkt de app het
  pas bij de volgende controle met echt internet.
