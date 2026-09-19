# Van v74 naar v78 in één keer

Je staat live op **v74**. Deze zip bevat alles wat sinds v74 veranderd is:
v75, v76, v77 en v78 bij elkaar. De losse zips van die versies heb je dan
niet meer nodig — deze is nieuwer.

## 1. Deze bestanden over de bestaande heen zetten

| bestand | waarom |
|---|---|
| `index.html` | vaste kop, tabelbreedte, tabnaam Project info, roedenlijsten, opmaak tekstvak en tekenbalk |
| `teken.js` | vormherkenning, tekstvak, schalen, lasso |
| `naslag.js` | Canalé mat blank, Duco-tabel met foto's en doorsnedes, roedenstelsels |
| `cloud.js` | "ingelogd als", en herkent een verouderde keuzelijst uit de database |
| `pdf.js` | tekstvakken op papier, versienummer |
| `sw.js` | roosterfoto's offline, versienummer |

Alle drie de versienummers staan op **v78** (`index.html`, `pdf.js`,
`sw.js`). Die moeten gelijk zijn, anders blijft de service worker de oude
versie serveren.

## 2. Eén SQL-script draaien

**`12_roeden_en_canale.sql`** — Supabase → SQL Editor → Run.

Dit is het enige nieuwe script sinds v74. Zonder dit duwt de database de
oude keuzelijsten er weer in: de opplakroeden staan terug en Canalé mat
blank ontbreekt. Het script is een `update` met vaste waarden, dus twee
keer draaien kan geen kwaad.

De scripts 01 t/m 11 horen bij eerdere versies en heb je al gedraaid.

## 3. Optioneel: de foto's ophalen

```
bash fotos-ophalen.sh              # de 62 glascatalogusfoto's
bash roosterfotos-ophalen.sh       # de 6 Duco-roosterfoto's
```

Niet verplicht. Zonder deze bestanden pakt de app de foto's rechtstreeks
bij de leverancier, en lukt dat ook niet, dan tekent hij zelf een
doorsnede van het roosterprofiel. Alleen offline mis je ze dan.

`catalogus-fotos.txt` en `roosterfotos.txt` zitten in de zip omdat de
scripts die lijsten nodig hebben.

## Wat NIET verandert

Deze bestanden zijn sinds v74 ongemoeid gebleven; laat je live-versie
staan:

`config.js` (je Supabase-sleutel — nooit overschrijven), `import.js`,
`bulk.js`, `project.js`, `blokbalk.js`, `fotos.js`, `kopie.js`,
`merken.js`, `undo.js`, `manifest.webmanifest`, de logo's en de icoontjes.

## Getest als geheel

Omdat je vier versies tegelijk overzet, heb ik niet alleen de losse
onderdelen getest maar ook de hele app in één keer: het nieuwe
`index.html` met álle twaalf scriptbestanden erbij, in Chromium, met een
nep-Supabase (je sleutel blijft buiten beeld en er ging niets het net op).

- geen enkele fout op de pagina;
- alle vijf de tabbladen tekenen: Invoer, Project info, Samenvatting,
  Bestellijst, Naslag;
- rekenwerk klopt: sponningmaat 1000 × 2000 bij 4 mm speling → 992 × 1992,
  24 mm dik, 20 kg/m²;
- de ⤓-knoppen van *doorvoeren* staan in negen kolomkoppen;
- de kolom Roedenbreedte toont per stelsel de juiste maten:

| keuze | wat de lijst toont |
|---|---|
| Kruisroeden in glas | 18, 26, 45 mm |
| Wienersprossen | 20, 24, 30 mm |
| geen roedenverdeling | alles |
| een oude opplakroede | alles, zodat de bestaande waarde zichtbaar blijft |

- de roostertabel toont acht regels met een afbeelding;
- de keuzelijst Glasbewerking heeft 43 opties.

Daarnaast de negen gewone testreeksen (index, naslag, cloud, teken,
vormen, kop, en drie pdf-reeksen die de echte pdf met pdfplumber
nalezen) — allemaal groen.

**Eén kanttekening bij die test:** de ongewijzigde bestanden heb ik uit
het project gehaald, niet van je live site. Als je daar ooit buiten onze
gesprekken om iets in hebt veranderd, is dat niet meegetest.
