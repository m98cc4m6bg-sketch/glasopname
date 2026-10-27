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
| **telefoonbreedte** | viewport 390 × 844 (met `isMobile`: vergelijk met 390, niet met `innerWidth`) | knoppen vielen van het scherm (v98); de pagina schoof opzij (v110) |
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

## Hoeveel testen: naar het niveau van de wijziging

*Afspraak Jan, 20-10-2026.* Een kleine wijziging kostte uren: de hele
batterij aan het begin van een sessie en twee keer aan het eind (samen
±75 min op de 2 kernen van de cloudomgeving), plus een mutatieproef van
15–45 min, en na elke reparatie alles opnieuw. Dat leverde weinig extra
zekerheid op. Daarom volgt het testwerk het niveau (🟢🟠🔴 uit
houdbaar-bouwen). Bij twijfel kies je het hogere niveau.

| niveau | wat draai je | ongeveer |
|---|---|---|
| 🟢 tekst, lay-out, kleur | snelle kern + de reeks van wat je raakt + één echte klik + schermafdruk op telefoonbreedte | 2–5 min |
| 🟠 functie, berekening, knoppen, keuzelijsten | 🟢 + een nieuwe test die aantoonbaar rood kan worden (met de hand) + de volledige batterij **één keer** | 30–40 min |
| 🔴 database, rechten, inloggen, service worker, data omzetten | 🟠 + de mutatieproef van de reeks die je raakt | 1–1,5 uur |

De lijsten "snelle kern" en "volledige batterij" staan in `CLAUDE.md`
onder Testen.

- **Snelle kern = altijd.** Hij bewaakt de dingen die nooit stuk mogen,
  en is goedkoop: dat de app laadt, de versienummers en de offline-lijst
  (`SHELL`), opslag en herstel, offline werken, en de overgang vanaf wat
  live staat. Die overgang draait dus ook bij 🟢: hij kost ±20 s en ving
  in v101 een echt probleem.
- **Een batterij één keer.** Een tweede keer alleen als een test wisselend
  rood en groen is; zoek dan uit waarom hij wisselt.
- **Reparatie na de batterij:** opnieuw de test die faalde en de reeks van
  wat de reparatie raakt. De hele batterij opnieuw alleen bij 🔴, of als de
  reparatie in gedeelde code zit (`cloud.js`, opslaan, `zetStaat`,
  `teBestellen`, `pdf.js`).
- **Beoordelaars** (controle door aparte agents): na een ronde de snelle
  kern en de geraakte reeks, niet de volledige batterij.
- **Testtijd vooraf noemen.** Zeg bij de start het niveau en de verwachte
  testtijd. Meer dan 15 min testen: vraag Jan eerst.
- **Oudere mutaties opnieuw (les v114): gericht.** Verandert een bewuste
  gedragswijziging het voorbeeld waar een oudere proefmutatie op leunt
  (zoals RAL-kleur → ALLEEN ROOSTER bij `glasGelijk`), draai dan alleen
  díe mutaties opnieuw (`ALLEEN=`), niet de hele proef van die reeks.
- **Een bewuste verandering is geen fout.** Wordt een vergelijking met een
  oude stand rood omdat je dat gedrag bewust veranderde, werk de test bij en
  noem het in de nota. Zoek het niet uit alsof het een fout is.

## Onderhoud van de batterij

*Stand 20-10-2026 (doorlichting op v113, nagekeken op v114). Pak deze punten op als Jan
er akkoord op geeft; gegevensbewaking (opslaan, offline, overgang,
meerdere apparaten) blijft altijd staan.*

Moet eerst (anders vals rood):
- De mutatieproeven van `test-v104.js` (`vervallen`, `zelfde`, `vanlijst`)
  en `test-v105.js` (`cumulatief`, `vervangt`, `momentalles`) passen niet
  meer op de code (die kreeg o.a. `nrTekst`). De proef is daardoor altijd
  rood. Bijwerken, en de controle vooraf uit `test-v106.js` overnemen.
- Ook in `test-v110.js` passen 9 mutaties niet meer (`anderVeld`,
  `minderMoment`, `blokTelt`, `kort`, `nietsTeBestellen`, `oudLos`,
  `oudStempel`, `blokBollen`, `oudOffline`; al zo in v115, gezien 21-10-2026).
  Snel nakijken voor alle reeksen: een scriptje dat van elke mutatie het
  anker in de code zoekt (handover §10).
- `test-v106.js` §22 wil `/tmp/v105werk`, `test-v111.js` §4 wil
  `/tmp/live109`. Die mappen moeten elke sessie opnieuw klaargezet worden.
  Liever de benodigde oude stukken vast in de test opnemen.

Opgelost (v120, 22-10-2026):
- `test-v93.js` §6 en §8 waren wisselend rood (ook op v119, nagegaan): §6
  keek naar de wachtrij vóór de poging voor het origineel geweest was; §8
  zette de wachtrij pas stil nadat het bereik terug was, zodat een
  herhaalpoging nog net kon uploaden. Nu: wachten op de fout, en eerst
  stilzetten. Drie keer achter elkaar groen onder belasting.

Grootste tijdwinst:
- **Vaste wachttijden** (`wacht(…)`, `waitForTimeout`) vervangen door
  wachten op een signaal (`wachtTot`) of de klok van Playwright. In
  `test-v106.js` alleen al ±108 s; `open()` wacht in elke reeks vast 700 ms
  (±100 keer). Vooral `test-v106` (341 s), `v105` (160 s), `v104` (152 s),
  `v110` (129 s), `v99` (86 s) en `test-verbinding` (38 s).
