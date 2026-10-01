# Glasopname v87 — startscherm, taken met eigenaar, en een spoor van wijzigingen

*1 oktober 2026. Eén blok in plaats van vier losse versies: een startscherm na
het inloggen, het project in het webadres, taken met een eigenaar, en een
zichtbaar spoor van wie wat wanneer veranderde — per project én per ruit.
Plus twee bugfixes die tijdens het testen boven water kwamen.*

---

## Installeren — eerst de database, dan de bestanden

**Stap 1. Draai het SQL-script.** Open in Supabase → *SQL Editor* het bestand
`13_taken_en_geschiedenis.sql` uit deze zip en voer het uit. Het maakt twee
tabellen (`taken` en `projectgeschiedenis`), twee kolommen bij `projecten`
(`samenvatting` en `gewijzigd_naam`), de bijbehorende RLS-regels en twee
triggers, en het zet bestaande taken over uit de project-JSON. Het script is veilig om nog eens te draaien: alles staat met
`if not exists` en `create or replace`.

**Stap 2. Zet de bestanden op GitHub** (`index.html`, `cloud.js`, `start.js`,
`project.js`, `pdf.js`, `sw.js`). `start.js` is **nieuw** — die moet er echt
bij, hij staat al in `index.html` en in de lijst van `sw.js`.

**Let op:** `config.js` zit níet in de zip en moet blijven staan zoals hij is.

Draai je stap 2 vóór stap 1, dan blijft de app werken: hij merkt zelf dat de
tabellen en kolommen er nog niet zijn, slaat op zonder het spoor en haalt de
taken uit het project zelf. Zodra het script wél gedraaid is, komt alles
vanzelf op zijn plek. Andersom (eerst SQL, dan bestanden) kan ook; de oude
versie heeft van de nieuwe tabellen geen last.

---

## 1. Een startscherm in plaats van meteen de invoer

Na het inloggen kom je nu op een startscherm en niet meer in het laatste
project dat deze browser toevallig onthouden had. Dat was de bron van twee
ergernissen: op de iPad stond iets anders open dan op de telefoon, en je kon
onbedoeld in een project typen waarvan je dacht dat het een ander was.

Het startscherm heeft drie delen:

* **↩ Verder met …** — het project waar je het laatst in zat, één tik weg.
* **Mijn taken** — alle openstaande taken op jouw naam, over alle projecten
  heen. Tikken op een taak opent het project; op het rondje afvinken.
* **Projecten** — de hele lijst met zoekveld, aantal ruiten, adres, datum,
  wanneer en door wie er het laatst gewijzigd is, het aantal open taken, een
  status (*besteld* / *afgerond*) en een prullenbak per regel.

Zodra je een project kiest verdwijnt het startscherm en staat de invoer er
zoals altijd. Bovenin zie je dan **← Projecten** met de projectnaam ernaast;
dat is de weg terug.

Nieuw bestand: `start.js` (alleen weergave; het ophalen zit in `cloud.js`).

## 2. Het project staat in het webadres

Open je een project, dan komt het id in de adresbalk te staan:

```
…/glasopname/#project=11111111-1111-4111-8111-111111111111
```

Die link kun je delen of bewaren: hij opent bij iedereen hetzelfde project.
Terug naar het startscherm maakt het adres weer schoon. Ga je in de browser
terug of vooruit, dan volgt de app het adres.

## 3. Taken met een eigenaar, in hun eigen tabel

Taken stonden in het project zelf (in de JSON) en waren daardoor onzichtbaar
zolang je het project niet open had. Ze staan nu in een eigen tabel:

* Elke taak heeft een **eigenaar** — dat is degene die hem aanmaakt. Een taak
  zonder eigenaar kun je met **+ mij** op je eigen naam zetten.
* De eigenaar staat als naamplaatje achter de taak; je eigen naam is rood.
* Afvinken legt vast **wie** afvinkte en **wanneer**.
* Het aantal open taken staat bij het project in de lijst. Dat getal houdt de
  database zelf bij (trigger `tel_open_taken`), dus het klopt ook als een
  collega iets afvinkt.
