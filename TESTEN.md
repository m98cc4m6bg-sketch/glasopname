# Testen: zo doen we het, en waarom

*Vastgelegd op 13 oktober 2026 op verzoek van Jan, na v100. Geldt voor elke
test in dit project, voor elke Claude die hieraan werkt.*

Jan zei het zo: "Zorg dat Claude begrijpt wat hij test, waarom en waarvoor.
En wat de echte situatie is waarvoor getest wordt, maar ook bijzonderheden."

Een groene test zegt niets als hij iets anders nabootst dan wat er op de
bouwplaats gebeurt. Dat is hier al drie keer gebleken:

- **v88–v90:** het slot leek te werken, maar de test keek naar de ene tabel
  die wél dichtstond (de les van v90).
- **v90–v92:** de knop ‹Ontgrendelen› deed niets, terwijl alle tests groen
  waren. Ze riepen de functie rechtstreeks aan en klikten nooit (de les van
  v93).
- **v99:** de offline-test zette alleen de browser offline. Daar trekt de
  service worker zich niets van aan: die haalde gewoon van de server. De
  test bewees dus niets over de cache, en daardoor bleef verborgen dat een
  nieuwe versie half geïnstalleerd kon worden (gevonden in v100).

## Vóór je een test schrijft: vijf vragen

Schrijf de antwoorden bovenaan de test, in het commentaar. Een volgende
Claude moet kunnen lezen wat er getest wordt en waarom.

1. **Wat is de echte situatie?** Wie, met welk apparaat, waar, met welk
   bereik, en wat gebeurt er om hem heen? Bijvoorbeeld: "Bart staat op een
   steiger met een iPad, half bereik. Hij typt een maat terwijl Jan op
   kantoor een nieuwe versie online zet."
2. **Wat is de belofte?** Zeg het in woorden van Jan, niet in woorden van
   de code. Bijvoorbeeld: "wat Bart typt, gaat nooit verloren".
3. **Wat gaat er voor de gebruiker mis als het niet klopt?** Dat bepaalt
   hoe streng de test moet zijn. Alles wat gegevens kan kosten is een
   **harde eis**: nooit gegevens kwijt.
4. **Wat kan er halverwege gebeuren?** Loop elk proces met meer stappen
   langs en vraag bij elke stap: wat als het hier stopt? Denk aan:
   - het bereik valt weg;
   - de app wordt gesloten;
   - iOS legt de app stil op de achtergrond;
   - de server antwoordt niet, of met een fout;
   - een tweede apparaat of tabblad doet tegelijk iets.
5. **Wat neemt mijn testopstelling aan, en klopt dat?** Een nagebootste
   database, een uitgezette browser of een kortere aftelling zijn
   aannames. Controleer dat ze doen wat de echte situatie doet. Doen ze
   dat niet, zeg het dan.

## De echte omstandigheden nabootsen

Bedenk bij elke functie welke van deze omstandigheden ertoe doen, en test
die. Liever één test die de echte situatie raakt dan tien die de code
aftikken.

| omstandigheid | hoe na te bootsen (Chromium/Playwright) | waarom |
|---|---|---|
| **geen bereik** | de server écht onbereikbaar maken (`S.serverUit` in `test-v99.js`, of de server stoppen) **én** `ctx.setOffline(true)` | `setOffline` raakt de service worker niet (v100) |
| **bereik valt weg halverwege** | één bestand of verzoek laten mislukken (`S.weiger`), daarna weer toelaten | bouwplaats; een half binnengekomen versie (v100) |
| **trage of hangende server** | een antwoord vertragen of nooit geven | `bezig` bleef tot v83 voor altijd aan |
| **server geeft een fout** | 500, 404, een weigering door de database (zoals het versieslot) | de app moet terugvallen, niet stil doorgaan |
| **herladen of sluiten midden in het werk** | `page.reload()` of de pagina sluiten na het typen, vóór het opslaan | iOS sluit apps; Jan drukt op ↻ |
| **twee apparaten tegelijk** | twee browsercontexten op dezelfde nagebootste database | elkaar overschrijven |
| **twee tabbladen op één apparaat** | twee pagina's in één context (ze delen `localStorage`) | gedeelde lokale kopie (zie HANDOVER §9) |
| **oude en nieuwe versie naast elkaar** | het versienummer op de server ophogen tijdens de test (`zetVersie`) | een oud apparaat schrijft weg wat het niet kent (v99) |
| **iemand is nog bezig** | blijven typen terwijl de app iets automatisch wil doen | niet onderbreken midden in een maat |
| **telefoonbreedte** | viewport 390 × 844 | knoppen vielen van het scherm (v98) |
| **besteld project** | een project met status 'besteld' | het slot moet overal gelden |
| **leeg en heel vol** | geen gegevens; en veel ruiten, notities, logregels | lege toestand, pagina-overgangen in de pdf |
| **eerste keer** | een verse browser zonder service worker of opgeslagen gegevens | herladen voor niets (v100) |