- **Mutatieproef gericht:** `test-v103.js` stopt niet bij de eerste FOUT,
  en `test-v104`, `v105` en `v112` hebben geen `WAAR`/`ALLEEN`, dus elke
  mutatie draait de hele reeks. De runners van v110–v113 tellen ook een
  crash of time-out als "gevangen"; alleen een eigen FOUT-regel telt.
- **Eén gedeelde testhulp** voor de nagebootste Supabase (`dbVraag`,
  `NAMAAK`, `opslagVraag`), script 23 (`triggerBestellingen`, nu 6×
  gekopieerd) en de mutatie-runner (5×). Ruim daarbij de tijdelijke mappen
  op: een volledige mutatieronde laat ±1,2 GB in /tmp achter.

Dubbel, kan weg (na controle):
- `test-v106.js` §29 (inloggen en wachtwoord bewaren): `test-v109.js` §2
  doet hetzelfde en meer. Eerst de mutaties `aanbieden`, `kader` en
  `vooraf2` naar v109 verhuizen.
- `test-v111.js` §6 (favicon, `SHELL`) en de mutatie `swShell` in v113:
  `test-index.js` bewaakt dat al.
- `test-slot.js` §5–6 en `test-mail-en-slot.js` §4–6: roepen
  `slotOntgrendel()` rechtstreeks aan (de valkuil van v93); `test-v93.js`
  §1 en `test-v98.js` §4 doen het met een echte klik.
- Bestellijst-stroom: `test-v104.js` §4–6, §22 en §24 overlappen met
  `test-v105.js` §1–4 en §11. Samenvoegen.

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
- `test-v109.js` (inloggen en wachtwoorden):
  - de **échte** bibliotheek van Supabase (`lib/supabase-js-…`) tegen een
    nagebootste Supabase-**server** in node (auth en rest, met CORS, op een
    eigen poort), in plaats van een namaak-bibliotheek. Nodig omdat het juist
    gaat om wat de bibliotheek zelf doet met de sessie uit een herstellink
    (`setSession`, verversen, vergrendeling, uitloggen); het adres leest de
    app sinds v109 zelf. Een nieuwe test rond inloggen of sessies hoort hier;
  - half bereik = de server antwoordt lang niet en verbreekt dan
    (`S.hang`), niet alleen "meteen weg". Les: de bibliotheek vergrendelt
    tijdens `setSession`; een tweede poging wacht tot de eerste opgeeft;
  - geen bereik = de server verbreekt de verbinding (`S.weg`), ook midden in
    het opslaan van het nieuwe wachtwoord;
  - toetsen **waar** het wachtwoord heen gaat: elk verzoek aan de nagebootste
    Supabase en aan de app wordt gelogd (`S.log`, `S.app`), en het
    wachtwoord mag alleen in het inlog- of wachtwoordverzoek staan;
  - les: `minlength` op een wachtwoordveld laat de browser het formulier
    tegenhouden met een eigen (Engelstalige of systeem-)melding, vóór de app
    iets kan zeggen. De eigen controle in de app is duidelijker; daarom geen
    `minlength`, wel `passwordrules` (voor de wachtwoordvoorstellen van
    Safari);
  - de tokens van de nagebootste server hebben de vorm van een echte JWT
    (kop.inhoud.handtekening, met `exp`): de bibliotheek leest de vervaltijd
    eruit (`setSession`) en weigert anders zonder iets te vragen;
  - een link uit een mail opent een **nieuwe pagina**. Alleen het `#`-deel
    veranderen (`goto` naar hetzelfde adres met een ander `#`) laadt de app
    niet opnieuw; ga eerst naar `about:blank`;
  - les: een mutatie moet de echte fout nabootsen, niet iets wat erop lijkt.
    `location.hash = ''` tijdens het laden telt in de browser als
    *vervangen* (geen nieuwe stap in de geschiedenis); de bibliotheek deed het
    pas ná het laden, en dán is het een nieuwe stap. De eerste mutatie bleef
    daardoor groen; de juiste (`historie`) zet de oude werkwijze terug;
  - les (controle v109): toets ook de stappen ná het normale verloop. Een
    nieuw tabblad, de terug-knop, een antwoord dat verloren gaat nadat de
    server het al deed, en een apparaat waar al iemand anders ingelogd is,
    vonden vier echte fouten die de eerste versie van de reeks niet zag.