* Taken die nog in een oud project zitten, verhuizen bij het openen van dat
  project één keer automatisch naar de tabel.

Staat de tabel er nog niet (SQL-script niet gedraaid), dan werkt het oude
gedrag gewoon door, met een regeltje in de console.

## 4. Het spoor: wie veranderde wat, en wanneer

Jij wilde geen slot op de bestellijst, maar wél kunnen zien wat er na het
bestellen nog veranderd is, en door wie. Dat zit er nu op drie plekken.

**Per ruit.** Elke keer dat er opgeslagen wordt, krijgen de ruiten die
veranderd zijn jouw naam en het tijdstip mee (`gewDoor`, `gewOp`). Houd je de
muis op het regelnummer, dan zie je "Laatst gewijzigd door julian, vandaag
14:12". Op een aanraakscherm blijft die tekst verborgen — daar zie je alleen
het bolletje; wie wat deed lees je dan in het logboek of in de notitie onder
de bestellijst. (Wil je die tekst ook op de iPad kunnen aantikken, zeg het
dan, dan hang ik hem aan het info-ballonnetje.)

**Per project.** De database houdt een logboek bij: bij elke opslag wordt de
vorige stand bewaard met wie en wanneer, plus een samenvatting in gewone taal
("2 ruiten gewijzigd, 1 ruit toegevoegd"). Je ziet dat logboek op
**Projectgegevens → Logboek**, de laatste twintig regels, nieuwste bovenaan.
Het logboek groeit niet onbeperkt: de database ruimt zelf op tot twintig
regels per project, en legt alleen iets vast als er meer dan twee minuten
tussen zit of als iemand *anders* aan het werk is. Twintig kleine tikjes van
dezelfde persoon in één minuut leveren dus één regel op, niet twintig.

**Na de bestellijst.** Maak je de bestellijst-PDF, dan legt de app van elke
ruit een vingerafdruk vast (maten, glastype, opbouw, rooster, bewerking,
roeden — zie `KENMERK_VELDEN`). Verander je daarna iets aan zo'n ruit, dan:

* staat er een rood bolletje bij het regelnummer op Invoer, met in de tekst
  "Gewijzigd ná de bestellijst van …";
* staat bovenaan de bestellijst een balk: *"Bestellijst gemaakt op … Daarna
  zijn er 2 ruiten gewijzigd."*;
* staat onder de bestellijst een notitie met de merken van die ruiten en het
  advies om de wijziging door te geven of een nieuwe bestellijst te maken.

Er wordt dus niets geblokkeerd — je kunt altijd door — maar je kunt het ook
niet meer per ongeluk over het hoofd zien.

**In de PDF.** Op het **totaaloverzicht** (het archiefbestand) staat onderaan
één regel met het spoor: wanneer de bestellijst gemaakt is en of er daarna nog
iets gewijzigd is, door wie. De bestellijst voor de leverancier blijft
ongewijzigd — daar hoort die regel niet op.

## 5. Na twee uur stilstand terug naar het startscherm

Laat je de app open staan en kom je er een halve dag later bij, dan sluit hij
het project na twee uur stilstand netjes af en keert terug naar het
startscherm, met een melding waarom. Staat er dan nog werk open dat niet
omhoog is, dan blijft het project juist open staan — werk wordt nooit
weggegooid om deze reden.

## 6. Bugfix: de valse melding "je werk gaat verloren"

Bij het kiezen van een project kwam soms de vraag of je het openstaande werk
wilde weggooien, terwijl je nog niets gedaan had. Oorzaak: de app zette de
vlag *"nog niet verstuurd"* al bij het opstarten, als hij zichzelf klaarzette
met lege regels. Vanaf nu gaat die vlag alleen aan als er een project open is
**en** je echt iets getypt, gekozen of getekend hebt.

## 7. Bugfix: een link met een project erin raakte zijn koppeling kwijt

