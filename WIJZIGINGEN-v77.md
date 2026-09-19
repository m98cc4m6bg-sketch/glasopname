# Glasopname v77 — kopbalk, tekstvak als in Notability, roosterafbeeldingen

## 1. De kopbalk sprong nog steeds te laag

Gevonden. Bovenin stond `padding-top: var(--ios-band)` op de vaste kop
zodra die ging kleven. Dat is een overblijfsel van de blurband van iOS 26:
die 46 px hoorde de wazige rand op te vangen, maar zodra de kop tegen de
bovenrand van het *venster* staat, ligt hij niet meer in die band. Het
resultaat was precies wat je zag: de balk kleeft, maar met 46 px leegte
erboven.

Die regel is weg. Kleven doet hij nu alleen nog met een schaduw eronder.

Getest in Chromium op iPhone-maat (402 px), gescrold en wel:

| | boven aan de pagina | gescrold |
|---|---|---|
| afstand tot de bovenrand | 104 px (gewoon in de pagina) | **0 px** |
| ruimte die de kop reserveert | — | **0 px** |

Ook met een blijven hangen `--bulkhoogte` van een eerdere selectie staat
hij op 0. Op een laptop verandert er niets.

## 2. Canalé mat blank — de foto

**Glasdiscount lukte niet.** Hun site geeft een 403 op elke pagina die ik
probeer te lezen, ook de figuurglas-overzichtspagina; dat is een blokkade
van hun kant en daar kom ik niet omheen. Ik kan de foto daar dus niet
vandaan halen.

Wat er nu staat is de foto van **JLM Glas**:

```
canale-mat-blank https://www.jlmglas.nl/images/product_new/canale-mat-blank.jpg
```

Die regel staat in `catalogus-fotos.txt` met uitleg erboven. Wil je toch
die van Glasdiscount: vervang de URL, of zet het bestand zelf neer als
`catalogus/canale-mat-blank.jpg`.

Let op: **de repo is openbaar**, dus een foto van een ander bedrijf staat
daarmee publiek op jouw github.io. Voor eigen gebruik zal niemand er wat
van zeggen, maar netter is het om de leverancier even te vragen of de
foto's zelf te maken.

## 3. Het tekstvak

Dit was de grootste verbouwing. Hoe het nu werkt:

**De tekst schaalt niet mee.** Een vak groter of kleiner maken verandert
alleen de grens waarbinnen de tekst valt; de letters blijven even groot.
Wil je grotere letters, dan gebruik je Klein/Normaal/Groot/Extra groot in
de balk — zoals je ook in Notability een apart tekstformaat kiest.

**Nieuwe tekst krijgt een vak op maat.** Tijdens het typen groeit het vak
met de zin mee, tot ± 780 eenheden breed; daarna breekt hij vanzelf af.

**Zodra je het vak zelf pakt, is het een harde grens.** Een vak van één
regel hoog en honderd tekens breed geeft één lange zin; een hoog en smal
vak zet diezelfde zin onder elkaar. Wat er in de hoogte niet meer bij
past, wordt niet getoond — en staat dan ook niet op papier.

Getoetst met echte pdf's, nagelezen met pdfplumber:

| vak | op het scherm | in de pdf |
|---|---|---|
| 900 × 70 | 1 regel | 1 regel, hele zin |
| 240 × 400 | 3 regels | 3 regels, hele zin |
| 240 × 62 | 1 van de 3 regels | "Kozijn 3", de rest weg |

**Wat je typt staat straks op dezelfde plek.** De basislijn van de eerste
regel wordt op het scherm en in de tekening nu op dezelfde manier
uitgerekend (halve regelsprong plus stokhoogte, `BASISLIJN` in
`teken.js`, en `pdf.js` gebruikt dezelfde waarde). Gemeten verschil na het
sluiten van het vak: **0,26 px**. Dat was 12 px.

**De knoppen dekken de tekst niet meer af.** ✥ (verplaatsen) en ✓ (klaar)
staan nu in een balkje bóven het vak, de maatgreep ⤡ schuin onder de
rechterhoek. Staat het vak tegen de bovenrand van de foto, dan klapt het
balkje vanzelf naar onderen. Op een iPhone waren die drie ronde knoppen
eerder groter dan het vak zelf.

**En een klein maar hinderlijk detail:** de stippelrand om het invoerveld
was een `border` en telde dus mee in de hoogte. Daardoor paste de laatste
regel er net niet in en ging het veld tijdens het typen schuiven. Het is
nu een `outline` — die neemt geen ruimte in.

Verder, in de geest van Notability: nog een keer tikken op een
geselecteerd tekstvak opent het meteen om te bewerken, Enter maakt een
nieuwe regel, en klaar ben je met ✓, met Escape, of door naast het vak te
tikken.

## 4. De roosterafbeeldingen

Die ontbraken omdat de map `roosters/` nog leeg is — het script is nog
niet gedraaid. De app haalt ze nu eerst rechtstreeks bij Duco op, en lukt
dát ook niet, dan tekent hij **zelf een doorsnede** van het profiel: waar
het glas zit, hoe hoog het profiel bouwt en waar de lucht langs gaat. Zes
tekeningen voor acht roosters, dezelfde verdeling als bij de foto's.

Zo is de tabel altijd compleet — ook zonder bereik, en ook als het script
nooit gedraaid wordt. De volgorde is dus:

1. `roosters/<naam>.jpg` — het bestand in de repo
2. de productfoto van Duco
3. de eigen doorsnedetekening

Wil je de echte foto's er toch in (scherper, en offline beschikbaar):

```
bash roosterfotos-ophalen.sh
```

## Testen

Alles groen:

| suite | wat |
|---|---|
| `test-index.js` | opmaak, DATA, versies + nieuw: tekstvak-opmaak en -opbouw lopen niet uit elkaar |
| `test-naslag.js` | catalogus, bewerkingen, roeden + nieuw: de drie stappen van de roosterafbeelding |
| `test-teken.js` | tekenen en tekstvak in Chromium + nieuw: basislijn, geen knop over de tekst, balkje klapt om |
| `test-vormen.js` | vormherkenning |
| `test-kop.js` | de vaste kop op telefoon en laptop |
| `test-cloud.js` | de guards op verouderde keuzelijsten |
| `test-tekstpdf.js` + `.py` | tekstvakken in een echte pdf, nagelezen met pdfplumber |
| `test-strijdig-pdf.js` + `.py` | de rode rijen en de voetnoot |
| `test-leverpagina.js` + `.py` | de bestellijst |

## Bijwerken

Alle bestanden uit de zip over de bestaande heen, de versie staat op
**v77** (`index.html`, `pdf.js`, `sw.js` — alle drie hetzelfde nummer,
anders blijft de service worker de oude versie serveren).

Er is **geen** SQL nodig deze keer; `12_roeden_en_canale.sql` van v76 is
de laatste.