- `test-v110.js` (het aantal en de bolletjes, de aanvulling):
  - een **echte foto** in het project (`test-gevel.jpg`, een jpeg van een
    gevel met vier kozijnen), via de nagebootste opslag; tikken op de foto en
    op een bolletje zijn echte kliks (`tikFoto`, `bolMenu`);
  - de bolletjes in de pdf worden **geteld**: pdfplumber zoekt de oranje
    cirkels en leest de letter erin (`pdfBollen`);
  - begint met een **vangnet**: onderdelen 1–3 toetsen het gedrag van vóór
    de wijziging (aanwijzen, nieuwe ruit, één ruit minder, de pdf) en waren
    groen op v109, op één echte fout na (de telling in de balk);
  - een oud project waar het niet klopt (E aantal 1 met 2 bolletjes, C
    aantal 2 met 1): de test eist dat openen **niets** verandert;
  - les: na het aanraken van een bolletje negeert de foto 0,7 s elke tik
    (de naklik van iOS, `pauzeerFototik`). Een test die meteen na het menu
    op de foto tikt, ziet "er gebeurt niets"; een mens tikt nooit zo snel;
  - les: met `isMobile` past Chromium de breedte van de pagina aan de inhoud
    aan. `innerWidth` 482 op een "telefoon van 390" betekent dat iets te
    breed is (hier: het omschrijvingsveld van een foto); vergelijk dus met
    de breedte die je opgaf;
  - les: een mutatie die maar half terugdraait, bewijst niets. De eerste
    mutatie `glasmaat` haalde alleen de hoogte uit de controle; de test
    veranderde de breedte, dus bleef alles groen. En `menuTeveel` raakte
    alleen een regel met aantal > 1, terwijl de test een regel ×1 had. Kijk bij
    een gemiste mutatie eerst of hij het geval in de test wel raakt;
  - les: de beoordelaar vond met alleen de code te lezen twee fouten die
    geen test had: na een EXTRA noemde de app de verkeerde bestellijst, en
    een half gekozen "nog een ruit" bleef onzichtbaar aanstaan. Toets bij
    bestellen altijd **meer lijsten na elkaar** (onderdeel 11), niet alleen
    de eerste aanvulling.
- `test-v111.js` (bediening bij een rooster, het tabblad Toebehoren):
  - het **rekenwerk met de hand nagerekend** in de test zelf (zaagplan per
    lengte, band, kit, tape) en randgevallen die een zaagsnede of het "past
    precies" laten verschillen (12 latten van 1,0 m; 2.000 + 1.995). Een
    gewoon project gaf met en zonder zaagsnede hetzelfde plan, dus die
    mutaties werden eerst niet gevangen;
  - het **kenmerk van v109** wordt uit `/tmp/live109/index.html` gelezen en
    vergeleken (ruiten zonder bediening mogen niet veranderen); `OUD=` wijst
    een andere map aan;
  - de pdf's worden teruggelezen: Toebehoren wel in de PDF invoer, niets
    ervan op de bestellijst;
  - een mutatie mag sinds v111 **meer dan één paar** (van, naar) hebben,
    voor een bewaking op twee plekken (`slotBediening`: `SLOT_FUNCTIES` én
    de functie zelf; met één paar bleef hij groen);
  - les: controleer bij "weigert" de stand **op het scherm** (in de pagina),
    niet alleen de database: de opslag weigerde het al, dus een kapotte
    weigering bleef onzichtbaar (`kijken`);
  - les: `opgeslagenAls` wacht tot iets waar is. "Wordt niet bewaard" is
    meteen waar, ook als het even later wél bewaard wordt: lees dan de stand
    direct in de pagina;
  - les: ongedaan maken met de aandacht nog in een vak slaat dat vak over
    (bestaand gedrag, `bijBetreden = null`); verlaat in de test eerst het vak.
    Een omhulde functie (`omhul`) én focusin/focusout op hetzelfde vak geeft
    twee stappen: alleen omhullen wat zijn eigen vak vervangt.
- `test-v112.js` (alleen een andere bediening na een bestelling):
  - drie bestellijsten na elkaar, met de echte knoppen; daarna ook het
    overzicht. Toets niet alleen de eerste aanvulling: de fout "glas uit de
    1e, stang uit de 2e" zie je pas bij de 3e lijst;
  - onderdeel 4 rekent `standVan` met een zelfgemaakte reeks (een collega
    bestelt tussen de pdf en ‹Ja, verstuurd›), zonder browserklikken: dat
    geval is met twee apparaten nauwelijks op tijd na te spelen;
  - les: de mutatie `glasGelijk` (de kenmerkcontrole weg) bleef eerst groen,
    want de test veranderde een maat, en die vangt de glasmaatcontrole al.
    Een andere RAL-kleur verandert het kenmerk zonder de glasmaat: die raakt
    precies deze controle.
- `test-v113.js` (glaslatten, sponning, neuslat, één getal, uiterlijk):
  - onderdeel 1 rekent de pakketten na zonder klikken (`GlasLatten.pakket`
    met `anders`), met Jans deur en de neuslat als echte voorbeelden;
  - onderdeel 2 klikt echt: typen in het vak, het venster, de kiezer, de
    grote foto (een echte jpg in `latten/A4.jpg` in de testmap), Escape,
    ongedaan maken, doorvoeren;
  - les: een kolom in procenten (`width: 1%`) laat een tabel met
    `width: auto` toch de hele breedte vullen. Meet de breedte, kijk niet
    alleen naar de CSS;
  - les: `innerText` bevat geen `::before`/`::after`. Controleer zo'n tekst
    met `getComputedStyle(e, '::before').content`;
  - les: `tr:nth-child(even) td` heeft meer gewicht dan `td.tb-aant`; een
    regel die alleen bij de even rijen misgaat, zie je pas met 3 rijen;
  - les: bij gesimuleerd meekijken (`glasAlleenKijken = () => true`) laat
    de app de stand uit de cloud zien; controleer dan "niets veranderd",
    niet een vaste waarde;
  - les: een mutatie die de app laat vastlopen (time-out) is "gevangen",
    maar zonder duidelijke reden. Maak er een `check` met
    `waitForSelector(...).then(() => true, () => false)` van.
