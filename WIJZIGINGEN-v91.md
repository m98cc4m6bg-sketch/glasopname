# Glasopname v91 — de doorlichting van v90 weggewerkt

*12 oktober 2026. De acht punten uit `BEVINDINGEN-audit-v90.md`, in de volgorde
met de minste kans op nieuwe fouten. Bovenaan staat de afvinklijst. Daaronder
per punt wat er misging en wat er nu gebeurt, en wat er wel en niet getest is.*

---

## Installeren — in deze volgorde

1. **Twee SQL-scripts** in Supabase → *SQL Editor*, elk apart *Run*:
   * `17_vsg_1010.sql`: dikte en gewicht van VSG 10.10.x. De controle onderaan
     hoort drie keer `20 · 50` te geven.
   * `18_prullenbak.sql`: de prullenbak. De controle hoort drie kolommen te
     geven: `verwijderd_door`, `verwijderd_naam`, `verwijderd_op`.

   Allebei mogen ze vaker gedraaid worden.
2. **De mailfunctie opnieuw uitrollen.** Ga in Supabase naar *Edge Functions*
   → `mail`, plak de inhoud van `supabase/functions/mail/index.ts` erin en
   kies *Deploy*. Er is één regel bijgekomen. *Verify JWT* blijft aan.
3. **De bestanden** in de map van de repo zetten (bestaande overschrijven),
   committen en pushen met GitHub Desktop:
   * de **nieuwe map `lib/`**, met submappen. Die moet er helemaal bij, anders
     start de app niet;
   * `index.html`, `cloud.js`, `start.js`, `project.js`, `pdf.js`, `import.js`,
     `fotos.js`, `teken.js`, `undo.js`, `bulk.js`, `blokbalk.js`, `merken.js`,
     `melding.js`, `sw.js`, `manifest.webmanifest`;
   * nieuw: `CLAUDE.md`, `.gitignore`, `17_vsg_1010.sql`, `18_prullenbak.sql`.
     `.gitignore` is in Finder onzichtbaar (de punt ervoor); met
     **Cmd+Shift+.** zie je hem wel;
   * de testreeksen: nieuw zijn `test-v91.js` en `test-offline.js`; bijgewerkt
     zijn `test-index.js`, `test-import.js`, `test-start.js`, `test-verwijderen.js`,
     `test-verbinding.js`, `test-mail-en-slot.js`, `test-rook.js`,
     `test-leverpagina.py` en `test-sql.sql`.

   `config.js` zit er niet bij en blijft zoals hij is.
4. **Twee bestanden weggooien** in de repomap (GitHub Desktop ziet dat als een
   wijziging die je meecommit): `LEES-DIT-EERST.md` (achterhaald) en
   `.DS_Store`. Die laatste is verborgen in Finder. Dat hij niet meer
   terugkomt, regelt de nieuwe `.gitignore`.
5. Op elk apparaat één keer **↻ Bijwerken**. Linksboven moet **v91** staan,
   en in de console `[pdf] v91`.

Draai je stap 3 vóór stap 1, dan merkt de app het zelf. Zonder script 18
verwijdert hij zoals vroeger (definitief, met de oude vraag). Zonder script 17
zet hij de drie VSG-waarden zelf goed en zegt dat in de console. Er gaat niets
stuk, maar draai de scripts wel.

---

## Afvinklijst

Elk punt uit de doorlichting, met waar het getest wordt.

**Punt 1 — Cmd+Z en ↶ blijven in hun eigen project**
- [x] De ongedaan-stapels gaan leeg bij een ander project, een nieuw project,
      terug naar het startscherm of de versie van een collega (`test-v91` §1)
- [x] Hetzelfde voor ↷ per tabel en voor de selectie van ⤓ (`test-v91` §1)

**Punt 2 — Prullenbak in plaats van meteen weg**
- [x] 🗑 zet een project 30 dagen in de prullenbak, met naam en tijdstip (`test-v91` §5)
- [x] Prullenbak op het startscherm, uitklapbaar; iedereen kan terugzetten (`test-v91` §5)
- [x] Na 30 dagen ruimt de app het zelf op, foto's inbegrepen (`test-v91` §5)
- [x] Een link naar een project in de prullenbak opent niet, maar zegt waarom (`test-v91` §5)
- [x] Weggooien en terugzetten staan in het logboek (`test-sql` 14)
- [x] In een venster met een rode knop krijgt Annuleren de aandacht, niet de rode knop
- [x] Taken van een project in de prullenbak staan niet onder *Mijn taken*