## De test zelf

- **Toets de belofte op de gegevens:** kijk in de (nagebootste) database
  en in `localStorage` of alles er staat.
- **Klik minstens één keer écht**, in Chromium, op de knop die de
  gebruiker gebruikt. Niet alleen de functie aanroepen.
- **Na elke stap: waar staat het werk nu?** Op de server, of op het
  apparaat met de vlag "moet nog omhoog". Er is geen derde mogelijkheid.
- **Kijk ook naar wat níet mag gebeuren:**
  - geen onnodige herlaadbeurt;
  - de server niet bestoken met verzoeken;
  - het werk van een ander niet weggooien;
  - geen fouten in de console.
- **Kijk naar het scherm:** maak schermafdrukken (`SCHERM=map node
  test-….js`) en bekijk ze. Lay-out, overlappingen, iets dat verborgen
  hoort te zijn maar toch in beeld staat (v98).
- **Pdf's:** lees ze terug (pdfplumber). Controleer de inhoud, de volgorde,
  de lettertypes en de maten van afbeeldingen, en zet ze om naar een
  afbeelding om ze te bekijken.

## Bewijs dat de test kan falen

Een test die nooit rood wordt, is geen test. Doe na het schrijven:

1. **Draai de reparatie terug** (of maak de code expres stuk) en draai de
   test. Hij moet rood worden, en wel op de juiste regel.
2. Wordt hij **niet** rood, dan test hij iets anders dan je denkt. Pas de
   test aan en probeer opnieuw.
3. **Zet terug en controleer** dat de bestanden weer gelijk zijn aan het
   origineel (`diff`).
4. **Noem het in de WIJZIGINGEN-nota:** wat je stukmaakte, en dat de test
   het ving.

## Eerlijk zijn over wat niet getest is

Zeg in elke nota wat niet getest kon worden en waarom. Hier is dat bijna
altijd:

- **echte Safari op iPad en iPhone**:
  - een app op het beginscherm;
  - iOS die apps op de achtergrond stillegt;
  - de grenzen van Safari aan wat een app op het apparaat mag bewaren;
- **de echte Supabase**;
- **echte bestanden van de leverancier**;
- **een wifi met inlogpagina**.

Ken je een bekend verschil tussen Safari en Chrome dat ertoe doet? Noem
het, en vang het waar mogelijk af in de code.

## Is iets onduidelijk?

**Vraag het Jan** vóór je test, met de vraag in zijn woorden. Bijvoorbeeld:
"Mag het bijwerken wachten tot iemand klaar is met typen, of moet het
meteen?" Neem bij twijfel over gegevens nooit de makkelijke aanname: de
harde eis wint.

## Waar het al zo gedaan is (voorbeelden om na te lezen)

- `test-v99.js`:
  - bijwerken midden in het typen;
  - zonder bereik;
  - een oude versie naast een nieuwe;
  - twee tabbladen;
  - een halve download;
  - de server écht onbereikbaar.
- `test-v98.js`:
  - echte kliks;
  - telefoonbreedte;
  - verborgen elementen die toch zichtbaar zijn;
  - het slot op de gegevens.

  Samen met `test-v98.py`: de pdf teruglezen, de lettertypes, de maat van
  de foto, pagina-overgangen.
- `test-v93.js`:
  - de echte klik op ‹Ontgrendelen›;
  - de wachtrij voor foto's zonder bereik.
- `test-sql.sql`: elk SQL-script twee keer draaien, tegen een echte
  PostgreSQL.
