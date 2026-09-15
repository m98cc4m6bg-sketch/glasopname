# v63 — figuurglascatalogus en tabblad Naslag

## Wat je moet doen, in deze volgorde

1. **`bash fotos-ophalen.sh`** in de hoofdmap van de repo. Maakt `catalogus/`
   met 61 jpg's van ongeveer 600 px breed.
2. **`09_glasbewerking.sql`** in Supabase → SQL Editor → Run. **Zonder dit
   blijft de app de oude keuzelijst tonen** — zie hieronder waarom.
3. De bestanden hieronder in de repo zetten en publiceren.

## Bestanden

| Bestand | Status |
|---|---|
| `index.html` | gewijzigd — negen plekken, v63 |
| `cloud.js` | gewijzigd — twee plekken |
| `sw.js` | gewijzigd — v63, `naslag.js` en de 61 foto's in de cache |
| `naslag.js` | nieuw — catalogus, keuzelijst, weergave Naslag |
| `09_glasbewerking.sql` | nieuw — keuzelijst in de database bijwerken |
| `catalogus-fotos.txt` | nieuw — bestandsnaam + bron-URL per foto |
| `fotos-ophalen.sh` | nieuw — haalt de foto's op en verkleint ze |
| `test-naslag.js`, `test-index.js` | nieuw — testen, `node test-index.js` |

## Waarom die SQL erbij moet

`cloud.js` haalt de keuzelijsten uit `app_data.glas_data` en die overschrijven
wat er in `index.html` staat (`pasDataToe`). De oude lijst van 21 waarden staat
daar nog, dus zonder dat script zou het hele figuurglas-assortiment onzichtbaar
blijven zodra de app online komt — hoe vaak je `index.html` ook ververst.

Voor het geval het script vergeten wordt, negeert `cloud.js` vanaf nu een lijst
uit de database waar geen enkele `Figuurglas — …` in voorkomt, en zet er een
waarschuwing bij in de console. Zodra de SQL gedraaid is, valt die uitzondering
vanzelf weg.

## Wijzigingen in index.html

1. Tabknop `Legenda` → `Naslag`, `toon('legenda')` → `toon('naslag')`
2. Print-opmaak: `#panel-legenda` → `#panel-naslag`
3. Het hele legendapaneel (50 regels) vervangen door een lege houder;
   `naslag.js` bouwt de inhoud op
4. `toon()` roept `renderNaslag()` aan
5. `DATA.glasbewerking`: 21 oude waarden eruit, 42 nieuwe erin
6. `APP_VERSIE` van v62 naar v63
7. `naslag.js` in de scriptvolgorde, na `merken.js`
8. `laadOpgeslagen()` zet oude waarden om
9. `rijHTML()` gebruikt `bewerkingOpties()`, zodat een waarde die niet meer in
   de lijst staat tóch in het vakje zichtbaar blijft — anders toont de browser
   de eerste optie terwijl de rij iets anders bevat, en bestel je iets anders
   dan er op je scherm staat

De rest van `DATA` is niet aangeraakt: nog steeds 8 sleutels en 828 regels in
de dikte-/gewichtlookup.

## Wijzigingen in cloud.js

- `zetStaat()` zet oude waarden om. Dit moest hier en niet alleen in
  `laadOpgeslagen()`, anders blijft elk project dat uit de cloud komt op de
  oude waarden staan.
- `pasDataToe()` negeert een verouderde keuzelijst uit de database (zie boven).

## Oude waarden uit de kolom Glasbewerking

Dertien worden automatisch omgezet, twee blijven zoals ze waren, zes zijn te
onzeker om aan te raken. Die zes blijven in de rij staan en komen onderaan het
keuzevakje terug, zodat je ze ziet in plaats van dat de app ze stil vervangt.

| Oude waarde | Wordt |
|---|---|
| Helder (standaard) | blijft |
| Overig (zie opmerking) | blijft |
| Mat / Satijn (gezuurd) | Gematteerd — Satijnglas |
| Figuurglas - Silvit (Boomschors) | Figuurglas — Silvit blank |
| Figuurglas - Master Carré | Figuurglas — Master carre |
| Figuurglas - Master Ligner | Figuurglas — Master ligne |
| Figuurglas - Master Point | Figuurglas — Master point |
| Figuurglas - Moiré | Figuurglas — Moire blank |
| Figuurglas - Ribbelglas | Figuurglas — Canale blank |
| Getint glas - Brons / Grijs / Groen / Blauw | Getint — Float brons / grijs / groen / dark blue |
| Spiegelglas | Spiegel — Verzilverd blank |
| Gekleurd glas (opgeven bij bestelling) | Overig (zie opmerking) |

Blijven staan, met een vraagteken:

- **Figuurglas - Kathedraal Blank** — er zijn er twee: Cathedraal klein Duits
  en Cathedraal groot gehamerd.
- **Figuurglas - Hammerglas** — kan Cathedraal groot gehamerd zijn of
  Byzanthijn (heet ook gehamerd fijn/grof).
- **Figuurglas - Delta (Ijsglas)** — twee soorten in één naam: Deltha blank en
  Ijsbloemglas zijn verschillende patronen.
- **Figuurglas - Satijn/Mistlite** — Mistlite staat niet in hun showroom.
- **Figuurglas HR++ isolatieglas** en **Mat HR++ isolatieglas** — hier staat
  geen soort in, alleen dat het isolatieglas is. Dat hoort in de kolom Opbouw.

**Ribbelglas → Canale blank** is een keuze van mij, geen zekerheid: ribbelglas
is een verzamelnaam en Canale (Flutes) is wat Van Noordenne eronder voert.

## Getest

`node test-index.js` — 26 controles op het echte index.html met jsdom:
tabblad hernoemd, 42 opties in DATA, lijst gelijk aan de catalogus, overige
DATA-sleutels intact, sponningmaat 1000×2000 bij 4 mm → 992×1992, dikte en
gewicht ongewijzigd, oude waarde blijft zichtbaar en geselecteerd, omzetting
bij het laden, bestellijst, catalogus, zoeken, versienummers.

`node test-naslag.js` — 35 controles op naslag.js los: catalogus, keuzelijst,
omzetting, weergave, in- en uitklappen, zoeken op synoniem, grote weergave.

Beide groen.

## Niet getest

- Safari en aanraakbediening. Het keuzevakje is een gewone `<select>` en de
  catalogus is een grid met `aspect-ratio`; allebei werken die in Safari 16+,
  maar ik heb het niet op een echt toestel gezien.
- Of alle 61 foto-URL's nog leven. Die komen uit hun pagina maar zijn niet
  opgehaald — dat blijkt bij het draaien van `fotos-ophalen.sh`.
- De SQL is niet tegen een database gedraaid, alleen opgebouwd. De
  controleregel onderaan hoort 42 te geven.
- `loading="lazy"` op de foto's: werkt in Safari 16+, niet in oudere versies.
  Daar laden ze gewoon meteen.

## Nog nalopen

- De skill `sponningmaten-bestellijst` bouwt de Excel-dropdowns uit een oudere
  kopie (`Glas_Inmeten.html`). Die lijst loopt nu achter en moet dezelfde 42
  waarden krijgen.
- De foto's zijn van Van Noordenne en de repo is openbaar. Intern gebruiken is
  iets anders dan ze opnieuw publiceren. Navragen, of de repo op privé zetten.