**Punt 3 — Het slot**
- [x] Het slot geldt vanaf *besteld* en ook bij geleverd, gemonteerd en afgerond (`test-v91` §2)
- [x] Met de hand terugzetten naar vóór *besteld* kan alleen na ontgrendelen (`test-v91` §2)
- [x] Een tik op de foto zet geen ruit meer bij (`test-v91` §2)
- [x] Het menu van een bolletje (één ruit minder, markering weg, ruit weg) doet niets (`test-v91` §2)
- [x] Bolletjes verslepen en tekenen staan ook vast (jouw keuze: de hele foto) (`test-v91` §2)
- [x] De kolom Corr. en de speling/bijtelling bovenaan doen niets (`test-v91` §2)
- [x] Een geweigerd *ruit verwijderen* laat ook de bolletjes staan (`test-v91` §2)
- [x] Cmd+Z na ontgrendelen zet status en bestelling niet terug (`test-v91` §2)

**Punt 4 — Bestellen en logboek**
- [x] Komt het antwoord op de bestelmail niet aan, dan kijkt de app bij de
      database na of hij toch verstuurd is (`test-v91` §4)
- [x] Een oudere stand zet *besteld* niet meer terug, ook niet vanaf een ander
      apparaat (`test-v91` §3)
- [x] Een tweede bestelmail krijgt een duidelijke waarschuwing (`test-v91` §4)
- [x] Twee keer tikken geeft één mailvenster (`test-v91` §4)
- [x] De melding noemt de adressen waar hij werkelijk heen ging
- [x] De bestelmail krijgt een eigen regel in het logboek, en de regel ervoor
      blijft staan (`test-sql` 15, 15b, `test-v91` §4)
- [x] "Open taken" op het startscherm wordt niet meer bij elke opslag op 0
      gezet (`test-v91` §3)

**Punt 5 — Pdf en gegevens**
- [x] De voettekst staat weer op de liggende bestellijstpagina's
      (`test-leverpagina.py` §5, met pdfplumber)
- [x] VSG 10.10.2 en 10.10.4 zijn 20 mm en 50 kg/m², in index.html én in de
      database (`test-v91` §6, `test-sql` 13)

**Punt 6 — Import**
- [x] Wat er in het bestand staat, komt als tekst op het scherm, nooit als
      HTML (`test-import` §18)
