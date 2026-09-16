# Glasopname — overdracht

Lees dit eerst. Daarna kun je meteen aan het werk zonder de oude chat.
Geschreven op v65, 15 september 2026.

---

## 1. Wat het is

Webapp voor Jelier Bouw B.V. (aannemer, Dordrecht) om glas in te meten,
maten te beheren en bestellijsten te maken voor de glasleverancier.

- **Gebruikers:** Jan (kantoor, Mac) en buitenpersoneel (iPad met Apple
  Pencil, iPhone). Werkt regelmatig zonder bereik.
- **Gehost op:** GitHub Pages (statisch, publieke repo).
- **Gegevens:** Supabase (gratis laag), project-JSON in Postgres, foto's
  in Storage.
- **Taal:** alles Nederlands — code-commentaar, variabelenamen, UI.
- **Versie:** `APP_VERSIE` in index.html, `VERSIE` in sw.js en
  `PDF_VERSIE` in pdf.js, alle drie gelijk, elke oplevering +1.
- **Leverancier:** Van Noordenne. Het assortiment in de app komt uit hun
  online showroom.

---

## 2. Bestanden

| Bestand | Regels | Doel |
|---|---|---|
| `index.html` | 2532 | Opmaak, tabbladen, tabelweergave, berekeningen, CSV, menu's |
| `fotos.js` | 1171 | Foto/tekening-blokken, merkbolletjes, zoomen, draaien, leverfoto |
| `pdf.js` | 963 | Beide pdf's, leverpagina, afleveren (map/deelvenster/download) |
| `cloud.js` | 781 | Supabase: inloggen, projecten, opslaan, offline, live bijwerken, app-updates |
| `teken.js` | 730 | Tekenlaag: pen, vormen, tekst, selectie, verslepen |
| `naslag.js` | 563 | Tabblad Naslag: glascatalogus met foto's, keuzelijst Glasbewerking, tabellen |
| `import.js` | 504 | Sponningmaten uit PDF/XLSX/CSV/plaktekst, kozijnnummering |
| `project.js` | 447 | Tabblad Project: klant, adreszoeken, levering, taken |
| `bulk.js` | 345 | Selectie, doorvoeren per kolom (⤓) |
| `merken.js` | 208 | Dubbele merkletters opsporen en oplossen |
| `undo.js` | 197 | Momentopnames, Cmd+Z (hele project) |
| `kopie.js` | 180 | Dupliceren, kopiëren naar groep, gelijktrekken |
| `sw.js` | 178 | Service worker: offline, versiecontrole, catalogusfoto's |
| `blokbalk.js` | 172 | Bediening per invoertabel (ongedaan/leeg/speling) |
| `config.js` | 20 | **Alleen bij Jan ingevuld** — URL + sleutel. Nooit overschrijven. |

Verder: `logo.png`, `logo-wit.png`, `favicon.ico/.png`, `apple-touch-icon.png`,
`icon-192/512.png`, `manifest.webmanifest`, en de map `catalogus/` met 61
foto's van glassoorten.

Hulpbestanden die niet bij de app horen maar wel in de repo staan:
`catalogus-fotos.txt` (bestandsnaam + bron-URL per foto),
`fotos-ophalen.sh` (haalt ze op en verkleint ze met sips),
`test-index.js`, `test-naslag.js`, `test-leverpagina.js`,
`test-leverpagina.py`.

Scriptvolgorde in index.html is betekenisvol: `cloud → import → bulk →
project → blokbalk → fotos → kopie → teken → merken → naslag → pdf → undo`.
`undo.js` en `merken.js` omhullen functies van eerder geladen bestanden.

---

## 3. Gegevensmodel

**Tabel `projecten`:** `id, naam, datum, status, data (jsonb),
aantal_ruiten, adres, open_taken, gewijzigd_door, created_at, updated_at`.
De losse kolommen bestaan zodat de projectlijst niet de volledige `data`
hoeft op te halen; de app werkt ze bij elke opslag bij.

**`data`** = de hele opname:
```
{ rijen: [...], volgendId, fotos: [...], info: {...}, taken: [...],
  project, datum, speling, bijtelling }
```

**Een rij (ruit):** `id, aantal, merk, maatsoort, breedte, hoogte,
correctie?, fotoId?, glasType, opbouw, rooster, ducoType, ralKleur,
glasbewerking, opmerking, roedenverdeling, roedenbreedte,
roedenopmerking` + berekend: `glasBreedte, glasHoogte, totaalDikte, kgM2`.
Rijen zonder `fotoId` zijn "losse maten".

**Een foto/tekening:** `id, soort?('lever'), bron('foto'|'tekening'),
pad, titel, breedte, hoogte, zoom?, speling?, bijtelling?,
markeringen: [{rijId, x, y}], inkt: [...]`.
`x/y` zijn verhoudingen 0–1 van de afbeelding.

