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

## Bijwerken: test vanaf wat er nu live staat

Wat er gebeurt als Jan een nieuwe versie online zet, bepaalt de code die op
de apparaten draait: de **oude** versie, niet de nieuwe. In v99/v100 was het
nieuwe bijwerken goed getest, maar alleen van "nieuw" naar "nog nieuwer".
De overgang van wat live stond (v98) naar het nieuwe werd nooit getest. Dat
gaf het probleem uit v101: op de iPhone van Jan bleef v98 staan, en er kwam
geen melding.

Daarom bij elke oplevering:

- Haal de versie die nu live staat uit de repo:
  `git -C <repo> archive <commit> | tar -x -C /tmp/live`
- Draai `OUD=/tmp/live node test-overgang.js`.
- Is er een apparaat dat nog een oudere versie kan draaien (de iPhone van
  een buitenmedewerker die weken niets opende), draai dan ook vanaf die
  versie. Sinds v101 staat v98 als vaste tweede proef in de batterij.
- Bedenk wat de oude code wél en níet doet: welke melding toont hij, waar,
  en wist hij die ergens? Kan hij herladen? Kan een app op het beginscherm
  van de iPhone, die niet ververst kan worden, er zelf uit komen?

## Welke apparaten en systemen

Sinds 13 oktober 2026 (Jan): ook **Android** en **Windows** gebruiken de
apps, plus alles wat ze maken (pdf, csv, zip, Excel). Het is dus niet
alleen iPad/iPhone/Mac. Houd daar bij elke wijziging rekening mee, en
**meld het Jan als iets op een van deze systemen botst**, ook als niemand
erom vroeg.

| systeem | browser | let op |
|---|---|---|
| iPad, iPhone | Safari, app op het beginscherm | Apple Pencil; iOS legt apps stil; eigen grenzen aan opslag; HEIC-foto's |
| Mac | Safari, Chrome | ⌘-sneltoetsen |
| **Android** | Chrome (ook als geïnstalleerde app), Samsung Internet | schermtoetsenbord geeft bij `keydown` vaak geen letter (code 229); S-Pen = `pen`; terug-knop van het systeem; geen opslagvenster (`showSaveFilePicker`) |
| **Windows** | Edge, Chrome | Ctrl in plaats van ⌘, Ctrl+Y = opnieuw; **Excel opent een csv zonder BOM als rommel** (é, ×, —) en slaat zelf op in Windows-1252; verboden tekens in bestandsnamen (`\ / : * ? " < > \|`); vaste schuifbalken nemen breedte in; aanraakscherm met pen |

Testen met de Playwright-apparaatprofielen (bijv. `devices['Pixel 7']`)
nadert Android: aanraken, mobiele browser, schermmaat. Het blijft wel
Chromium op Linux. Echte Android- en Windows-apparaten en Samsung Internet
zijn hier niet te testen; zeg dat in de nota.

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
| **overgang van de live versie** | `OUD=… node test-overgang.js` (oude code in de browser, nieuwe op de server) | de oude code bepaalt of een update aankomt (v101) |
| **ophalen mislukt** | de nagebootste database een fout laten geven voor één tabel (`S.fout['taken:select']` in `test-v103.js`) | een mislukte vraag mag er nooit uitzien als een lege lijst ("Nog geen taken") (v103) |
| **meer dan de grens** | meer rijen dan de app ophaalt (1205 projecten, 521 taken, 45 logregels), met een database die echt telt en begrenst | wat buiten de grens valt, moet je zien (v103) |
| **niet meer ingelogd** | geen sessie, en de database laat dan niets zien (0 rijen, géén fout, zoals RLS) | dat is iets anders dan "project weg" (v103) |
| **database of opslag vol** | de fout die Supabase dan geeft (25006 / read-only, quota) | alleen-lezen is geen gewone fout (v103) |
| **een ander apparaat kent iets nog niet** | twee contexten op één nagebootste database, één per apparaat offline (`nieuweContext(opties, 'ipad')` + `S.weg.ipad`) | een apparaat dat offline was, mag niets van een ander wissen (v104) |
| **twee apparaten, dezelfde ruit** | iPad offline een opmerking, kantoor een nieuwe maat en een aanvulling; daarna een klok die achterloopt | een oude maat mag niet stil opnieuw besteld worden, een echte wijziging niet stil weggezet (v105) |
| **bestanden van andere systemen** | de echte bytes: Windows-1252, MacRoman, UTF-16, HEIC-kop, met en zonder naam/type | je ziet de tekens pas fout op het andere systeem (v104) |
| **klok van het apparaat verkeerd** | een eigen `Date` in de pagina die een maand vooruit staat | alles wat met tijd iets weggooit, hoort op de klok van de server (v103) |

## De test zelf

- **Toets de belofte op de gegevens:** kijk in de (nagebootste) database
  en in `localStorage` of alles er staat.
- **Klik minstens één keer écht**, in Chromium, op de knop die de
  gebruiker gebruikt. Niet alleen de functie aanroepen.
- **Na elke stap: waar staat het werk nu?** Op de server, of op het
  apparaat met de vlag "moet nog omhoog". Er is geen derde mogelijkheid.
- **Kan het onvindbaar worden zonder dat iemand het ziet?** (Jan, v103)
  - Elke grens (`limit`) die stil afkapt, is een plek waar iets
    verdwijnt: tel mee (`count: 'exact'`) en zeg het als er meer is.
  - Elke vraag die mislukt, moet er anders uitzien dan een lege lijst.
  - Werk dat niet bij het open project hoort, gaat apart en wordt nooit
    weggegooid.
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