- `test-v114.js` (latzijde, onderdorpel, merk in beeld, slot, bi-color,
  ALLEEN ROOSTER, vaste zin, latmaten):
  - onderdeel 1 rekent zonder klikken (`GlasLatten.oordeelRuit`,
    `onderlatVoorRuit`, `toebehorenBerekenen`); 2 klikt echt, ook zijwaarts
    vegen in `.invoer-wrap` (de vaste eerste kolom moet op x = 0 blijven);
    6 doet de echte reeks: bestellen, ontgrendelen, kleur wijzigen,
    aanvulling, ‹Ja, verstuurd›, daarna een maat (VERVANGT) en een ander
    Duco type (met en zonder dezelfde glasaftrek); 7 opent een project
    met gegevens van v113 (oude vink, GL13, B2);
  - les: **controleer een weigering in de app zelf**, niet alleen in de
    nagebootste database. Opslaan loopt achter; "niets in de database na
    0,5 s" bewees niets, en zo bleef een slotgat (het venster riep de
    functie direct aan) eerst onopgemerkt;
  - les: `selectOption` geeft een vak geen focus. Wie ongedaan maken test
    (focusin/focusout in undo.js), doet `focus()`, kiezen, `Tab`, zoals op
    een tablet;
  - les: `overflow: hidden` op de tabel brak `position: sticky`, en geen
    enkele test zag het: de CSS "klopte". Meet de plek na het vegen.
  - les: **een bewuste gedragswijziging kan een oude proefmutatie
    onschadelijk maken.** `test-v112` gebruikte een andere RAL-kleur als
    voorbeeld van "glas anders, glasmaat gelijk"; sinds v114 is dat ALLEEN
    ROOSTER, en de mutatie `glasGelijk` werd niet meer gevangen. Het
    voorbeeld is nu een andere opmerking. Draai na zo'n wijziging de
    mutaties van de oudere reeksen die het raakt opnieuw;
  - les: bij de proef `ducoAftrek` hield de diktecontrole van het rooster
    de fout toch tegen (23 mm past niet in een DucoTon 18). Isoleer wat je
    test: K2 heeft daarom 22 mm glas.
- `test-v115.js` (latten op Toebehoren, omgekeerd, zicht, neuslat
  ventilatie/uitsteek, geen (meegeleverd), lege kolommen, naslag):
  - 1 rekent zonder klikken; 2 typt Diepte en Onder op Invoer (met Tab,
    ongedaan maken en ↶ van de tabel onder de foto); 3 klikt op Toebehoren:
    per foto met merkletters, glastype/opbouw heen en terug met Invoer, Tab
    van Diepte naar Onder (de focus blijft), typen en meteen op het oordeel
    klikken, "latzijde hier", "Alle ruiten", iPad-breedte, de telefoon; 4 de
    kiezers en het venster; 5 het slot; 6 een echte csv-import; 7 de
    bestellijst en PDF invoer; 8 de Naslag; 9 versie en `.gitignore`;
  - de oudere reeksen test-v111, test-v113 en test-v114 zijn bijgewerkt waar
    het gedrag bewust veranderde (geen kolommen Glaslat/Latzijde op Invoer,
    "zicht" in plaats van "ruim"/"te ruim", beide = onderin dezelfde lat).
    Alleen de mutaties die daarop leunen zijn opnieuw verankerd en gericht
    opnieuw gedraaid (`ALLEEN=`), niet de hele proef (afspraak 20-10-2026);
  - les: **een tabel die na elke wijziging opnieuw wordt getekend, slikt de
    klik die al begonnen was** (mousedown → blur → change → nieuw knopje →
    mouseup op iets anders). Test daarom "typen en meteen klikken" zonder
    Tab, en teken pas na de klik (`later()` wacht op pointerup);
  - les: **een klik van Playwright duurt 0 ms**, een echte tik ±100–150 ms.
    De mutatie die de wacht in `later()` weghaalt werd daardoor niet
    gevangen. Klik in zo'n test met `click({ delay: 150 })`;
  - les: een mutatie die "past niet" meldt is **niet** gevangen: na een
    wijziging in de code eerst kijken of de ankers nog kloppen;
  - niet getest: het toetsenbord op een echte iPad na Tab (Playwright kan
    dat niet nabootsen).
- `test-v116.js` (de wachtrij in Safari: originelen gingen leeg omhoog):
  - **Chromium laat dit niet zien.** Safari stuurt een bestand dat uit
    IndexedDB komt als 0 bytes mee; Chrome niet. De reeks bootst het na: een
    init-script onthoudt elk `Blob` dat uit IndexedDB gelezen wordt
    (`IDBRequest.result`), en de namaak van Supabase stuurt zo'n bestand leeg
    mee en antwoordt dan "No content provided" (400). §1 bewijst eerst dat de
    nabootsing Jans fout geeft (het bestand zoals v115 uploaden);
  - 1 een wachtrij zoals v115 hem achterliet (een `File`, 7 pogingen) gaat
    omhoog, byte voor byte; 2 een nieuwe foto via de bestandskiezer: in
    IndexedDB staat een kopie, geen `File`; 3 een leeg bestand gaat niet
    omhoog en blijft bewaard, het venster zegt het; 4 een leesfout houdt de
    rest niet tegen; 5 na 3 mislukte pogingen meldt het venster de fout;
    7 oude Safari zonder `Blob.arrayBuffer` (FileReader); 8 minder gelezen
    dan bewaard = niets uploaden;
  - les: **de console van Jan was de doorbraak.** Een vast scriptje dat
    alleen leest (hoeveel bytes staan er echt) scheidde "inhoud weg" van
    "inhoud er, versturen gaat mis". Vraag bij een Safari-probleem eerst om
    de console-regels, en geef een leesscriptje, nooit een die iets wijzigt;
  - bij een versiecontrole in een reeks altijd "vN of later": test-v115
    eiste precies v115 en werd bij v116 rood;
  - niet getest: de tijdslimiet bij het lezen (een minuut), en echte Safari (of een kopie in het geheugen daar wel goed
    meegaat; de verkleinde foto's, ook in het geheugen gemaakt, gingen bij
    Jan wel goed).