**Een streek (inkt):** `{t:'pen'|'lijn'|'pijl'|'rect'|'tekst', k(kleur),
d(dikte), p:[[x,y],...], g?(lettergrootte), vet?, schuin?, tx?(tekst)}`.
Coördinaten in een vlak van 1000 breed; hoogte volgt de beeldverhouding.

**`info`** (tabblad Project): `klant, contact, telefoon, email,
soortKlant, straat, postcode, plaats, referentie, status, opnemer,
bereikbaar, notities, leverAdres('werkplaats'|'werk'), leverSoort
('spoed'|'zsm'|'week'|'datum'), leverDatum, leverWeek, leverWeekTekst,
leverInstructie`.

**Tabel `app_data`**, sleutel `glas_data`: de keuzelijsten. `cloud.js`
haalt die op en **overschrijft daarmee `DATA` uit index.html**. Wie een
keuzelijst wijzigt moet dus altijd allebei doen — anders wint de database
en lijkt de wijziging niet aan te komen.

**SQL-scripts** in `supabase/`, genummerd 01–09, op volgorde te draaien
bij een nieuw project. 05 is een correctie op 04; 09 vervangt alleen de
sleutel `glasbewerking`.

---

## 4. Beslissingen en waarom

Deze zijn duur betaald. Draai ze niet terug zonder reden.

**Eén lijst `rijen` voor alles.** Foto-ruiten en losse maten staan in
dezelfde lijst, onderscheiden door `fotoId`. Zo telt de bestellijst uit
één bron. Alternatief (aparte lijsten) is geprobeerd te vermijden juist
omdat optellen uit twee bronnen ooit misgaat.

**Coördinaten als verhouding, nooit als pixels.** Geldt voor bolletjes en
inkt. Daardoor kloppen ze op elk scherm, bij elk zoomniveau en in de pdf.

**Foto draaien = beeldpunten draaien**, niet het beeld kantelen. Bij
kantelen zou elk onderdeel dat met coördinaten rekent (aanwijzen,
slepen, tekenen, pdf) dat moeten meerekenen — vier plekken waarvan drie
op de grens met Safari zitten. De ongedraaide foto blijft in Storage
staan, anders wijst ongedaan maken naar een verwijderd bestand.

**Inkt als streken, niet als plaatje.** Scherp in de pdf, per streek
terug te nemen, klein genoeg om in de project-JSON mee te liften — en
dus ook offline, wat een rasterlaag in Storage niet zou zijn.

**Merkletters:** A–Z, daarna AA, AB (niet A1, B1). Een cijfer achter een
letter betekent altijd "ruit zoveel van kozijn zoveel". Bij import met
dubbele merken wordt automatisch genummerd (A1…A10); dat geldt ook voor
de knop "Automatisch hernoemen" bij een botsing. Merken zijn uniek per
project; dat wordt op vier momenten gecontroleerd.

**Speling/bijtelling per blok**, met terugval op de algemene waarde bij
de losse maten. Per rij kan het nog afwijken via de kolom Correctie.
Alles geldt *rondom*, dus 2× van breedte en hoogte.

**Ongedaan per tabel** werkt door in de momentopnames te zoeken naar de
laatste waarin díe tabel anders was, en alleen die regels terug te
zetten. `Cmd+Z` draait wel het hele project terug.

**Alles wat naar buiten gaat is een pdf die de app zelf maakt.** Nooit
de afdruk van de browser — die zet er een URL bij en dat is op iOS niet
te onderdrukken. `Cmd+P` is gekaapt.

**Afleveren, in deze volgorde:** map kiezen (desktop Chrome/Edge via
`showSaveFilePicker`/`showDirectoryPicker`) → deelvenster (aanraak­scherm)
→ gewone download. Het kiesvenster moet **direct na de klik** open,
vóór het rekenwerk; anders trekt de browser de toestemming in. De
bestandsnaam wordt daarom vooraf bepaald. Om dezelfde reden start de
export bij een onvolledige invoer vanuit de klik op "Toch exporteren" in
het meldingsvenster, niet vanuit een promise daarna.

**Geen tabblad Foto's meer**: samengevoegd met Invoer. Blokken zijn
inklapbaar.

**De leverpagina gaat altijd mee met de bestellijst.** Tot v63 werd hij
overgeslagen als er geen foto én geen instructie was, en dan ging er een
bestellijst de deur uit zonder afleveradres zonder dat iemand het merkte.
Wat ontbreekt staat nu op de pagina zelf. Een foto die er wél is maar niet
opgehaald kan worden krijgt een andere tekst dan een ontbrekende foto —
anders maakt iemand buiten een tweede foto terwijl die er al is.

