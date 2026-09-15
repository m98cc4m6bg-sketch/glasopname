# v64 — leverpagina gaat altijd mee

Deze versie bevat ook alles uit v63 (figuurglascatalogus en tabblad Naslag);
v63 is nooit gepubliceerd, dus gebruik deze bundel en gooi de vorige weg.
Wat je moet doen staat in WIJZIGINGEN-v63.md — foto's ophalen, SQL draaien,
uploaden — met één verschil: het versienummer is nu v64.

## Wat er verandert

**De leverpagina komt er altijd in.** In `leverPagina()` stond:

```js
if (!foto && !instructie.trim()) return Promise.resolve();
```

Geen foto én geen instructie betekende: geen pagina, en dan ging er een
bestellijst naar de leverancier zonder afleveradres zonder dat iemand dat
merkte. Die regel is weg.

Wat ontbreekt staat nu op de pagina zelf:

- geen adres → "Werkadres — niet ingevuld" (dat stond er al)
- geen instructie → "Geen instructie voor de chauffeur ingevuld."
- geen foto → een omlijnd vak met "Geen foto van de leverlocatie toegevoegd."
- wél een foto maar niet ophaalbaar (zonder bereik) → "Er hoort een foto van
  de leverlocatie bij, maar die kon niet worden opgehaald." Dat onderscheid is
  bewust: anders gaat iemand buiten een tweede foto maken terwijl die er is.
- geen leverdatum → "Eerste levermogelijkheid" (stond er al)

**De waarschuwing vooraf is een venster geworden.** Het was een `confirm()`
met OK en Annuleren, waarbij "Annuleren" las als "niet exporteren" terwijl je
eigenlijk eerst wilt aanvullen. Nu drie knoppen:

| Knop | Wat het doet |
|---|---|
| Aanvullen | Sluit de melding, gaat naar tabblad Project en schuift naar het leverblok (of naar de projectgegevens als het adres ontbreekt) |
| Toch exporteren | Gaat gewoon door |
| Annuleren | Doet niets |

De export start binnen de klik op "Toch exporteren". Dat moet ook: het
opslagvenster van de browser mag alleen direct na een klik open. Liep dit via
een promise, dan viel de export terug op een gewone download.

**Waarop gecontroleerd wordt:** het werkadres (alleen bij levering op het
werk — bij de werkplaats staat het adres al vast), een foto van de
leverlocatie, een leverdatum of -week, en de instructie voor de chauffeur.
Alle vier zijn optioneel.

## Gewijzigde bestanden

| Bestand | Wat |
|---|---|
| `pdf.js` | leverpagina altijd, meldingsvenster, `startExport` opgesplitst in `exportVerder` |
| `index.html` | CSV-export gebruikt `exportMetControle`; v64 |
| `sw.js` | v64 |
| `test-leverpagina.js` + `test-leverpagina.py` | nieuw |

`window.exportControle` is vervangen door `window.exportMetControle(vervolg)`.
Alleen `index.html` gebruikte de oude naam.

## Getest

`node test-leverpagina.js` maakt drie echte pdf's met jsPDF; `python3
test-leverpagina.py` leest ze terug met pdfplumber. 26 controles:

- melding verschijnt met de vier ontbrekende punten en drie knoppen
- Aanvullen sluit en springt naar Project; Annuleren doet niets
- geen melding als alles is ingevuld
- niets ingevuld → tóch twee pagina's, met alle drie de meldingen erop en
  geen afbeelding
- alles ingevuld → adres, leverdatum, instructie en de foto staan erop, geen
  meldingen
- foto niet ophaalbaar → de juiste tekst, en níet "geen foto"
- de bestellijst zelf is ongemoeid; de figuurglasnaam met kastlijntje komt
  leesbaar uit de pdf (`Figuurglas — Crepi blank (4/6/8/10 mm)`)

`node test-index.js` (26) en `node test-naslag.js` (35) blijven groen.

Twee dingen die de test zelf aan het licht bracht en die ik moest omzeilen —
geen fouten in de app, wel goed om te weten voor een volgende keer: jsPDF hangt
zijn methodes aan `jsPDF.API` en niet aan het prototype, en `bezig()` schrijft
naar `#statusBar`, dus in een testpagina zonder dat element zie je geen
voortgang.

## Niet getest

- Safari en aanraakbediening. Het meldingsvenster gebruikt dezelfde
  `cloud-overlay`-opmaak als het inlog- en projectvenster, die daar al werkt.
  Wat ik niet kan nabootsen is het deelvenster op iPad: daar komt de export na
  een klik op "Toch exporteren" en dat hóórt te werken, maar of iOS die klik
  als geldige aanleiding ziet moet je op het toestel zien.
- `showSaveFilePicker` op desktop Chrome: bestaat niet in jsdom, dus de test
  liep via de gewone download.
- De pdf's in de test zijn gemaakt met jspdf-autotable 3.8.4 (gelijk aan wat
  de app van de CDN laadt) maar met jsPDF 4.2.1 uit npm, terwijl de app 2.5.2
  laadt. De tabelopmaak kan daardoor in de echte app iets anders uitvallen dan
  in de testbestanden. De leverpagina zelf gebruikt geen autotable en hangt
  alleen van `text`, `rect` en `addImage` af — die werken in beide versies
  hetzelfde.