- `test-v117.js` (Jans to-do-lijstje: pakket, max glaspakket, binnen,
  voorbeeld, zaagplan, bediening "standaard", glasaftrek):
  - 1 rekent zonder klikken; 2 klikt op Toebehoren (pc, laptop 1280, iPad,
    telefoon: niets schuift opzij), het onderlat-venster bij binnen,
    "Alle ruiten" met voorbeeld en de melding over binnen, het zaagplan
    open en dicht; 3 een echte csv met "Max glaspakket incl band"; 4 de
    bestellijst, export en PDF invoer teruggelezen; 5 de Naslag;
  - les: **een kolom erbij past niet zomaar.** Met Pakket paste de tabel op
    een laptop van 1280 niet meer; de grens voor twee regels per ruit ging
    naar 1360 px. Meet op 1280 en 1440, niet alleen iPad en telefoon;
  - les: **een lange chip breekt de telefoon** ("onder: N30 alleen
    buiten"): `white-space: normal` op de telefoon;
  - les: zet je een verwachting om ("zonder bediening" → "standaard
    bediening"), zoek dan ook de mutaties die op die tekst leunen
    (`wasBediening` in test-v112, zes in test-v111);
  - niet getest: echte Safari (keuzelijst met grijze opbouwen: Safari op de
    iPhone toont de kleur van een optie niet, wel het kopje).
- `test-v118.js` (Jans lijst na de eerste proef met v117):
  - 1 rekent zonder klikken (band buiten per ruit, 5 mm = rol 2 + rol 3,
    "m band" dubbel); 2 Toebehoren: blok "Voor het hele project" los, per
    foto een tabel met kopregel, de nieuwe koppen, band buiten kiezen,
    de cursor blijft staan bij Tab in de tweede tabel; 3 Invoer rood bij
    te dik (ook na een bandwijziging op Toebehoren); 4 tabblad Bestellijst
    = `bestellijstModel` = pdf (gewone lijst en aanvulling met
    ANNULEREN), "Helder (standaard)", geen lege kolommen; 5 de
    werkvloer-pdf teruggelezen (foto met bolletjes, stuklengtes, "Let op",
    zaagplan, geen prijzen, geen levervragen); 6 een ✕ op elk menu en
    venster (plek en maat gemeten, ook Escape); 7 pc 1600/1440, laptop
    1280, iPad staand/liggend, telefoon: niets schuift opzij, op een
    laptop en groter staan de kolommen van de tabellen onder elkaar;
  - les: **vaste kolombreedtes rekenen met de inhoud**: een `select` of een
    regel met `nowrap` uit een oudere CSS-regel (later in het bestand) liep
    over de vaste breedte heen. Meet `scrollWidth` per cel, niet alleen
    van de tabel;
  - les: **een knop in een menu krijgt de menuregels** (`width: 100%`): het
    kruisje werd een balk. Daarom een eigen, specifiekere regel;
  - les: **een wijziging op het ene tabblad, zichtbaar op het andere**: de
    rode dikte op Invoer bleef staan na een andere band op Toebehoren.
    Bij het wisselen naar Invoer nu `updateBerekendCellen()`;
  - twee agents (UI/UX en een tester) keken mee; hun punten staan in de
    nota (verwerkt of als vraag);
  - niet getest: echte Safari (Mac, iPad, iPhone), de werkvloer-pdf
    geprint.
- `test-v119.js` (Jans antwoorden van 22-10):
  - 1 rekent: A4 precies vlak = "vlak met kozijn", A5 in 41–43 = "nood:
    steekt 3/2/1 mm uit", 44 vlak, 45 zicht; opdeklat ongemoeid; onderin
    buiten vlak = past (sinds v120: ook daar "vlak", en A5 in 40 = nood;
    de reeks is daarop bijgewerkt); advies bij vlak en nood alleen wat netjes in valt;
    2 Toebehoren: oranje chips (kleur gemeten), strook nood, strook "beide"
    met Begrepen (bewaard, komt terug bij een nieuwe ruit, weg bij een eigen
    onderlat; ook voor `tweeKanten` uit v113); 3 de vraag vóór de
    bestellijst (wel bij nood, niet bij vlak); 4 Let op op de werkvloer;
    5 Alles exporteren = drie bestanden; 6 versie;
  - les: **een nieuwe status raakt oude verwachtingen**: "past" bij precies
    passend stond in test-v113/v114/v115; die zijn bewust bijgewerkt (zie
    de nota), de mutaties van v115 die op de oude regel leunden opnieuw
    verankerd en gericht gedraaid;
  - les: `toebehorenZetRuit` tekent het scherm niet opnieuw; in een test
    daarna `renderToebehoren()`;
  - niet getest: echte Safari.
- `test-v120.js` (de grote proef van v119, Jans keuzes van 22-10):
  - opgebouwd uit de opstelling van de storingzoekers (nagebootste
    database mét bewerkslot, versieslot, bestellingen-trigger en live
    doorgeven, en een apparaat zonder bereik per naam: `S.weg.ipad`);
    alleen zo is een fout met twee apparaten eerlijk te laten zien;
  - 1 komma en "mm" in een maat (echt typen), aantal 0/−5/2,7, tikfouten
    vóór de bestellijst; 2 twee tabbladen zonder bereik (herladen, sluiten,
    hetzelfde project twee keer); 3 iPad offline "Ja, verstuurd" + collega
    neemt over en bestelt: DUBBEL BESTELD, rode balk; nummer na intrekken;
    4 import: kolomkoppen, merk bestaat al (keuze, bolletjes mee), cijfers
    → 1a/1b, Alles vervangen, max pakket met halve mm of tekst, lege cellen,
    ✕ en Escape; 5 latten: A5 1 mm te krap = nood, vlak onderin buiten,
    strook vlak, zaagplan + 1 reserve (scherm = werkvloer), te lange lat,
    ⧉ met keuzes, "Alle ruiten" + vraag + Terugzetten (aanvinken: sinds
    v121 in `test-v121.js`), Enter, lengte 5,4;
    6 pdf-kop (besteller + telefoon, contact, referentie), opmerking en
    "na de laatste bestelling gewijzigd" op werkvloer en PDF invoer,
    samenvatting, ✕ met Terugzetten (bolletjes mee), selectie, 📷,
    kleur, iPad 44 px; 7 vreemde nummers en HTML in een project; 8 📞 en
    💾 (de zip uitgepakt en nagekeken); 9 versie;
  - mutatieproef: 33 mutaties (`--mutaties`, of `--mutaties naam1,naam2`;
    tot v120 34: `alleenGekozen` staat sinds v121 in `test-v121.js`);
  - script 26 is apart getest tegen een echte PostgreSQL 16 met een
    namaak van Supabase (40 controles, 14 mutaties); die proef staat in de
    zip "niet-in-repo" (niet openbaar), net als `26_terug.sql`;
  - les: **een getalvak in Chrome laat een komma stil weg**; een test die
    `fill()` op een getalvak doet, ziet dat niet: echt typen
    (`keyboard.type`) en dan Tab;
  - les: **een opstelling zonder bewerkslot laat een twee-apparaten-fout
    niet zien** (de echte database zou weigeren); de reeksen v119 en ouder
    hebben het bewerkslot niet in hun namaak;
  - niet getest: echte Safari (Mac, iPad, iPhone: het cijfertoetsenbord
    met komma, de tik-plek van 44 px, de back-up als zip delen), Android,
    Windows, de echte Supabase (script 26 alleen in een namaak).
- `test-v121.js` (Jans keuzes na v120, 22-10): zelfde opstelling als v120;
  1 neuslat recht + 20 mm (los van het verstek: verstek 30 → neuslat
  blijft + 20; eigen toeslag 15; een gekozen N45 ook; A4 onderin houdt
  verstek; "Nodig" telt mee; uitleg, zaagplan en PDF werkvloer "N30 recht",
  nergens meer "verstek" in de werkvloer); 2 "beide": grijze melding
  zonder ⚠, hint "beide kanten" in de knop (ook na Begrepen, weg bij een
  eigen neuslat); 3 de actiebalk: alleen met vinkjes, vast onderin, het
  blok bovenin één regel, Toepassen pas na een keuze, diepte echt typen
  (de cursor blijft), voorbeeld vóór Toepassen en **niets bewaard vóór
  Toepassen**, tikfout "4x", "slechter bij", geen extra vraag, alleen de
  gekozen ruiten (ook in de database), **het voorbeeld = de uitkomst**,
  Terugzetten boven de balk, binnen + neuslat overgeslagen en gemeld, ✕,
  op slot geen balk, iPhone (in beeld, 44 px, ✕ niet over een vak, ≤ 60 %
  van het scherm) en iPad; 4 versie;
  - mutatieproef: 17 mutaties;
  - les: **een voorbeeld dat met "proef"-keuzes rekent, moet die altijd
    weer weghalen** (`finally`); anders toont de tabel iets wat niet
    bewaard is (mutatie `proefLek`);
  - les: in de pdf staat een kolomkop over twee regels, en pdfplumber zet
    de tekst van naastliggende kolommen ertussen: zoek de delen apart;
  - les: `ALLEEN` is een lijst met komma's: `ALLEEN=1,3`. Met `ALLEEN=13`
    draait er niets en staat er toch "Alles goed" (zo gebeurd bij v121);
  - les: de instellingen op Toebehoren staan pas in de pagina als ze
    opengeklapt zijn (`.tb-inst-kop` aantikken);
  - niet getest: echte Safari (de balk met `env(safe-area-inset-bottom)`
    boven de thuisbalk van de iPhone; `:has()` voor het berichtje boven de
    balk werkt vanaf iOS 15.4), Android, Windows.
- `test-v122.js` (24-10): het back-upaccount (`alleen_lezen`) en een
  oud-collega staan niet in `glasGebruikers`; vóór script 27 (geen kolom)
  werkt het ook (de namaak weigert een vraag naar een onbekende kolom, zoals
  de echte database: `S.zonderKolom`); LEESMIJ van 💾 verwijst naar
  "Back-up terugzetten" in BEHEER; 3 mutaties.
  - Script 27 zelf: proef tegen PostgreSQL 16 met de Supabase-namaak
    (`proef27.sh`: 42 controles, o.a. het back-upaccount kan alles lezen en
    niets schrijven, ook niet via `glas_bewerken`/`glas_bestellingen_erbij`;
    nummering 1, 2 (ingetrokken), 2; terugdraaien), 8 mutaties; in de zip
    "niet-in-repo".
  - De back-uptaak (`backup.py` v3, privé repo): `test_backup.py` met een
    nagebootste Supabase én Dropbox (inloggen, bladzijden, ook als Supabase
    minder per keer geeft; opslag-lijst met mappen; Supabase-toegang die
    halverwege verloopt; Dropbox list/continue, 409 not_found, 150 MB-grens
    en uploaden in delen, Dropbox vol, opruimen dat niet mag): 34
    controles, 13 mutaties. Niet getest: de echte Supabase, Dropbox en
    GitHub Actions.
- `test-v123.js` (26-10, de bekende punten uit de controles van v90 en
  v103): 1 zoeken (klantnaam zonder script 29; met script 29 zonder accent
  en meer woorden; de zoekfunctie maar één keer proberen), 2 taken zonder
  eigenaar of van een oud-collega (label, keuzelijst bij naam), 3 import:
  regels met alleen tekst genoemd, 4 import uit een **echte pdf** (jsPDF,
  gelezen door pdf.js uit `lib/`) met een lege cel, 5 dubbele merkletters
  (venster = uitkomst; bestelde ruit houdt zijn letter), 6 foto draaien
  (dubbel tikken, tekstvak), 7 tekenen (gum op tekst, ↶ na kleur, streek,
  tik), 8 ↶ per tabel (speling, heen en weer, dubbele ruit), 9 een foto die
  nog verwerkt wordt bij het wisselen van project, 10 ‹Apart bewaren en
  doorgaan› zonder bereik, 11 uitloggen wist de kopie, 12 PDF invoer
  (roedenopmerking, foto niet op te halen), 13 leverweek met jaartal, 14 ✕
  op de laatste twee vensters, 15 het spoor met een tik (iPad), 16 versie,
  17 nummers die de database (script 28) zou weigeren: de app zet ze bij het
  openen recht, ook in apart bewaard werk; 34 mutaties.
  - les (onafhankelijke controle, 26-10): **samenvoegen is ook wijzigen.**
    De eerste bouw voegde twee pdf-cellen onder één kop samen ("2 1000") in
    de veronderstelling dat stap 3 dat weigert; maar spaties in een maat
    tellen niet, dus het werd 21000. Nu: niet samenvoegen, weigeren. En: een
    nummer "corrigeren" moet tegen dezelfde grens als de database (de app
    maakte van 1000000000 een 1000000001);
  - les: **traag maken waar het in het echt traag is**: verkleinen en
    draaien gaan in Chromium binnen een paar milliseconden; de proef maakt
    `canvas.toBlob` 1,2–1,8 s trager (zoals een iPad), anders komt de
    tweede tik of het wisselen van project nooit tíjdens het werk;
  - les: **twee beveiligingen op één plek: test ze elk apart.** De mutatie
    die het slot bij draaien weghaalde, werd eerst niet gevangen: de tweede
    controle (is de foto intussen veranderd?) hield het ook tegen. Nu kijkt
    de test ook naar de melding "Even geduld";
  - les: **"heen en weer" bij ↶ per tabel ontstaat pas na een wijziging in
    een ándere tabel** (dan ligt er een stap bovenop die deze tabel nog in
    de nieuwe stand heeft). Een test met twee wijzigingen in dezelfde tabel
    ziet het niet;
  - les: Chromium trekt een tik met de vinger naar het dichtstbijzijnde
    knopje (het vinkje in het ruitnummer); Safari doet iets vergelijkbaars.
    Daarom toont de app het spoor ook bij het aanvinken met de vinger;
  - les: punten buiten het scherm (`page.mouse`) komen nergens aan: een
    grote foto is hoger dan het venster;
  - Script 28 en 29: proef tegen PostgreSQL 16 met de Supabase-namaak
    (`proef28.sh`: 57 controles: veiligheidsstop + alles of niets,
    prullenbak telt niet mee, gewoon werk gaat door, wat niet klopt wordt
    geweigerd, versie bij nieuw project en 5+ cijfers = 0, ruimtemeter
    alleen voor collega's, zoeken (accent, klant, woorden, prullenbak, oud-
    collega ziet niets), terugdraaien en de volgorde 26 → 27 → 28),
    18 mutaties; daarnaast de vragen van de app (`or()` met
    `data->info->>klant`, de `rpc`, een ontbrekende functie = PGRST202)
    tegen een **echte PostgREST 12.2** met de echte `supabase-js` uit
    `lib/`. In de zip "niet-in-repo". Niet getest: de echte Supabase.
  - De back-uptaak v4: `test_backup.py` 35 controles, 14 mutaties (nieuw:
    de uitleg van Dropbox bij een geweigerde koppeling).
- **v124** (27-10, wensen van Jan; vijf onderdelen, door aparte bouwers
  gebouwd en samengevoegd, daarna een onafhankelijke controle, een
  beveiligingscontrole van script 30 en een tester van werkgangen):
  - `test-v124-rechten.js` (±4 min, 39 mutaties): rollen en rechten met een
    namaak van script 30 in de test (die moet meeveranderen met de SQL),
    Beheer, werkvloer-foto's (ook zonder bereik), bestelrecht uit terwijl
    iemand bestelt, geblokkeerd terwijl iemand werkt, opruimen na 30 dagen,
    apart bewaren zonder recht op nieuw, foto's die een aparte kopie nog
    noemt;
  - `test-v124-werkpunten.js` (±2 min, 37 mutaties; `OUD123=/tmp/live123` =
    git archive van v123): projectnaam op 390/820/1280, maatstaat met "Max
    incl. band" (xlsx en csv uit Windows Excel), glastypes grijs, spacer
    heen en terug, een oud project zonder spacer telt niet als gewijzigd;
  - `test-v124-herstel.js` (±3 min, 36 mutaties): de ↶-fout met bolletjes
    (Safari: een knop krijgt bij een klik geen focus, nagebootst), ↶ na
    herladen, de stapel vervalt na een wijziging elders, "Onlangs
    verwijderd" (ook na een bestelling, bolletjes op meer tekeningen),
    werkvloer-foto en ↶, twee tabbladen;
  - `test-v124-tekeningen.js` (±2,5 min, 27 mutaties): maatstaat + pdf van 3
    pagina's (nagemaakt), aanwijzen op elke tekening met vinger en pen, een
    ruit verdeeld, verhuizen en ↶/↷ per tabel, pdf's teruggelezen;
  - `test-v124-toebehoren.js` (±1 min, 40 mutaties; `AFDRUK=voor|na` voor
    schermafdrukken): de latkiezer (plaatje, toetsenbord, sluiten, op slot),
    de nieuwe indeling, latzijde "geen" bij Toepassen;
  - `test-v124-cycli.js` (±5 min, 7 mutaties): zeven complete werkgangen over
    de onderdelen heen, met meer apparaten en storingen (project van begin
    tot eind, per ongeluk weggegooid, werkvloer op de bouw, rechten die
    veranderen, prullenbak en opslag, update v123 → v124, twee tabbladen).
    Regels met "LET OP" zijn opmerkingen, geen fout;
  - script 30: proef tegen PostgreSQL 16 (`proef30.sh`, 175 controles;
    `mutaties30.py`, 67 mutaties) en de app tegen een **echte PostgREST
    12.2** met de echte `supabase-js` (`app-echt.js`, 39 controles). In de
    zip "niet-in-repo";
  - les: **onderdelen die apart groen zijn, zijn samen nog niet groen.** De
    fouten zaten in de naden: een werkvloer-foto en de ↶-stapel, ↶ per tabel
    en een verhuisde ruit, een aparte kopie die de foto's van het origineel
    gebruikt terwijl het opruimen de map van het origineel leegmaakt. Een
    test van werkgangen over alles heen vond ze;
  - les: **een stapel die blijft bestaan (IndexedDB), moet weten of hij nog
    klopt.** ↶ na herladen mag alleen als de stand precies dezelfde is;
  - les: **Safari geeft een knop bij een klik geen focus**: het invoervak
    blijft actief terwijl de knop zijn werk doet. Dat was de oorzaak van
    "het bolletje komt terug" (Jan, MacBook).
- **v125** (27-10, klein en zonder agents gebouwd, volgens de werkafspraak
  van 27-10 in de projectkennis, `claude/WERKWIJZE-27-10.md`):
  - `test-v125.js` (±3 min, 18 mutaties, alle 18 met de hand bewezen):
    "↩ Verder met" na de prullenbak (ook door een collega, en niets vergeten
    tijdens zoeken), de naam in de prullenbak vrij met een namaak van script
    31 in de test (die moet meeveranderen met de SQL), "(2)" bij
    terugzetten en bij het openen, twee mensen tegelijk dezelfde naam
    (23505), de werkvloer met leverfoto (ook zonder bereik) en taken zonder
    eigenaar, spacer zwart weg bij glas zonder spouw (niet bij een leeg type)
    en op de werkvloer-pdf, een verhuisde ruit houdt zijn glasmaat (kenmerk
    gelijk, geel met uitleg), de onderlat met plaatjes. Gebouwd op de
    nabootsing van `test-v124-rechten.js` (gekopieerd; de tests ombouwen naar
    één gedeelde nabootsing is een aparte klus);
  - script 31: proef tegen PostgreSQL 16 (`proef31.sh`, met de mutaties
    met de hand); in de zip "niet-in-repo";
  - les: **een tweede weg naar hetzelfde.** Een project openen gaat via
    `cloudOpen` én via het webadres (`start()`, ook na herstarten). De
    naam overnemen na "(2)" zat eerst alleen in de eerste; de test opende
    via het webadres en vond het.
- **Valkuil (v109): het afgeschermde inlogkader.** Playwright zet zijn
  hulpscripts (`addInitScript`) in élk kader, ook in `#cloudLoginKader`, dat
  `sandbox` heeft. Dat geeft meldingen met "sandboxed" (SecurityError bij
  localStorage, "Blocked script execution"). Dat is de testopzet, niet de app:
  in dat kader draait in een echte browser niets. De Chromium-reeksen negeren
  alleen meldingen met "sandboxed".