Dit kwam uit de nieuwe testreeks. Kwam de app twee keer langs zijn
opstartroutine — bijvoorbeeld als je inlogt op een pagina die al
`#project=…` in het adres had — dan stond het project wél in beeld, maar was
de koppeling met de database losgelaten. Alles wat je daarna typte, bleef
lokaal staan en ging nooit omhoog. Precies het soort stille fout waar v83 ook
over ging.

Het opstarten is nu *idempotent*: een project in het webadres wint altijd en
blijft open, en een project dat al binnen is wordt niet een tweede keer
opgehaald (dat zou het werk op het scherm overschrijven met de stand van de
server). Twee nieuwe controles in `test-start.js` houden dit vast.

---

## Wat er getest is

Tien testreeksen, twee keer achter elkaar volledig groen gedraaid:

| Reeks | Wat hij nagaat |
|---|---|
| `test-start.js` | startscherm, project in het webadres, taken, het spoor, het logboek, verwijderen vanaf het startscherm, en de app mét SQL-script én zonder |
| `test-herstel.js` | de v83-fouten: verdwenen invoer, speling, glasmaten, markering na de bestellijst |
| `test-cloudguard.js` | de rem op een onvolledige opname, de lokale kopie, geen valse vlag |
| `test-verbinding.js` | "Geen verbinding" die blijft staan, herstel na slaapstand |
| `test-verwijderen.js` | project verwijderen, ook zonder foto's en zonder rechten |
| `test-rook.js` | de app start, alle tabbladen openen, PDF's komen eruit |
| `test-index.js`, `test-naslag.js` | versienummers gelijk, catalogus en naslag kloppen |
| `test-leverpagina.js`, `test-leverpagina.py` | de PDF's zelf, nagelezen met pdfplumber |

**Wat niet getest kon worden, en waar ik dus op je eigen ogen vertrouw:**

* **De echte Supabase.** De tests praten met een nagebootste database. Het
  SQL-script is nagelopen op syntaxis en logica, maar is hier niet tegen een
  echte Postgres gedraaid. Kijk na het draaien of je bij *Table editor* de
  tabellen `taken` en `projectgeschiedenis` ziet, met RLS aan.
* **Safari op iPad en iPhone.** De tests draaien op Chromium. Let bij het
  eerste gebruik op het startscherm op een telefoon (de projectlijst is daar
  één kolom) en op de info-ballonnetjes bij het regelnummer.
* **Twee apparaten tegelijk in hetzelfde project.** Het live bijwerken is
  getest met nagebootste berichten, niet met twee echte iPads. De laatste die
  opslaat wint nog steeds — dat verandert v87 niet, maar in het logboek is nu
  wél te zien dat het gebeurd is.
* **De twee uur stilstand** is getest met een verkorte klok, niet door twee
  uur te wachten.

---

## Gewijzigde bestanden

| Bestand | Wat |
|---|---|
| `13_taken_en_geschiedenis.sql` | **nieuw** — tabellen, kolommen, RLS, triggers. Eerst draaien. |
| `start.js` | **nieuw** — het startscherm |
| `index.html` | startscherm-opmaak, kopbalk met projectnaam, logboek op Projectgegevens, spoor bij het regelnummer, balk en notitie op de bestellijst, `APP_VERSIE` v87 |
| `cloud.js` | startscherm-routering, project in het webadres, taken-API, het spoor en de samenvatting, twee uur stilstand, de bugfixes |
| `project.js` | taken tegen de nieuwe tabel, met eigenaar; het logboek |
| `pdf.js` | bestelling vastleggen, spoorregel op het totaaloverzicht, `PDF_VERSIE` v87 |
| `sw.js` | `start.js` erbij, `VERSIE` v87 |
| `test-start.js` | **nieuw** — de testreeks voor dit alles |
| `test-herstel.js`, `test-cloudguard.js`, `test-verbinding.js` | bijgewerkt op het nieuwe gedrag |

De drie versienummers (`APP_VERSIE`, `PDF_VERSIE`, `VERSIE` in `sw.js`) staan
alle drie op `v87`.