**Niets kiezen bij de levering betekent "eerste levermogelijkheid"** en is
een geldige opdracht, geen ontbrekend gegeven. De controle vóór de export
klaagt alleen als je wél een datum of week aanklikt en het veld leeg laat.

**Figuurglas zit in de kolom Glasbewerking**, niet in een eigen kolom en
niet als apart glastype. De 42 waarden komen uit de showroom van Van
Noordenne, met de dikte in de naam. Oude waarden worden bij het laden
omgezet waar dat eenduidig is; de twijfelgevallen blijven staan en komen
onderaan het keuzevakje terug, zodat je ze ziet in plaats van dat de app
stilletjes iets anders bestelt.

**Catalogusfoto's staan lokaal in `catalogus/`**, niet op de server van de
leverancier. Zonder bereik moet het naslagwerk het ook doen, en hun URL's
veranderen. Ze worden opgehaald met `fotos-ophalen.sh`.

---

## 5. Valkuilen die al geld hebben gekost

Deze zijn allemaal echt voorgekomen. Controleer ze bij soortgelijk werk.

1. **Safari + `position: sticky` in een tabel werkt niet met
   `border-collapse: collapse`.** De tabel gebruikt daarom
   `border-collapse: separate` met randen per cel.
2. **iOS stuurt na loslaten alsnog een klik** naar wat eronder ligt. Na
   het aanraken van een bolletje geldt daarom 700 ms waarin een tik op de
   foto genegeerd wordt.
3. **`touch-action` alleen is niet genoeg**: een aanraking moet ook
   actief tegengehouden worden, anders maakt Safari er een schuifbeweging
   van. Alleen op de tekenlaag zelf, nooit op het schuifvenster eromheen.
4. **De Apple Pencil stuurt óók gewone aanraakberichten.** Naast
   `pointerType` wordt `touches[i].touchType === 'stylus'` gebruikt.
5. **`getCoalescedEvents()` kan een lege lijst teruggeven** — en een lege
   lijst is truthy. Zonder controle blijft een streek een stip.
6. **De echo van je eigen opslag** komt terug via de live verbinding als
   je alweer verder hebt getypt. Er wordt een lijst van de laatste acht
   eigen schrijfacties bijgehouden om die te herkennen.
7. **Bij terugkeer in het venster niet vergelijken zolang er eigen werk
   openstaat** — anders lijkt je eigen invoer een wijziging van een
   collega.
8. **Postgres bewaart JSON met een eigen sleutelvolgorde.** Vergelijken
   gebeurt via `normaliseer()` + `diepCanon()`.
9. **`fetch` in een service worker gaat door de browsercache.** GitHub
   Pages houdt bestanden 10 minuten vast; daarom `cache: 'no-cache'`.
10. **Supabase staat geen `delete from storage.objects` toe.** Bestanden
    gaan via de Storage-API weg, in de app.
11. **`let`-variabelen staan niet op `window`.** Controleer op de naam
    zelf, niet op `window.naam` — dat heeft twee keer een fout gegeven.
12. **Een verse rij is niet leeg**: `maatsoort`, `rooster`,
    `roedenverdeling` hebben standaardwaarden. Vergelijk met een nieuwe
    rij, niet met een lijstje velden.
13. **Waarschuwingsbalken hangen aan `renderTabel()`**, niet aan losse
    gebeurtenissen, anders blijven ze staan na het wisselen van project.
14. **Een keuzelijst wijzigen in index.html alleen is niet genoeg.**
    `cloud.js` haalt `DATA` uit `app_data` en die overschrijft de lijst in
    index.html. Zonder het bijbehorende SQL-script lijkt de wijziging niet
    aan te komen. `pasDataToe()` negeert daarom een glasbewerkingslijst
    zonder `Figuurglas — …` en zet een waarschuwing in de console.
15. **Een waarde die niet meer in de keuzelijst staat wordt door de
    browser niet getoond**: het vakje laat dan de eerste optie zien
    terwijl de rij iets anders bevat. `bewerkingOpties()` plakt de
    onbekende waarde onderaan de lijst zodat je ziet wat er echt staat.
16. **Een zip in de repo doet niets.** GitHub pakt hem niet uit; de app
    blijft de oude bestanden laden. Upload losse bestanden, of plak de
    inhoud in de webeditor van GitHub.
17. **Aan het versienummer in de app zie je niet welke `pdf.js` geladen
    is.** Daarom schrijft pdf.js `[pdf] v65` in de console. Dat scheelt
    zoeken als een update ergens blijft hangen — het heeft een keer een
    uur gekost om te ontdekken dat alleen index.html ververst was.