- **echte Android- en Windows-apparaten**: Samsung Internet, Excel op
  Windows;

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
- `test-v103.js`:
  - elk onderdeel begint met de echte situatie;
  - een database die fouten geeft per tabel, telt en begrenst;
  - zwak signaal waarbij de telefoon niet merkt dat het bereik terug is;
  - de klok van het apparaat verzet;
  - `--mutaties` draait elke reparatie terug en eist dat de reeks rood
    wordt. Doe dat ook in nieuwe reeksen.
- `test-v104.js`:
  - twee apparaten op één database, één offline;
  - de nabootsing van de database doet wat Supabase doet (count, de
    JSON-kolom `data->info->bestellingen`, de trigger van script 23);
  - een pdf teruglezen en een xlsx teruglezen met SheetJS;
  - les: een check met `|| true` of een klik met `.catch(() => {})` kan niet
    falen; de beoordelaars vonden ze. Elke check moet rood kunnen worden.
- `test-v105.js`:
  - de stempels (`gewOp`) zoals ze bij het inmeten echt in de ruiten staan
    (`INGEMETEN`); zonder stempel kan de app een oudere stand niet zien;
  - twee apparaten die **dezelfde ruit** veranderen (de iPad een opmerking,
    kantoor de maat), en een iPad met een **klok die achterloopt**;
  - een pdf-hulp die de vragen onderweg beantwoordt en een FOUT geeft als er
    geen pdf komt (geen time-out als enige teken);
  - het opslagvenster nagebootst om de **volgorde** te toetsen (eerst de
    vraag, dan het venster);
  - les: een test op telefoonbreedte met een tekst mét streepjes bewijst
    niets voor een woord zonder; neem het ergste geval.
- `test-v106.js` (bewerkslot):
  - meerdere apparaten tegelijk, elk met een eigen gebruiker, eigen code en
    eigen bereik (`apparaatCtx`): Mac, iPad, Windows-pc, Android-telefoon;
  - het **live bijwerken nagebootst** (`window.__live`): elke wijziging gaat
    naar elke open pagina, behalve naar een apparaat zonder bereik
    (`S.weg`) of zonder live verbinding (`S.geenLive`);
  - geen bereik = `S.weg` **én** `ctx.setOffline(true)`: de server antwoordt
    niet, en de browser weet het ook;
  - de volgorde op de server vastleggen (`S.log`) en daarop toetsen: eerst
    opslaan, dan vrijgeven, dan pas de ander;
  - een stilgelegde app (iOS) nabootsen door `Date.now` vooruit te zetten;
  - een vorige versie (v105) op hetzelfde adres laten draaien (`S.oudeCode`)
    en daarna "bijwerken";
  - `--mutaties` draait per mutatie alleen de onderdelen die hem moeten
    vangen (`WAAR`, `ALLEEN=`); de hele reeks draait in de batterij;
  - les: het moeilijkste geval was niet "een ander heeft het project", maar
    "het project is **vrij** en een oud apparaat komt terug". Toets ook de
    toestand ná het normale verloop (iemand ging naar huis, het project is
    gesloten).
  - les: **kijk naar het scherm**. Alle checks waren groen terwijl het seintje
    midden óver de vraag "Naar de leverancier?" stond: een CSS-regel verloor
    van een latere regel met hetzelfde gewicht. Pas een schermafdruk liet het
    zien (`PLAATJES=map node test-v106.js`).
  - les: een app stilleggen zoals iOS doet, lukt in Chromium niet met CDP
    (`Page.setWebLifecycleState` bevriest een zichtbare pagina niet; de
    tellers liepen door). Wel met de klok van Playwright:
    `context.clock.install()`, dan `page.clock.pauseAt(…)`,
    `setSystemTime(… + 2 uur)` en `resume()`.
  - les: een mutatie die niet gevangen wordt, wijst vaak op een **ontbrekend
    gewoon geval** (hier: offline werken, app dicht en weer open, niemand
    anders deed iets: dat moet gewoon opgeslagen worden, §25).
  - les: controleer vóór de lange mutatieproef of elke mutatie nog past; de
    runner doet dat nu zelf, en telt alleen een eigen FOUT-regel als
    gevangen (geen crash of time-out).
  - les (v108): **toets op elk scherm waar de belofte geldt.** In v106 stond
    "Alleen kijken, op elk tabblad" in de test, maar hij keek alleen op
    Invoer. Het label zat in de werkbalk van Invoer, die op de andere
    tabbladen verborgen is: het stond alleen op Invoer, dubbel met de balk
    (Jan zag het). Nu toetst §2 Invoer én Project info, en §27 op
    telefoonbreedte.
  - les (v108): de vraag van de browser om een wachtwoord te bewaren
    (macOS, iOS, Android, Windows) is hier **niet** te zien; Chromium in de
    test toont hem niet. §29 toetst wat de browser te horen krijgt: bij
    Chrome/Edge `navigator.credentials.store` (nagebootst), bij
    Safari/Firefox een echte verzending van het formulier naar het
    verborgen kader (PasswordCredential weggehaald), en bij een fout
    wachtwoord geen van beide.
  - les (v108): een mutatie die "toevallig" niet rood wordt, kan betekenen
    dat iets anders het later toch rechtzet (hier: het label werd ook bij
    elke schermwijziging bijgewerkt). Toets dan op het moment zelf
    (`toon()` en meteen kijken). De mutatie `ander` (drie apparaten) hangt af
    van de volgorde bij de server en wordt niet elke keer gevangen (4 van 5);
    draai hem bij twijfel los een paar keer.