- [x] Een aanhalingsteken dat niet sluit (ditto ") slokt de rest niet meer
      op (`test-import` §17)

**Punt 7 — Offline en bibliotheken**
- [x] Alle bibliotheken staan in `lib/`, op een vaste versie, en zitten in
      de cache vanaf de installatie (`test-index`, `test-offline`)
- [x] Supabase staat vast op 2.117.2 in plaats van "de nieuwste 2.x"
- [x] Na één mislukte poging blijven pdf en import niet meer kapot tot je
      herlaadt
- [x] pdf.js leest bestanden met `isEvalSupported: false` (bekend lek in 3.11)

**Punt 8 — Repo opruimen**
- [x] `manifest.webmanifest`: `theme_color` op wit (de stap uit v70)
- [x] `CLAUDE.md` met de vaste afspraken
- [x] `.gitignore` voor `.DS_Store` en test-pdf's
- [ ] **Jij:** `LEES-DIT-EERST.md` en `.DS_Store` weggooien (stap 4 hierboven)
- [x] Testharnas `test-mail-en-slot.js` crasht niet meer

**Geparkeerd, op jouw verzoek**
- [ ] Beheerpagina voor de keuzelijsten. Staat in de handover (§11) met de
      momenten waarop ik je eraan herinner.

---

## Per punt

### 1. Cmd+Z nam het vorige project mee

`undo.js` bewaart momentopnames van het hele project, maar maakte die lijst
nooit leeg. Bewerkte je project A, opende je B en deed je Cmd+Z, dan zette de
app de inhoud van A, inclusief de naam, in B. De volgende opslag schreef dat
naar B in de database. ↶ per tabel deed hetzelfde voor de losse maten, en de
selectie van ⤓ wees na het wisselen naar andere ruiten, omdat ruitnummers per
project bij 1 beginnen.

Nu ruimt `zetStaat()` in `cloud.js` alles op zodra er andere inhoud
binnenkomt: de stapels, ↷ per tabel en de selectie. Dat geldt ook voor de
versie van een collega. Eén Cmd+Z zou anders zijn werk stilzwijgend
terugdraaien.

### 2. De prullenbak

Een project verwijderen haalde alles in één keer weg, voor iedereen: de rij,
de taken, het logboek mét de bewaarde vorige standen, en de foto's. Er is
geen back-up op het gratis plan.

Nu (jouw keuze):

* 🗑 vraagt *"Naar de prullenbak?"* en zegt dat het 30 dagen terug kan.
* Op het startscherm staat onder de projecten een **🗑 Prullenbak**. Die is
  dicht tot je erop tikt, en onzichtbaar zolang hij leeg is. Per project zie
  je wie het weggooide, wanneer, en hoeveel dagen het nog blijft, met de
  knoppen *Terugzetten* en *Nu definitief verwijderen*.
* Na 30 dagen haalt de app het definitief weg. Dat gebeurt de eerste keer dat
  iemand daarna het startscherm opent, met foto's en al. Het moet de app
  zijn, niet de database: foto's kunnen alleen via de app weg.
* Gooit een collega het project weg dat jij open hebt, dan krijg je één
  melding en gaat het project dicht. Had je nog werk openstaan, dan gaat dat
  eerst omhoog en blijft het project open, zodat er niets verloren gaat.
* Een link naar een project in de prullenbak opent niet, maar zegt waar het
  staat.
* Een nieuw project met de naam van een project in de prullenbak: de app zegt
  dat die naam in de prullenbak staat.

Kleiner, maar uit dezelfde hoek: in een venster met een rode knop
(*Definitief verwijderen*, *Alles wissen*) krijgt nu *Annuleren* de aandacht.
Een Enter die nog onderweg was, bevestigde anders meteen.

### 3. Het slot

**Vanaf besteld, en alles daarna.** Tot v90 gold het slot alleen bij precies
de status *besteld*. Zette iemand de status op *geleverd*, dan stond alles
weer open, zonder wachtwoord. Nu geldt het voor besteld, geleverd, gemonteerd
en afgerond.
* Vooruit van status wisselen (besteld → geleverd) kan gewoon.
* Terug naar *aangemaakt* of *bezig* kan alleen na **Ontgrendelen** met je
  wachtwoord. Doe je het daarvóór, dan zegt de app dat.

**De hele foto staat vast** (jouw keuze). Tot v90 kon je in een besteld
project:
* op de foto tikken, en dan kwam er een nieuwe ruit bij;
* via een bolletje "één ruit minder" kiezen, en dan ging het aantal op de
  bestelregel omlaag;
* in de kolom Corr. of bij de speling/bijtelling bovenaan de glasmaat
  veranderen.

Dat kan allemaal niet meer. Ook tekenen, bolletjes verslepen of weghalen,
foto's draaien, toevoegen of verwijderen staan vast. Na *Ontgrendelen* werkt
alles weer.

Twee dingen die hier vanzelf bij horen:
* Een geweigerd *ruit verwijderen* haalde de bolletjes al weg; die bleven dan
  weg. Dat gebeurt niet meer.
* Cmd+Z na ontgrendelen kon de stand van vóór de bestelling terugzetten,
  inclusief de status. De bestelling, de status en de ontgrendeling doen nu
  niet meer mee met ongedaan maken: dat zijn gebeurtenissen, geen bewerkingen.

### 4. Bestellen

**Het antwoord komt niet aan.** De mailfunctie verstuurt, zet de status in de
database op *besteld*, en dan valt de 4G weg. Tot v90 meldde de app *"niet
verstuurd"*, zette de volgende opslag de status terug, en stuurde wie het nog
eens probeerde de leverancier een tweede bestelling.

Nu onthoudt de app vóór het versturen wanneer het project voor het laatst
besteld is. Mislukt het versturen zonder duidelijke reden, dan kijkt hij bij
de database na: meteen, en na vier seconden nog een keer. Is het intussen
besteld, dan meldt hij: *"het antwoord kwam niet aan, maar de bestelmail is
wél verstuurd — niet opnieuw versturen"*. Zegt de mailfunctie zelf dat het
misging (bijvoorbeeld een adres dat niet bestaat), dan is er niets na te
kijken en zie je de reden meteen.

**Besteld gaat niet vanzelf terug.** De app onthoudt welke status de database
heeft. Staat die op *besteld* of later en heeft het apparaat een oudere stand,
dan neemt de app de status van de database over in plaats van hem terug te
zetten. Dat geldt ook live: bestelt een collega terwijl jij het project open
hebt, dan gaat bij jou meteen het slot erop. Alleen een status die iemand na
ontgrendelen met de hand kiest, mag lager uitkomen.

**Een tweede bestelmail.** Het venster kijkt in het maillogboek of er al een
bestelmail uit is, ook als die van een collega of een ander apparaat kwam. Zo
ja, dan staat er bovenaan in het rood *"Dit project is al besteld op … door …
naar …"* en heet de knop *Toch opnieuw versturen*. Twee keer snel tikken gaf
twee vensters op elkaar; dat kan niet meer.

**Het logboek.** De mailfunctie zette de bestelmail óver de vorige regel
heen, dus *"2 ruiten gewijzigd"* verdween. Nu krijgt hij een eigen regel, en
de opslag die de app daarna doet, werkt die regel bij in plaats van er een
tweede bij te zetten.

**Open taken.** Dat getal houdt de database zelf bij, maar de app schreef bij
elke opslag zijn eigen telling eroverheen. Sinds v87 kwam die uit een lege
lijst, dus na elke wijziging stond er "0 open taken". De app stuurt dat getal
niet meer mee.

### 5. Pdf en gegevens

**Voettekst.** De leverpagina achter de bestellijst is staand. Daarna rekende
de voettekst voor álle pagina's met een paginahoogte van 297 mm, en op een
liggende pagina van 210 mm hoog viel hij eraf. Elke pagina gebruikt nu zijn
eigen maat. Nagelezen met pdfplumber: *"pagina 1 van 2"* staat op 577 van de
595 punten (liggend), *"pagina 2 van 2"* op 824 van 842 (staand).

**VSG 10.10.x.** Gelaagd glas 1010.2, en gehard gelaagd 1010.2 ESG en 1010.4
ESG, stonden op 2 mm en 5 kg/m² in plaats van 20 mm en 50 kg/m². Zo'n ruit
woog in de samenvatting en de pdf dus een tiende van wat hij weegt, en de
roostercontrole gaf een valse waarschuwing. Verbeterd in index.html, in de
database (script 17), en met een vangnet in de app zolang het script niet
gedraaid is. Alle andere 825 combinaties zijn nagerekend en kloppen.

### 6. Import

* **Alles uit het bestand komt als tekst op het scherm.** Kolomkoppen, cellen,
  tabbladnamen en merkletters gingen in stap 2 en in de balk met dubbele
  merken rauw de pagina in. Een cel met `<…>` brak de weergave, of kon zelfs
  code uitvoeren in een ingelogde sessie. Stap 3 deed het al goed; nu de rest
  ook.
* **Een aanhalingsteken dat niet sluit.** Een ditto-teken `"` voor "idem"
  slokte alle regels erna op, zonder dat die als geweigerd telden. Nu leest de
  app zo'n teken als gewone tekst. De regel komt gewoon in het controlescherm,
  met `"` als waarde.

### 7. Offline en bibliotheken

Supabase, jsPDF, autotable, SheetJS en pdf.js kwamen van een CDN.

**Offline.** De bibliotheken kwamen pas bij het eerste gebruik in de cache,
en die cache gaat bij elke update weg. Na een update kon de eerste pdf of
import dus alleen met bereik. Mislukte die zonder bereik, dan bleef hij kapot
tot je herlaadde.

**Vaste versie.** Supabase stond op "de nieuwste 2.x", dus elke update van de
app kon stilzwijgend een andere versie meenemen.

Nu:
* De bibliotheken staan in de repo, in `lib/`, met het versienummer in de
  mapnaam. `lib/LEESMIJ.md` zegt welke versie, welke licentie, en hoe je er
  een bijwerkt.
* De service worker zet ze bij de installatie meteen in de cache. Getest in
  Chromium: na het eerste laden de server uitgezet, opnieuw geopend, en de
  app, Supabase, de pdf-lezer en jsPDF kwamen allemaal uit de cache.
* Mislukt het laden toch een keer, dan ruimt de app die poging op en
  probeert hij het de volgende keer gewoon opnieuw.
* Supabase staat vast op 2.117.2: de versie die op dat moment al ruim twee
  weken uit was, uit dezelfde reeks die de app nu al gebruikte.
* pdf.js leest bestanden met `isEvalSupported: false`. Versie 3.11 heeft een
  bekend lek waarmee een kwaadaardig pdf-bestand code kan uitvoeren, en
  kozijntekeningen komen van buiten.

### 8. Repo

* `manifest.webmanifest` stond nog op het oude donkerblauw; dat is nu wit,
  gelijk aan de kopbalk (de stap uit v70).
* `CLAUDE.md` bevat de vaste afspraken, zodat Claude Code ze vanzelf leest.
* `.gitignore` houdt `.DS_Store` en test-pdf's buiten de repo.
* `test-mail-en-slot.js` crashte in een nieuwe omgeving op een nagekomen
  aanroep in een al gesloten testvenster. Dat lag aan het harnas, niet aan de
  app. Zo'n aanroep wordt nu herkend en genegeerd, alleen die en alleen vlak
  na het sluiten.

### Onderweg meegenomen

* **Zoeken in de projectenlijst.** Een komma of haakje in de zoekterm brak het
  zoeken; die tekens worden nu als spatie gelezen.
* **Escapen.** `esc()` liep stuk op een getal (een merk uit Excel); nu niet meer.

---

## Getest

Twee keer achter elkaar, alles groen:

| reeks | wat |
|---|---|
| `test-v91.js` | **nieuw**, 46 controles, alle punten hierboven op de gegevens. Tegen v90 gedraaid faalt hij op punt 1 t/m 4 en stopt hij daarna (de prullenbak bestaat daar niet); de nieuwe controles in de import- en pdf-reeks falen ook op v90. Ze toetsen dus wat ze moeten toetsen |
| `test-offline.js` | **nieuw**: de service worker in Chromium, server uit, app en bibliotheken uit de cache |
| `test-import.js` | + het open aanhalingsteken en HTML in het bestand |
| `test-leverpagina.js` + `.py` | + de voettekst op elke pagina binnen het blad |
| `test-index.js` | + elke bibliotheek staat op schijf én in de cachelijst van sw.js |
| `test-rook.js` | + Supabase en de bibliotheken komen uit `lib/` |
| `test-start.js`, `test-verwijderen.js` | bijgewerkt: 🗑 gaat naar de prullenbak, *Nu definitief* doet wat 🗑 vroeger deed |
| `test-sql.sql` | + scripts 17 en 18 (twee keer), de logboekregels van de prullenbak en de bestelmail. Op een echte PostgreSQL 16 |
| de rest | `test-naslag`, `test-cloudguard`, `test-herstel`, `test-verbinding`, `test-slot`, `test-mail-en-slot`, `test-mailfunctie.ts` (bun) |

## Niet getest

* **Safari op iPad en iPhone.** Hier draait alleen Chromium. Wat ik
  nagelopen heb aan bekende verschillen:
  * de nieuwe knoppen en vensters gebruiken dezelfde opmaak als de
    bestaande;
  * de prullenbak opent met een tik op de kopbalk (een gewone `onclick`);
  * de speling bovenaan onthoudt zijn waarde bij `focus`, en dat geeft iOS
    bij een keuzevak gewoon.

  Twee dingen kan ik hier niet zien:
  * hoe Safari met de grotere cache omgaat (de bibliotheken zijn samen 2,9 MB;
    Safari heeft eigen grenzen aan wat een service worker mag bewaren);
  * of de waarschuwing in het mailvenster op een iPhone goed leest.
* **De echte Supabase.** De scripts draaiden op PostgreSQL 16 met een namaak
  van Supabase. Of `.is()` en `.not()` in het filter van jouw Supabase-versie
  precies zo werken, zie je zodra de projectenlijst verschijnt. Doet hij dat
  niet, dan zegt de console het.
* **De mailfunctie in Supabase.** Getest met bun en een nagebootste maildienst,
  niet uitgerold. Het "antwoord komt niet aan"-geval is nagebootst; dat kan ik
  niet echt laten gebeuren.
* **Het opruimen na 30 dagen** is getest met een datum die ik terugzette, niet
  door 30 dagen te wachten.

## Zelf even nalopen na het plaatsen

1. Gooi een testproject weg. Het moet uit de lijst gaan en onder 🗑 Prullenbak
   staan. Zet het terug.
2. Zet een testproject op *geleverd* en probeer een maat te wijzigen, op de
   foto te tikken en te tekenen. Alles moet geweigerd worden. Ontgrendel en
   probeer het opnieuw.
3. Maak een bestellijst-pdf van een project met meer dan één pagina en kijk
   onderaan elke pagina.
4. Zet de iPad in vliegtuigstand na ↻ Bijwerken en maak een pdf.