18. **jsPDF hangt zijn methodes aan `jsPDF.API`, niet aan het prototype.**
    Een patch op `jsPDF.prototype.save` in een test doet dus niets.

---

## 6. Werkwijze

- **Testen:** met jsdom in Node (`/home/claude/node_modules/jsdom`), met
  een nagebootste Supabase-client. Pdf's worden echt gegenereerd met
  jsPDF en teruggelezen met `pdfplumber`. Bouw testen per onderwerp en
  laat ze het resultaat printen in plaats van te beweren dat iets werkt.
  Er staan er vier klaar:
  `node test-index.js` (tabbladen, keuzelijst, rekenwerk, bestellijst),
  `node test-naslag.js` (catalogus, zoeken, in- en uitklappen),
  `node test-leverpagina.js` gevolgd door `python3 test-leverpagina.py`
  (maakt echte pdf's en leest ze terug).
- **Vertraging nabootsen:** geef de nep-database een vertraging van
  ~250 ms bij `update`. Zonder dat blijven fouten rond synchronisatie
  onzichtbaar (dat is één keer misgegaan).
- **Wat je niet kunt testen** — Safari-gedrag, aanraking, camera,
  deelvenster, netwerk naar PDOK — **zeg je erbij.** Jan test op Mac,
  iPad en iPhone en meldt precies wat hij ziet.
- **Controleer bekende Safari/Chrome-verschillen vóórdat je zegt dat
  iets werkt.** Dit is een uitdrukkelijke afspraak; het is drie keer
  misgegaan omdat de testomgeving Chrome-gedrag nabootst.
- **Opleveren:** alleen gewijzigde bestanden, plus altijd `index.html` en
  `sw.js` (versienummer). Vertel wat je hebt getest en wat niet. Jan heeft
  geen lokale kopie van de repo: hij werkt via de webinterface van GitHub,
  dus lever losse bestanden aan en geen patches.
- **Stijl van antwoorden:** Nederlands, zakelijk, geen opsommingen waar
  proza volstaat, geen loftuitingen. Fouten benoemen als fouten.

---

## 7. Openstaand / overwogen maar niet gebouwd

- **Offline-wachtrij voor foto's.** Foto's toevoegen vereist bereik; de
  wachtrij gebruikt localStorage en daar passen geen afbeeldingen in.
  Hiervoor is IndexedDB nodig. Dit is het grootste openstaande gat.
- **De skill `sponningmaten-bestellijst` loopt achter.** Die bouwt de
  Excel-dropdowns uit een oudere kopie (`Glas_Inmeten.html`) en kent de
  42 nieuwe glasbewerkingen niet.
- **De catalogusfoto's zijn van Van Noordenne en de repo is openbaar.**
  Intern gebruiken is iets anders dan opnieuw publiceren. Navragen, of de
  repo op privé zetten.
- **Versiegeschiedenis per project** (tabel + trigger met tijdslot van
  10 minuten, laatste 30 per project) en een **nachtelijke `pg_dump` naar
  de NAS/OneDrive**. Ontworpen, niet gebouwd. Op de gratis laag bestaat
  geen back-up die je zelf kunt terugzetten.
- **Mail vanuit de app.** Vier routes afgewogen; Microsoft 365 via Graph
  is de aanbevolen route, niets van gebouwd.
- **Meldingen (web push).** Kan op alle drie de apparaten; het EU-verbod
  dat je online leest is teruggedraaid. Aanbeveling: alleen doen voor
  herinneringen die aan een leverdatum hangen.
- **Exportscript naar OneDrive** (JSON + XLSX per project). Besproken,
  niet gebouwd.
- **Werkplaatsadres** staat hard in de code als "Werkplaats — Vissersdijk
  Beneden 44, Dordrecht", te overschrijven via `config.js`.

---

## 8. Hoe je hiermee begint

Dit document staat in de repository naast de code, en de app-bestanden
staan samen met dit document in een Claude Project. Elke nieuwe chat
binnen dat project heeft ze automatisch, zonder uploaden.

Twee dingen die een samenvatting niet kan en die je zelf moet doen:

**Werk aan de echte bestanden.** Een bestand van 190 kB met de hand
overtypen gaat een keer mis in een cijfer van de diktetabel, en dat merk
je pas bij de leverancier. Zit een bestand alleen in de projectkennis,
vraag het dan als bijlage op.

**Laat de code zichzelf uitleggen.** Dat gebeurt al: de commentaren in de
bestanden leggen niet uit *wat* er staat maar *waarom* — juist de
valkuilen uit hoofdstuk 5 staan op de plek waar ze toeslaan. Dat is
duurzamer dan een los document, want het veroudert niet apart. Werk dit
document bij in dezelfde oplevering als de wijziging.
